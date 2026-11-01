import { Injectable } from '@nestjs/common';
import { DbService, type Queryable } from '../../db/db.service.js';

export interface OrganisationRow {
  id: string;
  type: string;
  name: string;
  short_name: string | null;
  parent_id: string | null;
  territory_id: string | null;
  sport_code: string | null;
  recognition_status: string;
  contacts: Record<string, unknown>;
  created_at: Date;
}

/** Organisation directory and hierarchy. No workflow dependency (used by the workflow engine). */
@Injectable()
export class InstitutionsService {
  constructor(private readonly db: DbService) {}

  /** The organisation and all its ancestors (club → federation → bureau). */
  async chain(id: string | null, q: Queryable = this.db): Promise<string[]> {
    if (!id) return [];
    const r = await q.query<{ id: string }>(
      `WITH RECURSIVE up AS (
         SELECT id, parent_id FROM institutions.organisation WHERE id = $1
         UNION ALL SELECT o.id, o.parent_id FROM institutions.organisation o JOIN up ON o.id = up.parent_id)
       SELECT id FROM up`,
      [id],
    );
    return r.rows.map((x) => x.id);
  }

  async get(id: string, q: Queryable = this.db): Promise<OrganisationRow | null> {
    const r = await q.query<OrganisationRow>('SELECT * FROM institutions.organisation WHERE id = $1', [id]);
    return r.rows[0] ?? null;
  }

  async federationFor(sportCode: string, q: Queryable = this.db): Promise<OrganisationRow | null> {
    const r = await q.query<OrganisationRow>("SELECT * FROM institutions.organisation WHERE type = 'federation' AND sport_code = $1 ORDER BY created_at LIMIT 1", [sportCode]);
    return r.rows[0] ?? null;
  }

  async list(filter: { type?: string; sportCode?: string; q?: string; status?: string }) {
    const where: string[] = [];
    const vals: unknown[] = [];
    if (filter.type) where.push(`o.type = $${vals.push(filter.type)}`);
    if (filter.sportCode) where.push(`o.sport_code = $${vals.push(filter.sportCode)}`);
    if (filter.status) where.push(`o.recognition_status = $${vals.push(filter.status)}`);
    if (filter.q) where.push(`o.name ILIKE $${vals.push(`%${filter.q}%`)}`);
    const r = await this.db.query<OrganisationRow & { parent_name: string | null; territory_name: Record<string, string> | null }>(
      `SELECT o.*, p.name AS parent_name, t.name_i18n AS territory_name
       FROM institutions.organisation o
       LEFT JOIN institutions.organisation p ON p.id = o.parent_id
       LEFT JOIN territories.territory t ON t.id = o.territory_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY o.type, o.name LIMIT 500`,
      vals,
    );
    return r.rows;
  }
}
