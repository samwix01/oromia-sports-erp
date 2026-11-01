import { Injectable } from '@nestjs/common';
import type { Queryable } from '../../db/db.service.js';
import { DbService } from '../../db/db.service.js';

export interface TerritoryRow {
  id: string;
  code: string;
  name_i18n: Record<string, string>;
  level: string;
  parent_id: string | null;
}

@Injectable()
export class TerritoriesService {
  constructor(private readonly db: DbService) {}

  list(): Promise<TerritoryRow[]> {
    return this.db.query<TerritoryRow>('SELECT id, code, name_i18n, level, parent_id FROM territories.territory ORDER BY code').then((r) => r.rows);
  }

  /** The territory and all its ancestors (for scope checks). */
  async chain(id: string | null, q: Queryable = this.db): Promise<string[]> {
    if (!id) return [];
    const r = await q.query<{ id: string }>(
      `WITH RECURSIVE up AS (
         SELECT id, parent_id FROM territories.territory WHERE id = $1
         UNION ALL SELECT t.id, t.parent_id FROM territories.territory t JOIN up ON t.id = up.parent_id)
       SELECT id FROM up`,
      [id],
    );
    return r.rows.map((x) => x.id);
  }
}
