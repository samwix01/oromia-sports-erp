import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

/** Repo-root db/migrations, from both src/db (tests) and dist/db (runtime). */
export const MIGRATIONS_DIR =
  process.env.MIGRATIONS_DIR ?? resolve(fileURLToPath(new URL('.', import.meta.url)), '../../../../db/migrations');

/** Applies pending *.sql files in name order, each in its own transaction. Returns applied names. */
export async function migrate(databaseUrl: string, ssl = false, dir = MIGRATIONS_DIR): Promise<string[]> {
  const client = new pg.Client({ connectionString: databaseUrl, ssl: ssl ? { rejectUnauthorized: false } : undefined });
  await client.connect();
  const applied: string[] = [];
  try {
    await client.query('CREATE SCHEMA IF NOT EXISTS core');
    await client.query('CREATE TABLE IF NOT EXISTS core.migration (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    // Serialise concurrent deploys.
    await client.query('SELECT pg_advisory_lock(727001)');
    const done = new Set((await client.query<{ name: string }>('SELECT name FROM core.migration')).rows.map((r) => r.name));
    for (const name of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
      if (done.has(name)) continue;
      const sql = readFileSync(join(dir, name), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO core.migration(name) VALUES ($1)', [name]);
        await client.query('COMMIT');
        applied.push(name);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${name} failed: ${(err as Error).message}`);
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(727001)').catch(() => undefined);
    await client.end();
  }
  return applied;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  migrate(url, process.env.DATABASE_SSL === 'true')
    .then((names) => console.log(names.length ? `Applied: ${names.join(', ')}` : 'Database up to date'))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
