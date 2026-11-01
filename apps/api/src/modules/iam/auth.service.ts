import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config.js';
import type { Actor } from '../../core/actor.js';
import { AuditService } from '../../core/audit.service.js';
import { badRequest } from '../../core/errors.js';
import { hashPassword, passwordProblems, verifyPassword } from '../../core/password.js';
import { isRoleKey, type Assignment } from '../../core/permissions.js';
import { newTotpSecret, otpauthUrl, verifyTotp } from '../../core/totp.js';
import { DbService } from '../../db/db.service.js';

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;
export const SESSION_COOKIE = 'osh_session';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  password_hash: string;
  totp_secret: string | null;
  locale: 'om' | 'am' | 'en';
  status: string;
  failed_logins: number;
  locked_until: Date | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  /** Returns a raw session token (only its hash is stored). Generic errors avoid account enumeration. */
  async login(email: string, password: string, totpCode?: string): Promise<{ token: string; expiresAt: Date; mfaRequired?: boolean }> {
    const u = await this.db.one<UserRow>('SELECT * FROM iam.user_account WHERE lower(email) = lower($1)', [email]);
    const invalid = new UnauthorizedException({ error: 'invalid_credentials' });
    if (!u || u.status !== 'active') {
      await verifyPassword(password, 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'); // equalise timing
      throw invalid;
    }
    if (u.locked_until && u.locked_until > new Date()) throw new UnauthorizedException({ error: 'account_locked' });

    const ok = await verifyPassword(password, u.password_hash);
    if (!ok) {
      await this.db.tx(async (tx) => {
        const failed = u.failed_logins + 1;
        await tx.query(
          `UPDATE iam.user_account SET failed_logins = $2,
             locked_until = CASE WHEN $2 >= $3 THEN now() + make_interval(mins => $4) ELSE locked_until END
           WHERE id = $1`,
          [u.id, failed, MAX_FAILED, LOCK_MINUTES],
        );
        await this.audit.record(tx, { actorId: null, action: 'auth.login_failed', entityType: 'iam.user_account', entityId: u.id });
      });
      throw invalid;
    }
    if (u.totp_secret) {
      if (!totpCode) throw new UnauthorizedException({ error: 'totp_required' });
      if (!verifyTotp(u.totp_secret, totpCode)) throw new UnauthorizedException({ error: 'totp_invalid' });
    }

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.cfg.sessionTtlHours * 3600_000);
    await this.db.tx(async (tx) => {
      await tx.query('UPDATE iam.user_account SET failed_logins = 0, locked_until = NULL WHERE id = $1', [u.id]);
      await tx.query('INSERT INTO iam.session(token_hash, user_id, expires_at) VALUES ($1, $2, $3)', [sha256(token), u.id, expiresAt]);
      await this.audit.record(tx, { actorId: u.id, action: 'auth.login', entityType: 'iam.user_account', entityId: u.id });
    });
    return { token, expiresAt };
  }

  async logout(token: string): Promise<void> {
    await this.db.query('DELETE FROM iam.session WHERE token_hash = $1', [sha256(token)]);
  }

  /** Resolves a session token to an Actor with active role assignments, or null. */
  async resolve(token: string): Promise<Actor | null> {
    const s = await this.db.one<{ user_id: string }>(
      `UPDATE iam.session SET last_seen_at = now()
       WHERE token_hash = $1 AND expires_at > now() RETURNING user_id`,
      [sha256(token)],
    );
    if (!s) return null;
    return this.loadActor(s.user_id);
  }

  async loadActor(userId: string): Promise<Actor | null> {
    const u = await this.db.one<UserRow>("SELECT * FROM iam.user_account WHERE id = $1 AND status = 'active'", [userId]);
    if (!u) return null;
    const a = await this.db.query<{ id: string; role_key: string; org_id: string | null; sport_code: string | null; territory_id: string | null }>(
      `SELECT id, role_key, org_id, sport_code, territory_id FROM iam.role_assignment
       WHERE user_id = $1 AND valid_from <= current_date AND (valid_to IS NULL OR valid_to >= current_date)`,
      [userId],
    );
    const assignments: Assignment[] = a.rows
      .filter((r) => isRoleKey(r.role_key))
      .map((r) => ({ id: r.id, roleKey: r.role_key as Assignment['roleKey'], orgId: r.org_id, sportCode: r.sport_code, territoryId: r.territory_id }));
    return { userId: u.id, email: u.email, fullName: u.full_name, locale: u.locale, mfaEnabled: !!u.totp_secret, assignments };
  }

  async changePassword(actor: Actor, current: string, next: string): Promise<void> {
    const u = await this.db.one<UserRow>('SELECT * FROM iam.user_account WHERE id = $1', [actor.userId]);
    if (!u || !(await verifyPassword(current, u.password_hash))) throw badRequest('invalid_current_password');
    const problems = passwordProblems(next);
    if (problems.length) throw badRequest('weak_password', problems.join(','));
    const hash = await hashPassword(next);
    await this.db.tx(async (tx) => {
      await tx.query('UPDATE iam.user_account SET password_hash = $2, updated_at = now(), updated_by = $1, version = version + 1 WHERE id = $1', [actor.userId, hash]);
      await this.audit.record(tx, { actorId: actor.userId, action: 'auth.password_changed', entityType: 'iam.user_account', entityId: actor.userId });
    });
  }

  async startTotp(actor: Actor): Promise<{ secret: string; otpauthUrl: string }> {
    const secret = newTotpSecret();
    await this.db.query('UPDATE iam.user_account SET totp_pending_secret = $2 WHERE id = $1', [actor.userId, secret]);
    return { secret, otpauthUrl: otpauthUrl(secret, actor.email) };
  }

  async confirmTotp(actor: Actor, code: string): Promise<void> {
    const u = await this.db.one<{ totp_pending_secret: string | null }>('SELECT totp_pending_secret FROM iam.user_account WHERE id = $1', [actor.userId]);
    if (!u?.totp_pending_secret || !verifyTotp(u.totp_pending_secret, code)) throw badRequest('totp_invalid');
    await this.db.tx(async (tx) => {
      await tx.query('UPDATE iam.user_account SET totp_secret = totp_pending_secret, totp_pending_secret = NULL WHERE id = $1', [actor.userId]);
      await this.audit.record(tx, { actorId: actor.userId, action: 'auth.mfa_enabled', entityType: 'iam.user_account', entityId: actor.userId });
    });
  }
}
