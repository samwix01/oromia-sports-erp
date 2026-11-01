/**
 * Loads FICTIONAL demo data (CLAUDE.md rule 10). Idempotent: fixed IDs + ON CONFLICT DO NOTHING.
 * Users are created only when SEED_PASSWORD is set; every demo user gets that password.
 * Nothing here describes real clubs, people or statistics.
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { AuditService } from '../core/audit.service.js';
import { hashPassword } from '../core/password.js';

const id = (n: number) => `0a000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;

export const SEED = {
  territories: {
    region: id(0x100),
    zoneA: id(0x101),
    zoneB: id(0x102),
  },
  orgs: {
    bureau: id(0x200),
    fedFootball: id(0x201),
    fedAthletics: id(0x202),
    fedVolleyball: id(0x203),
    fedCycling: id(0x204),
    clubA: id(0x210),
    clubE: id(0x211),
    clubB: id(0x212),
    clubV: id(0x213),
    teamC: id(0x214),
  },
};

export const DEMO_USERS = [
  { key: 'admin', email: 'admin@demo.osh.test', name: 'Demo Platform Admin', role: 'platform.admin', org: null, sport: null, territory: null },
  { key: 'executive', email: 'executive@demo.osh.test', name: 'Demo Bureau Executive', role: 'bureau.executive', org: SEED.orgs.bureau, sport: null, territory: null },
  { key: 'reviewer', email: 'reviewer@demo.osh.test', name: 'Demo Bureau Reviewer', role: 'bureau.reviewer', org: SEED.orgs.bureau, sport: null, territory: null },
  { key: 'fbSecretariat', email: 'football.secretariat@demo.osh.test', name: 'Demo Football Secretariat', role: 'fed.secretariat', org: SEED.orgs.fedFootball, sport: 'football', territory: null },
  { key: 'fbRegistrar', email: 'football.registrar@demo.osh.test', name: 'Demo Football Registrar', role: 'fed.registrar', org: SEED.orgs.fedFootball, sport: 'football', territory: null },
  { key: 'atRegistrar', email: 'athletics.registrar@demo.osh.test', name: 'Demo Athletics Registrar', role: 'fed.registrar', org: SEED.orgs.fedAthletics, sport: 'athletics', territory: null },
  { key: 'clubAAdmin', email: 'cluba.admin@demo.osh.test', name: 'Demo Club A Administrator', role: 'club.admin', org: SEED.orgs.clubA, sport: 'football', territory: null },
  { key: 'clubBAdmin', email: 'clubb.admin@demo.osh.test', name: 'Demo Club B Administrator', role: 'club.admin', org: SEED.orgs.clubB, sport: 'athletics', territory: null },
  { key: 'zoneACoordinator', email: 'zonea.coordinator@demo.osh.test', name: 'Demo Zone A Coordinator', role: 'territory.coordinator', org: null, sport: null, territory: SEED.territories.zoneA },
  { key: 'steward', email: 'steward@demo.osh.test', name: 'Demo Data Steward', role: 'data.steward', org: null, sport: null, territory: null },
] as const;

const i18n = (en: string, om = en, am = en) => JSON.stringify({ en, om, am });

export async function seed(databaseUrl: string, opts: { ssl?: boolean; password?: string } = {}): Promise<void> {
  const client = new pg.Client({ connectionString: databaseUrl, ssl: opts.ssl ? { rejectUnauthorized: false } : undefined });
  await client.connect();
  try {
    await client.query('BEGIN');
    for (const [code, family, en, om, am] of [
      ['football', 'team_match', 'Football', 'Kubbaa Miilaa', 'እግር ኳስ'],
      ['athletics', 'measured_timed', 'Athletics', 'Atleetiksii', 'አትሌቲክስ'],
      ['volleyball', 'team_match', 'Volleyball', 'Kubbaa Harkaa', 'ቮሊቦል'],
      ['cycling', 'measured_timed', 'Cycling', 'Saayikilii', 'ብስክሌት'],
    ] as const) {
      await client.query('INSERT INTO ref.sport(code, family, name_i18n) VALUES ($1,$2,$3) ON CONFLICT (code) DO NOTHING', [code, family, i18n(en, om, am)]);
    }

    // DECISION: OD-10 — authoritative zones/woredas come from the Bureau; these are placeholders.
    const t = SEED.territories;
    await client.query(
      `INSERT INTO territories.territory(id, code, name_i18n, level, parent_id) VALUES
         ($1, 'OR', $2, 'region', NULL), ($3, 'DEMO-ZA', $4, 'zone', $1), ($5, 'DEMO-ZB', $6, 'zone', $1)
       ON CONFLICT (code) DO NOTHING`,
      [t.region, i18n('Oromia', 'Oromiyaa', 'ኦሮሚያ'), t.zoneA, i18n('Demo Zone A', 'Godina Fakkeenyaa A', 'ማሳያ ዞን ሀ'), t.zoneB, i18n('Demo Zone B', 'Godina Fakkeenyaa B', 'ማሳያ ዞን ለ')],
    );

    const o = SEED.orgs;
    const orgs: [string, string, string, string | null, string | null, string | null][] = [
      [o.bureau, 'bureau', 'Culture and Sport Bureau (demo record)', null, t.region, null],
      [o.fedFootball, 'federation', 'Football Federation (demo record)', o.bureau, t.region, 'football'],
      [o.fedAthletics, 'federation', 'Athletics Federation (demo record)', o.bureau, t.region, 'athletics'],
      [o.fedVolleyball, 'federation', 'Volleyball Federation (demo record)', o.bureau, t.region, 'volleyball'],
      [o.fedCycling, 'federation', 'Cycling Federation (demo record)', o.bureau, t.region, 'cycling'],
      [o.clubA, 'club', 'Demo Club A', o.fedFootball, t.zoneA, 'football'],
      [o.clubE, 'club', 'Demo Club E', o.fedFootball, t.zoneB, 'football'],
      [o.clubB, 'club', 'Demo Club B', o.fedAthletics, t.zoneB, 'athletics'],
      [o.clubV, 'club', 'Demo Volleyball Club V', o.fedVolleyball, t.zoneA, 'volleyball'],
      [o.teamC, 'club', 'Demo Cycling Team C', o.fedCycling, t.zoneA, 'cycling'],
    ];
    for (const [oid, type, name, parent, terr, sport] of orgs) {
      await client.query(
        `INSERT INTO institutions.organisation(id, type, name, parent_id, territory_id, sport_code, recognition_status)
         VALUES ($1,$2,$3,$4,$5,$6,'recognised') ON CONFLICT (id) DO NOTHING`,
        [oid, type, name, parent, terr, sport],
      );
    }

    // A few verified demo people with active affiliations (seeded directly, audited as seed).
    const people: [number, string, string, string, string, string, string][] = [
      [0x300, 'Demo', 'Player', 'One', '2008-03-14', o.clubA, 'football'],
      [0x301, 'Demo', 'Player', 'Two', '2007-11-02', o.clubA, 'football'],
      [0x302, 'Demo', 'Runner', 'Three', '2005-06-21', o.clubB, 'athletics'],
      [0x303, 'Demo', 'Setter', 'Four', '2004-01-30', o.clubV, 'volleyball'],
    ];
    for (const [n, g, f, gf, dob, org, sport] of people) {
      await client.query(
        `INSERT INTO people.person(id, given_name, father_name, grandfather_name, date_of_birth, identity_status)
         VALUES ($1,$2,$3,$4,$5,'verified') ON CONFLICT (id) DO NOTHING`,
        [id(n), g, f, gf, dob],
      );
      await client.query(
        `INSERT INTO people.affiliation(id, person_id, org_id, sport_code, role_type, start_date, status)
         VALUES ($1,$2,$3,$4,'athlete','2025-09-11','active') ON CONFLICT (id) DO NOTHING`,
        [id(n + 0x100), id(n), org, sport],
      );
    }

    if (opts.password) {
      const hash = await hashPassword(opts.password);
      for (const [i, u] of DEMO_USERS.entries()) {
        const uid = id(0x500 + i);
        await client.query(
          `INSERT INTO iam.user_account(id, email, full_name, password_hash, locale) VALUES ($1,$2,$3,$4,'en')
           ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash, failed_logins = 0, locked_until = NULL`,
          [uid, u.email, u.name, hash],
        );
        await client.query(
          `INSERT INTO iam.role_assignment(id, user_id, role_key, org_id, sport_code, territory_id) VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (id) DO NOTHING`,
          [id(0x600 + i), uid, u.role, u.org, u.sport, u.territory],
        );
      }
    }

    await new AuditService().record(client, { actorId: null, action: 'seed.applied', entityType: 'core.seed', entityId: 'demo', data: { users: !!opts.password } });
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  seed(url, { ssl: process.env.DATABASE_SSL === 'true', password: process.env.SEED_PASSWORD })
    .then(() => console.log(`Seed applied${process.env.SEED_PASSWORD ? ' (with demo users)' : ' (no users: SEED_PASSWORD not set)'}`))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
