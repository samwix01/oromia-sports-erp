import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import pg from 'pg';
import { APP_CONFIG, type AppConfig } from '../config.js';

// Return SQL DATE values as 'YYYY-MM-DD' strings, never JS Dates (avoids time-zone shifts).
pg.types.setTypeParser(1082, (v) => v);

export interface Queryable {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query<T extends pg.QueryResultRow = any>(text: string, values?: unknown[]): Promise<pg.QueryResult<T>>;
}

/** Thin wrapper over a pg Pool. SQL-first: every query is parameterised. */
@Injectable()
export class DbService implements OnModuleDestroy {
  readonly pool: pg.Pool;

  constructor(@Inject(APP_CONFIG) cfg: AppConfig) {
    this.pool = new pg.Pool({
      connectionString: cfg.databaseUrl,
      max: 10,
      ssl: cfg.databaseSsl ? { rejectUnauthorized: false } : undefined,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query<T extends pg.QueryResultRow = any>(text: string, values?: unknown[]): Promise<pg.QueryResult<T>> {
    return this.pool.query<T>(text, values);
  }

  async one<T extends pg.QueryResultRow>(text: string, values?: unknown[]): Promise<T | null> {
    const r = await this.pool.query<T>(text, values);
    return r.rows[0] ?? null;
  }

  /** Run fn in a transaction. Rolls back on any error. */
  async tx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const out = await fn(client);
      await client.query('COMMIT');
      return out;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
