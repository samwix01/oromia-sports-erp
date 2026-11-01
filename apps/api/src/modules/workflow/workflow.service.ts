import { Injectable } from '@nestjs/common';
import type pg from 'pg';
import { actorCan, type Actor } from '../../core/actor.js';
import { AuditService } from '../../core/audit.service.js';
import { badRequest, forbidden, notFound } from '../../core/errors.js';
import { DbService, type Queryable } from '../../db/db.service.js';
import { InstitutionsService } from '../institutions/public-api.js';
import { TerritoriesService } from '../territories/public-api.js';
import { REASON_REQUIRED, WORKFLOWS, type WorkflowAction, type WorkflowDef } from './definitions.js';

export interface SubmissionRow {
  id: string;
  definition_code: string;
  subject_type: string;
  subject_id: string;
  title: string;
  org_id: string | null;
  sport_code: string | null;
  territory_id: string | null;
  state: 'submitted' | 'in_review' | 'returned' | 'approved' | 'rejected' | 'withdrawn';
  current_step: string | null;
  payload: Record<string, unknown>;
  version_seq: number;
  submitted_by: string;
  created_at: Date;
  updated_at: Date;
}

/** Called inside the action's transaction. Owning modules register these at start-up. */
export type Effect = (tx: pg.PoolClient, s: SubmissionRow, actor: Actor) => Promise<void>;
export type Guard = (tx: pg.PoolClient, s: SubmissionRow) => Promise<string | null>;

interface Hooks {
  onApproved?: Effect;
  onRejected?: Effect;
  onReturned?: Effect;
  onResubmitted?: Effect;
  /** Returns an error code that blocks approval (e.g. unresolved duplicate). */
  approvalGuard?: Guard;
}

