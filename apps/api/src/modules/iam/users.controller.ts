import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentActor, actorCan, type Actor } from '../../core/actor.js';
import { AuditService } from '../../core/audit.service.js';
import { badRequest, forbidden, notFound, parse, pgErrorCode } from '../../core/errors.js';
import { hashPassword, passwordProblems } from '../../core/password.js';
import { ROLE_KEYS, canGrant, scopesFor, type RoleKey } from '../../core/permissions.js';
import { DbService } from '../../db/db.service.js';
import { InstitutionsService } from '../institutions/public-api.js';
import { TerritoriesService } from '../territories/public-api.js';

const AssignmentInput = z.object({
  roleKey: z.enum(ROLE_KEYS),
  orgId: z.string().uuid().nullable().default(null),
  sportCode: z.string().nullable().default(null),
  territoryId: z.string().uuid().nullable().default(null),
  validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
});
const NewUser = z.object({
  email: z.string().email().max(200),
  fullName: z.string().trim().min(2).max(200),
  temporaryPassword: z.string().min(1).max(200),
  locale: z.enum(['om', 'am', 'en']).default('om'),
  assignments: z.array(AssignmentInput).min(1).max(10),
});

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
    private readonly orgs: InstitutionsService,
    private readonly territories: TerritoriesService,
  ) {}

  private async assertCanGrant(actor: Actor, a: z.infer<typeof AssignmentInput>) {
    const target = { orgChain: await this.orgs.chain(a.orgId), sportCode: a.sportCode, territoryChain: await this.territories.chain(a.territoryId) };
    // Region-wide grants (no org) need a region-wide grantor; canGrant checks scope coverage.
    if (!canGrant(actor.assignments, a.roleKey as RoleKey, target)) throw forbidden('cannot_grant_role', a.roleKey);
  }

  @Get()
  async list(@CurrentActor() actor: Actor) {
    const scopes = scopesFor(actor.assignments, 'iam.user.read');
    if (!scopes.length) throw forbidden();
    const r = await this.db.query<{ id: string; email: string; full_name: string; status: string; locale: string; mfa: boolean; assignments: { id: string; roleKey: string; orgId: string | null; orgName: string | null; sportCode: string | null; territoryId: string | null; validTo: string | null }[] }>(
      `SELECT u.id, u.email, u.full_name, u.status, u.locale, (u.totp_secret IS NOT NULL) AS mfa,
              coalesce(json_agg(json_build_object('id', ra.id, 'roleKey', ra.role_key, 'orgId', ra.org_id, 'orgName', o.name, 'sportCode', ra.sport_code, 'territoryId', ra.territory_id, 'validTo', ra.valid_to))
                FILTER (WHERE ra.id IS NOT NULL), '[]') AS assignments
       FROM iam.user_account u
       LEFT JOIN iam.role_assignment ra ON ra.user_id = u.id
       LEFT JOIN institutions.organisation o ON o.id = ra.org_id
       GROUP BY u.id ORDER BY u.full_name`,
    );
    // Show users holding at least one assignment inside the actor's iam.user.read scope.
    const visible = [];
    for (const u of r.rows) {
      for (const a of u.assignments) {
        const t = { orgChain: await this.orgs.chain(a.orgId), sportCode: a.sportCode, territoryChain: await this.territories.chain(a.territoryId) };
        if (actorCan(actor, 'iam.user.read', t)) {
          visible.push({ id: u.id, email: u.email, fullName: u.full_name, status: u.status, locale: u.locale, mfaEnabled: u.mfa, assignments: u.assignments });
          break;
        }
      }
    }
    return visible;
  }

  @Post()
  async create(@CurrentActor() actor: Actor, @Body() body: unknown) {
    const b = parse(NewUser, body);
    for (const a of b.assignments) await this.assertCanGrant(actor, a);
    const problems = passwordProblems(b.temporaryPassword);
    if (problems.length) throw badRequest('weak_password', problems.join(','));
    const hash = await hashPassword(b.temporaryPassword);
    try {
      return await this.db.tx(async (tx) => {
        const u = (
          await tx.query<{ id: string }>(
            'INSERT INTO iam.user_account(email, full_name, password_hash, locale, created_by, updated_by) VALUES ($1,$2,$3,$4,$5,$5) RETURNING id',
            [b.email, b.fullName, hash, b.locale, actor.userId],
          )
        ).rows[0]!;
        for (const a of b.assignments) {
          await tx.query(
            'INSERT INTO iam.role_assignment(user_id, role_key, org_id, sport_code, territory_id, valid_to, granted_by) VALUES ($1,$2,$3,$4,$5,$6,$7)',
            [u.id, a.roleKey, a.orgId, a.sportCode, a.territoryId, a.validTo, actor.userId],
          );
        }
        await this.audit.record(tx, { actorId: actor.userId, action: 'iam.user.created', entityType: 'iam.user_account', entityId: u.id, data: { email: b.email, roles: b.assignments.map((a) => a.roleKey) } });
        return { id: u.id };
      });
    } catch (err) {
      if (pgErrorCode(err) === 'user_account_email_uq') throw badRequest('email_taken');
      throw err;
    }
  }

  @Post(':id/assignments')
  async addAssignment(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown) {
    const a = parse(AssignmentInput, body);
    await this.assertCanGrant(actor, a);
    return this.db.tx(async (tx) => {
      const u = await tx.query('SELECT 1 FROM iam.user_account WHERE id = $1', [id]);
      if (!u.rowCount) throw notFound('user');
      const r = await tx.query<{ id: string }>(
        'INSERT INTO iam.role_assignment(user_id, role_key, org_id, sport_code, territory_id, valid_to, granted_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
        [id, a.roleKey, a.orgId, a.sportCode, a.territoryId, a.validTo, actor.userId],
      );
      await this.audit.record(tx, { actorId: actor.userId, action: 'iam.assignment.granted', entityType: 'iam.user_account', entityId: id, data: { ...a } });
      return { id: r.rows[0]!.id };
    });
  }

  @Delete('assignments/:assignmentId')
  @HttpCode(200)
  async revoke(@CurrentActor() actor: Actor, @Param('assignmentId', ParseUUIDPipe) assignmentId: string) {
    return this.db.tx(async (tx) => {
      const a = (await tx.query<{ user_id: string; role_key: string; org_id: string | null; sport_code: string | null; territory_id: string | null }>('SELECT * FROM iam.role_assignment WHERE id = $1', [assignmentId])).rows[0];
      if (!a) throw notFound('assignment');
      if (a.user_id === actor.userId) throw forbidden('cannot_revoke_own_assignment');
      await this.assertCanGrant(actor, { roleKey: a.role_key as RoleKey, orgId: a.org_id, sportCode: a.sport_code, territoryId: a.territory_id, validTo: null });
      await tx.query('UPDATE iam.role_assignment SET valid_to = current_date - 1 WHERE id = $1', [assignmentId]);
      await this.audit.record(tx, { actorId: actor.userId, action: 'iam.assignment.revoked', entityType: 'iam.user_account', entityId: a.user_id, data: { assignmentId, roleKey: a.role_key } });
      return { ok: true };
    });
  }
}
