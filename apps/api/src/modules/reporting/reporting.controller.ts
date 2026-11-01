import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentActor, type Actor } from '../../core/actor.js';
import { forbidden } from '../../core/errors.js';
import { grants } from '../../core/permissions.js';
import { DbService } from '../../db/db.service.js';

/**
 * Command-centre indicators from live data (rule 5): every value carries definition key, numerator,
 * denominator (or null when not agreed), source module and as-of time. Modules not yet in use
 * return status 'not_collected' — shown as "no report received", never as zero.
 * Aggregates only; no personal records (rule 7). Small cells are not suppressed yet because only
 * totals by sport are shown. DECISION: OD-04 — add suppression with territory breakdowns.
 */
@ApiTags('reporting')
@Controller('reports')
export class ReportingController {
  constructor(private readonly db: DbService) {}

  @Get('command-centre')
  async commandCentre(@CurrentActor() actor: Actor) {
    if (!actor.assignments.some((a) => grants(a, 'reporting.read'))) throw forbidden();
    const asOf = new Date().toISOString();
    const [fed, clubs, people, subs, dups, bySport] = await Promise.all([
      this.db.one<{ total: string; recognised: string }>("SELECT count(*) AS total, count(*) FILTER (WHERE recognition_status = 'recognised') AS recognised FROM institutions.organisation WHERE type = 'federation'"),
      this.db.one<{ recognised: string; pending: string }>("SELECT count(*) FILTER (WHERE recognition_status = 'recognised') AS recognised, count(*) FILTER (WHERE recognition_status = 'pending') AS pending FROM institutions.organisation WHERE type IN ('club','academy','school')"),
      this.db.one<{ n: string }>("SELECT count(DISTINCT person_id) AS n FROM people.affiliation WHERE status = 'active'"),
      this.db.one<{ open: string; overdue: string }>("SELECT count(*) FILTER (WHERE state IN ('submitted','in_review')) AS open, count(*) FILTER (WHERE state IN ('submitted','in_review') AND due_at < now()) AS overdue FROM workflow.submission"),
      this.db.one<{ n: string }>("SELECT count(*) AS n FROM people.duplicate_candidate WHERE status IN ('open','held')"),
      this.db.query<{ sport_code: string; clubs: string; athletes: string; coaches: string; officials: string }>(
        `SELECT s.code AS sport_code,
           (SELECT count(*) FROM institutions.organisation o WHERE o.sport_code = s.code AND o.type IN ('club','academy','school') AND o.recognition_status = 'recognised') AS clubs,
           (SELECT count(DISTINCT person_id) FROM people.affiliation a WHERE a.sport_code = s.code AND a.status = 'active' AND a.role_type = 'athlete') AS athletes,
           (SELECT count(DISTINCT person_id) FROM people.affiliation a WHERE a.sport_code = s.code AND a.status = 'active' AND a.role_type = 'coach') AS coaches,
           (SELECT count(DISTINCT person_id) FROM people.affiliation a WHERE a.sport_code = s.code AND a.status = 'active' AND a.role_type = 'official') AS officials
         FROM ref.sport s WHERE s.status = 'active' ORDER BY s.code`,
      ),
    ]);
    const n = (v: string | undefined) => Number(v ?? 0);
    return {
      asOf,
      indicators: [
        { key: 'federations_recognised', status: 'ok', value: n(fed?.recognised), denominator: n(fed?.total), source: 'institutions', verification: 'verified' },
        { key: 'clubs_recognised', status: 'ok', value: n(clubs?.recognised), denominator: null, pending: n(clubs?.pending), source: 'institutions', verification: 'verified' },
        { key: 'unique_participants', status: 'ok', value: n(people?.n), denominator: null, source: 'people', verification: 'verified' },
        { key: 'open_approvals', status: 'ok', value: n(subs?.open), overdue: n(subs?.overdue), denominator: null, source: 'workflow', verification: 'verified' },
        { key: 'duplicates_open', status: 'ok', value: n(dups?.n), denominator: null, source: 'people', verification: 'verified' },
        { key: 'competitions_validated', status: 'not_collected', value: null, denominator: null, source: 'competitions', verification: 'unverified' },
        { key: 'facilities_verified_use', status: 'not_collected', value: null, denominator: null, source: 'facilities', verification: 'unverified' },
      ],
      bySport: bySport.rows.map((r) => ({ sport: r.sport_code, clubs: n(r.clubs), athletes: n(r.athletes), coaches: n(r.coaches), officials: n(r.officials) })),
    };
  }
}
