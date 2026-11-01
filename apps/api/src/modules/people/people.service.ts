import { Injectable } from '@nestjs/common';
import type pg from 'pg';
import { actorCan, type Actor } from '../../core/actor.js';
import { AuditService } from '../../core/audit.service.js';
import { badRequest, forbidden, notFound, pgErrorCode } from '../../core/errors.js';
import { scopesFor, type ScopeTarget } from '../../core/permissions.js';
import { DbService, type Queryable } from '../../db/db.service.js';
import { InstitutionsService } from '../institutions/public-api.js';
import { TerritoriesService } from '../territories/public-api.js';
import { WorkflowService } from '../workflow/public-api.js';
import { DUPLICATE_THRESHOLD, duplicateScore, maskDob, maskEmail, maskPhone } from './masking.js';

export interface RegisterInput {
  givenName: string;
  fatherName?: string;
  grandfatherName?: string;
  sex?: 'F' | 'M';
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  territoryId?: string | null;
  assisted: boolean;
  affiliation: { orgId: string; sportCode: string; roleType: 'athlete' | 'coach' | 'official' | 'staff'; startDate: string };
}

interface PersonRow {
  id: string;
  given_name: string;
  father_name: string | null;
  grandfather_name: string | null;
  full_name: string;
  sex: string | null;
  date_of_birth: string | null;
  phone: string | null;
  email: string | null;
  territory_id: string | null;
  identity_status: string;
  assisted_registration: boolean;
  merged_into_id: string | null;
  created_at: Date;
}

interface AffRow {
  id: string;
  org_id: string;
  org_name: string;
  sport_code: string;
  role_type: string;
  start_date: string;
  end_date: string | null;
  status: string;
}

