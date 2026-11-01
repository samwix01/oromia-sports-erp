import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, type OnModuleInit } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentActor, actorCan, type Actor } from '../../core/actor.js';
import { AuditService } from '../../core/audit.service.js';
import { badRequest, forbidden, notFound, parse } from '../../core/errors.js';
import { grants } from '../../core/permissions.js';
import { DbService } from '../../db/db.service.js';
import { WorkflowService } from '../workflow/public-api.js';
import { InstitutionsService } from './institutions.service.js';

const NewOrganisation = z.object({
  type: z.enum(['club', 'academy', 'school']),
  name: z.string().trim().min(2).max(200),
  shortName: z.string().trim().max(50).optional(),
  sportCode: z.string().min(2).max(40),
  territoryId: z.string().uuid().nullable().optional(),
  contacts: z.object({ phone: z.string().max(40).optional(), email: z.string().email().optional(), address: z.string().max(300).optional() }).default({}),
});
const ListQuery = z.object({ type: z.string().optional(), sport: z.string().optional(), q: z.string().max(100).optional(), status: z.string().optional() });

@ApiTags('organisations')
@Controller('organisations')
export class InstitutionsController implements OnModuleInit {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
    private readonly orgs: InstitutionsService,
    private readonly wf: WorkflowService,
  ) {}

  onModuleInit() {
    // Recognition is recorded from an authorised decision; the platform never grants it by itself.
    this.wf.register('org_recognition', {
      onApproved: async (tx, s, actor) => {
        await tx.query("UPDATE institutions.organisation SET recognition_status = 'recognised', updated_at = now(), updated_by = $2, version = version + 1 WHERE id = $1", [s.subject_id, actor.userId]);
        await this.audit.record(tx, { actorId: actor.userId, action: 'organisation.recognised', entityType: 'institutions.organisation', entityId: s.subject_id, data: { submissionId: s.id } });
      },
      onRejected: async (tx, s, actor) => {
        await tx.query("UPDATE institutions.organisation SET recognition_status = 'rejected', updated_at = now(), updated_by = $2, version = version + 1 WHERE id = $1", [s.subject_id, actor.userId]);
      },
      onResubmitted: async (tx, s, actor) => {
        const p = s.payload as { name?: string; shortName?: string; contacts?: unknown };
        await tx.query(
          'UPDATE institutions.organisation SET name = coalesce($2, name), short_name = coalesce($3, short_name), contacts = coalesce($4, contacts), updated_at = now(), updated_by = $5, version = version + 1 WHERE id = $1',
          [s.subject_id, p.name ?? null, p.shortName ?? null, p.contacts ? JSON.stringify(p.contacts) : null, actor.userId],
        );
      },
    });
  }

  @Get()
  list(@CurrentActor() actor: Actor, @Query() query: unknown) {
    if (!actor.assignments.some((a) => grants(a, 'institutions.read'))) throw forbidden();
    const q = parse(ListQuery, query);
    return this.orgs.list({ type: q.type, sportCode: q.sport, q: q.q, status: q.status });
  }

  @Get(':id')
  async get(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    if (!actor.assignments.some((a) => grants(a, 'institutions.read'))) throw forbidden();
    const org = await this.orgs.get(id);
    if (!org) throw notFound('organisation');
    const [children, submissions, members] = await Promise.all([
      this.db.query('SELECT id, type, name, recognition_status, sport_code FROM institutions.organisation WHERE parent_id = $1 ORDER BY name', [id]),
      this.db.query("SELECT id, definition_code, state, title, created_at FROM workflow.submission WHERE subject_id = $1 ORDER BY created_at DESC", [id]),
      // Counts only: personal records need people.read in this scope (rule 7).
      this.db.query<{ role_type: string; n: string }>("SELECT role_type, count(*) AS n FROM people.affiliation WHERE org_id = $1 AND status = 'active' GROUP BY role_type", [id]),
    ]);
    return { organisation: org, children: children.rows, submissions: submissions.rows, activeMembers: members.rows.map((m) => ({ roleType: m.role_type, count: Number(m.n) })) };
  }

  /** Registers an applying club/academy/school and opens its recognition workflow. */
  @Post()
  async create(@CurrentActor() actor: Actor, @Body() body: unknown) {
    const b = parse(NewOrganisation, body);
    const federation = await this.orgs.federationFor(b.sportCode);
    if (!federation) throw badRequest('no_federation_for_sport', b.sportCode);
    const fedChain = await this.orgs.chain(federation.id);
    if (!actorCan(actor, 'institutions.organisation.submit', { orgChain: fedChain, sportCode: b.sportCode })) throw forbidden();

    return this.db.tx(async (tx) => {
      const org = (
        await tx.query<{ id: string }>(
          `INSERT INTO institutions.organisation(type, name, short_name, parent_id, territory_id, sport_code, recognition_status, contacts, created_by, updated_by)
           VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8,$8) RETURNING id`,
          [b.type, b.name, b.shortName ?? null, federation.id, b.territoryId ?? null, b.sportCode, JSON.stringify(b.contacts), actor.userId],
        )
      ).rows[0]!;
      await this.audit.record(tx, { actorId: actor.userId, action: 'organisation.created', entityType: 'institutions.organisation', entityId: org.id, data: { name: b.name, type: b.type } });
      const s = await this.wf.create(tx, actor, {
        code: 'org_recognition',
        subjectId: org.id,
        title: b.name,
        orgId: org.id,
        sportCode: b.sportCode,
        territoryId: b.territoryId ?? null,
        payload: { ...b },
      });
      return { organisationId: org.id, submissionId: s.id };
    });
  }
}