@Injectable()
export class WorkflowService {
  private readonly hooks = new Map<string, Hooks>();

  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
    private readonly institutions: InstitutionsService,
    private readonly territories: TerritoriesService,
  ) {}

  register(code: string, hooks: Hooks) {
    this.hooks.set(code, { ...this.hooks.get(code), ...hooks });
  }

  def(code: string): WorkflowDef {
    const d = WORKFLOWS[code];
    if (!d) throw badRequest('unknown_workflow', code);
    return d;
  }

  async scopeOf(s: Pick<SubmissionRow, 'org_id' | 'sport_code' | 'territory_id'>, q: Queryable = this.db) {
    return {
      orgChain: await this.institutions.chain(s.org_id, q),
      sportCode: s.sport_code,
      territoryChain: await this.territories.chain(s.territory_id, q),
    };
  }

  /** Creates a submission in the caller's transaction. Caller has already checked submit permission. */
  async create(
    tx: pg.PoolClient,
    actor: Actor,
    input: { code: string; subjectId: string; title: string; orgId: string | null; sportCode: string | null; territoryId: string | null; payload: Record<string, unknown> },
  ): Promise<SubmissionRow> {
    const d = this.def(input.code);
    const r = await tx.query<SubmissionRow>(
      `INSERT INTO workflow.submission(definition_code, subject_type, subject_id, title, org_id, sport_code, territory_id, state, current_step, payload, submitted_by, due_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'submitted',$8,$9,$10, now() + interval '7 days') RETURNING *`,
      [d.code, d.subjectType, input.subjectId, input.title, input.orgId, input.sportCode, input.territoryId, d.steps[0]!.key, JSON.stringify(input.payload), actor.userId],
    );
    const s = r.rows[0]!;
    await tx.query('INSERT INTO workflow.submission_version(submission_id, seq, payload, created_by) VALUES ($1, 1, $2, $3)', [s.id, JSON.stringify(input.payload), actor.userId]);
    await tx.query(
      'INSERT INTO workflow.step_log(submission_id, step, action, actor_id, actor_roles) VALUES ($1, $2, $3, $4, $5)',
      [s.id, d.steps[0]!.key, 'submit', actor.userId, actor.assignments.map((a) => a.roleKey)],
    );
    await this.audit.record(tx, { actorId: actor.userId, action: 'workflow.submit', entityType: 'workflow.submission', entityId: s.id, data: { code: d.code, subjectId: input.subjectId } });
    return s;
  }

  async get(id: string, q: Queryable = this.db): Promise<SubmissionRow> {
    const r = await q.query<SubmissionRow>('SELECT * FROM workflow.submission WHERE id = $1', [id]);
    if (!r.rows[0]) throw notFound('submission');
    return r.rows[0];
  }

  /** Can this actor act on the current step? Enforces scope and maker ≠ checker (rule 7). */
  async canAct(actor: Actor, s: SubmissionRow, q: Queryable = this.db): Promise<boolean> {
    if (!['submitted', 'in_review'].includes(s.state) || !s.current_step) return false;
    if (s.submitted_by === actor.userId) return false;
    const step = this.def(s.definition_code).steps.find((x) => x.key === s.current_step);
    if (!step) return false;
    const acted = await q.query(
      `SELECT 1 FROM workflow.step_log WHERE submission_id = $1 AND actor_id = $2 AND action = 'approve'
         AND at > (SELECT max(at) FROM workflow.step_log WHERE submission_id = $1 AND action IN ('submit','resubmit'))`,
      [s.id, actor.userId],
    );
    if (acted.rowCount) return false;
    return actorCan(actor, step.permission, await this.scopeOf(s, q));
  }

  async act(actor: Actor, id: string, action: WorkflowAction, reason?: string, payload?: Record<string, unknown>): Promise<SubmissionRow> {
    if (REASON_REQUIRED.includes(action) && !reason?.trim()) throw badRequest('reason_required');
    return this.db.tx(async (tx) => {
      const s = (await tx.query<SubmissionRow>('SELECT * FROM workflow.submission WHERE id = $1 FOR UPDATE', [id])).rows[0];
      if (!s) throw notFound('submission');
      const d = this.def(s.definition_code);
      const hooks = this.hooks.get(d.code) ?? {};
      let next: SubmissionRow;

      if (action === 'withdraw' || action === 'resubmit') {
        if (s.submitted_by !== actor.userId) throw forbidden('only_submitter');
        if (action === 'withdraw') {
          if (!['submitted', 'in_review', 'returned'].includes(s.state)) throw badRequest('invalid_state');
          next = await this.update(tx, s, { state: 'withdrawn', current_step: null });
        } else {
          if (s.state !== 'returned') throw badRequest('invalid_state');
          const merged = { ...s.payload, ...(payload ?? {}) };
          next = await this.update(tx, s, { state: 'submitted', current_step: d.steps[0]!.key, payload: merged, version_seq: s.version_seq + 1 });
          await tx.query('INSERT INTO workflow.submission_version(submission_id, seq, payload, created_by) VALUES ($1,$2,$3,$4)', [s.id, next.version_seq, JSON.stringify(merged), actor.userId]);
          await hooks.onResubmitted?.(tx, next, actor);
        }
      } else {
        if (!(await this.canAct(actor, s, tx))) throw forbidden('cannot_act_on_step');
        const idx = d.steps.findIndex((x) => x.key === s.current_step);
        if (action === 'approve') {
          const blocked = await hooks.approvalGuard?.(tx, s);
          if (blocked) throw badRequest(blocked);
          const following = d.steps[idx + 1];
          next = following
            ? await this.update(tx, s, { state: 'in_review', current_step: following.key })
            : await this.update(tx, s, { state: 'approved', current_step: null });
          if (!following) await hooks.onApproved?.(tx, next, actor);
        } else if (action === 'return') {
          next = await this.update(tx, s, { state: 'returned', current_step: null });
          await hooks.onReturned?.(tx, next, actor);
        } else {
          next = await this.update(tx, s, { state: 'rejected', current_step: null });
          await hooks.onRejected?.(tx, next, actor);
        }
      }

      await tx.query(
        'INSERT INTO workflow.step_log(submission_id, step, action, actor_id, actor_roles, reason) VALUES ($1,$2,$3,$4,$5,$6)',
        [s.id, s.current_step ?? next.current_step ?? '-', action, actor.userId, actor.assignments.map((a) => a.roleKey), reason?.trim() || null],
      );
      await this.audit.record(tx, { actorId: actor.userId, action: `workflow.${action}`, entityType: 'workflow.submission', entityId: s.id, data: { from: s.state, to: next.state, reason: reason?.trim() } });
      return next;
    });
  }

  private async update(tx: pg.PoolClient, s: SubmissionRow, patch: Partial<SubmissionRow>): Promise<SubmissionRow> {
    const n = { ...s, ...patch };
    const r = await tx.query<SubmissionRow>(
      `UPDATE workflow.submission SET state = $2, current_step = $3, payload = $4, version_seq = $5, updated_at = now() WHERE id = $1 RETURNING *`,
      [s.id, n.state, n.current_step, JSON.stringify(n.payload), n.version_seq],
    );
    return r.rows[0]!;
  }

  /** Open submissions this actor can act on, plus their own submissions. */
  async inbox(actor: Actor) {
    const open = await this.db.query<SubmissionRow>(
      "SELECT * FROM workflow.submission WHERE state IN ('submitted','in_review') ORDER BY created_at",
    );
    const toAct: SubmissionRow[] = [];
    for (const s of open.rows) if (await this.canAct(actor, s)) toAct.push(s);
    const mine = await this.db.query<SubmissionRow>('SELECT * FROM workflow.submission WHERE submitted_by = $1 ORDER BY updated_at DESC LIMIT 100', [actor.userId]);
    return { toAct, mine: mine.rows };
  }

  async history(id: string) {
    const [log, versions] = await Promise.all([
      this.db.query(
        `SELECT l.step, l.action, l.reason, l.at, l.actor_roles, l.actor_id, u.full_name AS actor_name
         FROM workflow.step_log l LEFT JOIN iam.user_account u ON u.id = l.actor_id WHERE submission_id = $1 ORDER BY l.id`,
        [id],
      ),
      this.db.query('SELECT seq, payload, created_at FROM workflow.submission_version WHERE submission_id = $1 ORDER BY seq', [id]),
    ]);
    return { log: log.rows, versions: versions.rows };
  }
}