@Injectable()
export class PeopleService {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
    private readonly orgs: InstitutionsService,
    private readonly territories: TerritoriesService,
    private readonly wf: WorkflowService,
  ) {}

  /** SQL fragment restricting people to those with an affiliation inside the actor's people.read scopes. */
  async visibilityFilter(actor: Actor, vals: unknown[], perm: 'people.read' | 'people.duplicate.decide' = 'people.read', alias = 'p'): Promise<string> {
    const scopes = scopesFor(actor.assignments, perm);
    if (!scopes.length) return 'false';
    const parts: string[] = [];
    for (const a of scopes) {
      const conds: string[] = [];
      if (a.orgId) {
        const desc = await this.db.query<{ id: string }>(
          `WITH RECURSIVE d AS (SELECT id FROM institutions.organisation WHERE id = $1
             UNION ALL SELECT o.id FROM institutions.organisation o JOIN d ON o.parent_id = d.id) SELECT id FROM d`,
          [a.orgId],
        );
        conds.push(`af.org_id = ANY($${vals.push(desc.rows.map((r) => r.id))}::uuid[])`);
      }
      if (a.sportCode) conds.push(`af.sport_code = $${vals.push(a.sportCode)}`);
      if (a.territoryId) {
        const desc = await this.db.query<{ id: string }>(
          `WITH RECURSIVE d AS (SELECT id FROM territories.territory WHERE id = $1
             UNION ALL SELECT t.id FROM territories.territory t JOIN d ON t.parent_id = d.id) SELECT id FROM d`,
          [a.territoryId],
        );
        conds.push(`${alias}.territory_id = ANY($${vals.push(desc.rows.map((r) => r.id))}::uuid[])`);
      }
      if (!conds.length) return 'true';
      parts.push(`(${conds.join(' AND ')})`);
    }
    return `EXISTS (SELECT 1 FROM people.affiliation af WHERE af.person_id = ${alias}.id AND af.status <> 'rejected' AND (${parts.join(' OR ')}))`;
  }

  private async targetsFor(personId: string, q: Queryable = this.db): Promise<ScopeTarget[]> {
    const p = await q.query<{ territory_id: string | null }>('SELECT territory_id FROM people.person WHERE id = $1', [personId]);
    const territoryChain = await this.territories.chain(p.rows[0]?.territory_id ?? null, q);
    const affs = await q.query<{ org_id: string; sport_code: string }>("SELECT org_id, sport_code FROM people.affiliation WHERE person_id = $1 AND status <> 'rejected'", [personId]);
    const out: ScopeTarget[] = [];
    for (const a of affs.rows) out.push({ orgChain: await this.orgs.chain(a.org_id, q), sportCode: a.sport_code, territoryChain });
    return out;
  }

  async canSee(actor: Actor, personId: string, perm: 'people.read' | 'people.read_sensitive' | 'people.duplicate.decide' = 'people.read') {
    const targets = await this.targetsFor(personId);
    return targets.some((t) => actorCan(actor, perm, t));
  }

  private present(p: PersonRow, sensitive: boolean) {
    return {
      id: p.id,
      givenName: p.given_name,
      fatherName: p.father_name,
      grandfatherName: p.grandfather_name,
      fullName: p.full_name,
      sex: p.sex,
      dateOfBirth: sensitive ? p.date_of_birth : null,
      birthYear: maskDob(p.date_of_birth),
      phone: sensitive ? p.phone : maskPhone(p.phone),
      email: sensitive ? p.email : maskEmail(p.email),
      territoryId: p.territory_id,
      identityStatus: p.identity_status,
      assistedRegistration: p.assisted_registration,
      mergedIntoId: p.merged_into_id,
      sensitiveVisible: sensitive,
    };
  }

  async list(actor: Actor, filter: { q?: string; sport?: string; orgId?: string }) {
    const vals: unknown[] = [];
    const where = [await this.visibilityFilter(actor, vals), 'p.merged_into_id IS NULL'];
    if (filter.q) where.push(`(p.full_name ILIKE $${vals.push(`%${filter.q}%`)} OR p.full_name % $${vals.push(filter.q)})`);
    if (filter.sport) where.push(`EXISTS (SELECT 1 FROM people.affiliation x WHERE x.person_id = p.id AND x.sport_code = $${vals.push(filter.sport)})`);
    if (filter.orgId) where.push(`EXISTS (SELECT 1 FROM people.affiliation x WHERE x.person_id = p.id AND x.org_id = $${vals.push(filter.orgId)})`);
    const r = await this.db.query<PersonRow & { roles: { sport: string; role: string; status: string; org: string }[] }>(
      `SELECT p.*, coalesce((SELECT json_agg(json_build_object('sport', a.sport_code, 'role', a.role_type, 'status', a.status, 'org', o.name) ORDER BY a.start_date DESC)
                FROM people.affiliation a JOIN institutions.organisation o ON o.id = a.org_id WHERE a.person_id = p.id), '[]') AS roles
       FROM people.person p WHERE ${where.join(' AND ')} ORDER BY p.full_name LIMIT 200`,
      vals,
    );
    return r.rows.map((row) => ({ ...this.present(row, false), roles: row.roles }));
  }

  async get360(actor: Actor, id: string) {
    const p = await this.db.one<PersonRow>('SELECT * FROM people.person WHERE id = $1', [id]);
    if (!p) throw notFound('person');
    if (!(await this.canSee(actor, id))) throw forbidden();
    const sensitive = await this.canSee(actor, id, 'people.read_sensitive');
    const [affs, dups, subs] = await Promise.all([
      this.db.query<AffRow>(
        `SELECT a.id, a.org_id, o.name AS org_name, a.sport_code, a.role_type, a.start_date::text, a.end_date::text, a.status
         FROM people.affiliation a JOIN institutions.organisation o ON o.id = a.org_id WHERE a.person_id = $1 ORDER BY a.start_date DESC`,
        [id],
      ),
      this.db.query("SELECT id, score, status FROM people.duplicate_candidate WHERE (person_a_id = $1 OR person_b_id = $1)", [id]),
      this.db.query('SELECT id, definition_code, state, created_at FROM workflow.submission WHERE subject_id = $1 ORDER BY created_at DESC', [id]),
    ]);
    if (sensitive) await this.db.tx((tx) => this.audit.record(tx, { actorId: actor.userId, action: 'people.read_sensitive', entityType: 'people.person', entityId: id }));
    return {
      person: this.present(p, sensitive),
      affiliations: affs.rows.map((a) => ({ id: a.id, orgId: a.org_id, orgName: a.org_name, sportCode: a.sport_code, roleType: a.role_type, startDate: a.start_date, endDate: a.end_date, status: a.status })),
      duplicates: dups.rows,
      submissions: subs.rows,
    };
  }

  async register(actor: Actor, b: RegisterInput) {
    const org = await this.orgs.get(b.affiliation.orgId);
    if (!org) throw notFound('organisation');
    if (org.recognition_status !== 'recognised') throw badRequest('organisation_not_recognised');
    const orgChain = await this.orgs.chain(org.id);
    if (!actorCan(actor, 'people.register', { orgChain, sportCode: b.affiliation.sportCode })) throw forbidden();
    // DECISION: discipline sections (multi-sport clubs) arrive in Release 2; until then one sport per organisation.
    if (org.sport_code && org.sport_code !== b.affiliation.sportCode) throw badRequest('sport_not_offered_by_organisation');

    return this.db.tx(async (tx) => {
      const person = (
        await tx.query<PersonRow>(
          `INSERT INTO people.person(given_name, father_name, grandfather_name, sex, date_of_birth, phone, email, territory_id, identity_status, assisted_registration, created_by, updated_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9,$10,$10) RETURNING *`,
          [b.givenName, b.fatherName ?? null, b.grandfatherName ?? null, b.sex ?? null, b.dateOfBirth ?? null, b.phone ?? null, b.email ?? null, b.territoryId ?? org.territory_id, b.assisted, actor.userId],
        )
      ).rows[0]!;
      const s = await this.wf.create(tx, actor, {
        code: 'person_registration',
        subjectId: person.id,
        title: person.full_name,
        orgId: org.id,
        sportCode: b.affiliation.sportCode,
        territoryId: person.territory_id,
        payload: { ...b },
      });
      await tx.query(
        `INSERT INTO people.affiliation(person_id, org_id, sport_code, role_type, start_date, status, source_submission_id, created_by, updated_by)
         VALUES ($1,$2,$3,$4,$5,'requested',$6,$7,$7)`,
        [person.id, org.id, b.affiliation.sportCode, b.affiliation.roleType, b.affiliation.startDate, s.id, actor.userId],
      );
      await this.audit.record(tx, { actorId: actor.userId, action: 'people.registered', entityType: 'people.person', entityId: person.id, data: { submissionId: s.id, assisted: b.assisted } });
      const duplicates = await this.flagDuplicates(tx, person);
      return { personId: person.id, submissionId: s.id, possibleDuplicates: duplicates };
    });
  }

  /** Rule 4: flags likely duplicates for a person to decide; never merges automatically. */
  async flagDuplicates(tx: pg.PoolClient, p: PersonRow): Promise<number> {
    const r = await tx.query<{ id: string; sim: number; date_of_birth: string | null; phone: string | null }>(
      `SELECT id, similarity(full_name, $2) AS sim, date_of_birth::text, phone FROM people.person
       WHERE id <> $1 AND merged_into_id IS NULL AND (full_name % $2 OR ($3::text IS NOT NULL AND phone = $3))`,
      [p.id, p.full_name, p.phone],
    );
    let n = 0;
    for (const c of r.rows) {
      const dobMatch = !p.date_of_birth || !c.date_of_birth ? 'unknown'
        : String(p.date_of_birth).slice(0, 10) === c.date_of_birth ? 'same'
        : Math.abs(new Date(String(p.date_of_birth)).getTime() - new Date(c.date_of_birth).getTime()) <= 366 * 86400_000 ? 'near' : 'different';
      const phoneMatch = !!p.phone && p.phone === c.phone;
      const score = duplicateScore({ nameSimilarity: Number(c.sim), dobMatch, phoneMatch });
      if (score < DUPLICATE_THRESHOLD && Number(c.sim) < 0.85) continue;
      const [a, b] = [p.id, c.id].sort();
      await tx.query(
        `INSERT INTO people.duplicate_candidate(person_a_id, person_b_id, score, signals) VALUES ($1,$2,$3,$4)
         ON CONFLICT (person_a_id, person_b_id) DO NOTHING`,
        [a, b, score, JSON.stringify({ nameSimilarity: Number(c.sim), dobMatch, phoneMatch })],
      );
      n++;
    }
    return n;
  }

  async listDuplicates(actor: Actor, status = 'open') {
    const vals: unknown[] = [status];
    const vis = await this.visibilityFilter(actor, vals, 'people.duplicate.decide', 'pa');
    const r = await this.db.query(
      `SELECT d.id, d.score, d.signals, d.status, d.reason, d.created_at,
              pa.id AS a_id, pa.full_name AS a_name, extract(year from pa.date_of_birth)::int AS a_birth_year, pa.identity_status AS a_status, pa.created_at AS a_created,
              pb.id AS b_id, pb.full_name AS b_name, extract(year from pb.date_of_birth)::int AS b_birth_year, pb.identity_status AS b_status, pb.created_at AS b_created
       FROM people.duplicate_candidate d
       JOIN people.person pa ON pa.id = d.person_a_id
       JOIN people.person pb ON pb.id = d.person_b_id
       WHERE d.status = $1 AND ${vis}
       ORDER BY d.score DESC, d.created_at`,
      vals,
    );
    return r.rows;
  }

  async decideDuplicate(actor: Actor, id: string, decision: 'same_person' | 'different_people' | 'held', reason: string) {
    return this.db.tx(async (tx) => {
      const d = (await tx.query<{ id: string; person_a_id: string; person_b_id: string; status: string }>('SELECT * FROM people.duplicate_candidate WHERE id = $1 FOR UPDATE', [id])).rows[0];
      if (!d) throw notFound('duplicate');
      if (d.status !== 'open' && d.status !== 'held') throw badRequest('already_decided');
      const allowed = (await this.canSee(actor, d.person_a_id, 'people.duplicate.decide')) || (await this.canSee(actor, d.person_b_id, 'people.duplicate.decide'));
      if (!allowed) throw forbidden();
      await tx.query('UPDATE people.duplicate_candidate SET status = $2, decided_by = $3, decided_at = now(), reason = $4 WHERE id = $1', [id, decision, actor.userId, reason]);
      if (decision === 'same_person') {
        // Keep the older record; mark the newer one as merged so its pending registration cannot be approved.
        const pair = await tx.query<{ id: string }>('SELECT id FROM people.person WHERE id = ANY($1::uuid[]) ORDER BY created_at, id', [[d.person_a_id, d.person_b_id]]);
        const [older, newer] = pair.rows.map((r) => r.id);
        await tx.query('UPDATE people.person SET merged_into_id = $2, updated_at = now(), updated_by = $3, version = version + 1 WHERE id = $1', [newer, older, actor.userId]);
      }
      await this.audit.record(tx, { actorId: actor.userId, action: `people.duplicate.${decision}`, entityType: 'people.duplicate_candidate', entityId: id, data: { reason } });
      return { ok: true };
    });
  }

  /** Workflow hooks for person_registration. */
  hooks() {
    return {
      approvalGuard: async (tx: pg.PoolClient, s: { subject_id: string }) => {
        const p = await tx.query<{ merged_into_id: string | null }>('SELECT merged_into_id FROM people.person WHERE id = $1', [s.subject_id]);
        if (p.rows[0]?.merged_into_id) return 'person_merged_reject_registration';
        const open = await tx.query("SELECT 1 FROM people.duplicate_candidate WHERE (person_a_id = $1 OR person_b_id = $1) AND status IN ('open','held')", [s.subject_id]);
        return open.rowCount ? 'duplicate_unresolved' : null;
      },
      onApproved: async (tx: pg.PoolClient, s: { id: string; subject_id: string }, actor: Actor) => {
        await tx.query("UPDATE people.person SET identity_status = 'verified', updated_at = now(), updated_by = $2, version = version + 1 WHERE id = $1", [s.subject_id, actor.userId]);
        try {
          await tx.query("UPDATE people.affiliation SET status = 'active', updated_at = now(), updated_by = $2, version = version + 1 WHERE source_submission_id = $1", [s.id, actor.userId]);
        } catch (err) {
          if (pgErrorCode(err) === 'affiliation_no_overlap') throw badRequest('affiliation_overlap', 'An active athlete affiliation in this sport already covers these dates.');
          throw err;
        }
        await this.audit.record(tx, { actorId: actor.userId, action: 'people.verified', entityType: 'people.person', entityId: s.subject_id, data: { submissionId: s.id } });
      },
      onRejected: async (tx: pg.PoolClient, s: { id: string }, actor: Actor) => {
        await tx.query("UPDATE people.affiliation SET status = 'rejected', updated_at = now(), updated_by = $2 WHERE source_submission_id = $1", [s.id, actor.userId]);
      },
      onResubmitted: async (tx: pg.PoolClient, s: { subject_id: string; payload: Record<string, unknown> }, actor: Actor) => {
        const p = s.payload as Partial<RegisterInput>;
        await tx.query(
          `UPDATE people.person SET given_name = coalesce($2, given_name), father_name = coalesce($3, father_name), grandfather_name = coalesce($4, grandfather_name),
             date_of_birth = coalesce($5, date_of_birth), phone = coalesce($6, phone), updated_at = now(), updated_by = $7, version = version + 1 WHERE id = $1`,
          [s.subject_id, p.givenName ?? null, p.fatherName ?? null, p.grandfatherName ?? null, p.dateOfBirth ?? null, p.phone ?? null, actor.userId],
        );
      },
    };
  }
}
