/**
 * Release 1 behaviour against a real Postgres (TEST_DATABASE_URL). Covers the acceptance points
 * in 08-build-plan M1/M2: authentication, scoped access, maker ≠ checker, return-with-reason,
 * duplicate flagging decided by a person, masking, audit chain, missing ≠ zero.
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module.js';
import { migrate } from '../../src/db/migrate.js';
import { SEED, seed } from '../../src/db/seed.js';

const DB = process.env.TEST_DATABASE_URL;
const PASSWORD = 'Demo-password-2026';
const run = DB ? describe : describe.skip;

let app: INestApplication;
const agents: Record<string, request.Agent> = {};

async function login(email: string) {
  const agent = request.agent(app.getHttpServer());
  const r = await agent.post('/api/v1/auth/login').send({ email, password: PASSWORD });
  expect(r.status, `login ${email}: ${JSON.stringify(r.body)}`).toBe(200);
  return agent;
}

run('Release 1 foundation', () => {
  beforeAll(async () => {
    const c = new pg.Client({ connectionString: DB });
    await c.connect();
    await c.query('DROP SCHEMA IF EXISTS core, ref, territories, institutions, iam, people, workflow, audit CASCADE');
    await c.end();
    await migrate(DB!);
    await seed(DB!, { password: PASSWORD });
    process.env.DATABASE_URL = DB;
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
    for (const [k, e] of Object.entries({
      admin: 'admin@demo.osh.test',
      exec: 'executive@demo.osh.test',
      fbSec: 'football.secretariat@demo.osh.test',
      fbReg: 'football.registrar@demo.osh.test',
      atReg: 'athletics.registrar@demo.osh.test',
      clubA: 'cluba.admin@demo.osh.test',
    })) {
      agents[k] = await login(e);
    }
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  describe('authentication', () => {
    it('rejects bad credentials and unauthenticated requests', async () => {
      const r = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'cluba.admin@demo.osh.test', password: 'wrong-password-1' });
      expect(r.status).toBe(401);
      expect((await request(app.getHttpServer()).get('/api/v1/people')).status).toBe(401);
      expect((await request(app.getHttpServer()).get('/api/v1/health/live')).status).toBe(200);
    });

    it('returns the actor with roles and permissions', async () => {
      const r = await agents.fbReg!.get('/api/v1/auth/me');
      expect(r.status).toBe(200);
      expect(r.body.assignments[0].roleKey).toBe('fed.registrar');
      expect(r.body.permissions).toContain('people.affiliation.approve');
    });
  });

  describe('person registration (workflow, scope, maker ≠ checker)', () => {
    let submissionId = '';
    let personId = '';

    it('club admin registers a person into a pending registration', async () => {
      const r = await agents.clubA!.post('/api/v1/people').send({
        givenName: 'Demo',
        fatherName: 'Newcomer',
        grandfatherName: 'Five',
        sex: 'F',
        dateOfBirth: '2009-02-01',
        phone: '+251900000555',
        affiliation: { orgId: SEED.orgs.clubA, sportCode: 'football', roleType: 'athlete', startDate: '2026-09-11' },
      });
      expect(r.status, JSON.stringify(r.body)).toBe(201);
      submissionId = r.body.submissionId;
      personId = r.body.personId;
    });

    it('cannot register into another federation or an unrecognised club', async () => {
      const r = await agents.clubA!.post('/api/v1/people').send({
        givenName: 'Demo',
        affiliation: { orgId: SEED.orgs.clubB, sportCode: 'athletics', roleType: 'athlete', startDate: '2026-09-11' },
      });
      expect(r.status).toBe(403);
    });

    it('only the football registrar sees it in their inbox; the submitter cannot approve', async () => {
      const fb = await agents.fbReg!.get('/api/v1/submissions/inbox');
      expect(fb.body.toAct.map((s: { id: string }) => s.id)).toContain(submissionId);
      const at = await agents.atReg!.get('/api/v1/submissions/inbox');
      expect(at.body.toAct.map((s: { id: string }) => s.id)).not.toContain(submissionId);
      const self = await agents.clubA!.post(`/api/v1/submissions/${submissionId}/actions`).send({ action: 'approve' });
      expect(self.status).toBe(403);
    });

    it('return needs a reason; the submitter resubmits a new version', async () => {
      const noReason = await agents.fbReg!.post(`/api/v1/submissions/${submissionId}/actions`).send({ action: 'return' });
      expect(noReason.status).toBe(400);
      const ret = await agents.fbReg!.post(`/api/v1/submissions/${submissionId}/actions`).send({ action: 'return', reason: 'Date of birth evidence unclear (demo)' });
      expect(ret.body.state).toBe('returned');
      const re = await agents.clubA!.post(`/api/v1/submissions/${submissionId}/actions`).send({ action: 'resubmit', payload: { dateOfBirth: '2009-02-11' } });
      expect(re.body.state).toBe('submitted');
      expect(re.body.version_seq).toBe(2);
    });

    it('registrar approves: identity verified and affiliation active', async () => {
      const ok = await agents.fbReg!.post(`/api/v1/submissions/${submissionId}/actions`).send({ action: 'approve' });
      expect(ok.status, JSON.stringify(ok.body)).toBe(200);
      expect(ok.body.state).toBe('approved');
      const p = await agents.fbReg!.get(`/api/v1/people/${personId}`);
      expect(p.body.person.identityStatus).toBe('verified');
      expect(p.body.person.dateOfBirth).toBe('2009-02-11');
      expect(p.body.affiliations[0].status).toBe('active');
    });

    it('masks sensitive fields for viewers without people.read_sensitive', async () => {
      const list = await agents.clubA!.get('/api/v1/people');
      const me = list.body.find((x: { id: string }) => x.id === personId);
      expect(me.dateOfBirth).toBeNull();
      expect(me.birthYear).toBe('2009');
      expect(me.phone).toMatch(/\*+555$/);
    });

    it('platform admin cannot read personal records', async () => {
      expect((await agents.admin!.get('/api/v1/people')).body).toEqual([]);
      expect((await agents.admin!.get(`/api/v1/people/${personId}`)).status).toBe(403);
    });
  });

  describe('duplicates: the system flags, a person decides (rule 4)', () => {
    it('blocks approval until a registrar decides, with a reason', async () => {
      const r = await agents.clubA!.post('/api/v1/people').send({
        givenName: 'Demo',
        fatherName: 'Player',
        grandfatherName: 'One',
        dateOfBirth: '2008-03-14',
        affiliation: { orgId: SEED.orgs.clubA, sportCode: 'football', roleType: 'athlete', startDate: '2026-09-11' },
      });
      expect(r.status).toBe(201);
      expect(r.body.possibleDuplicates).toBeGreaterThan(0);

      const blocked = await agents.fbReg!.post(`/api/v1/submissions/${r.body.submissionId}/actions`).send({ action: 'approve' });
      expect(blocked.status).toBe(400);
      expect(blocked.body.error).toBe('duplicate_unresolved');

      const dups = await agents.fbReg!.get('/api/v1/duplicates');
      const d = dups.body.find((x: { a_id: string; b_id: string }) => [x.a_id, x.b_id].includes(r.body.personId));
      expect(d).toBeTruthy();
      expect((await agents.fbReg!.post(`/api/v1/duplicates/${d.id}/decide`).send({ decision: 'same_person' })).status).toBe(400);
      expect((await agents.fbReg!.post(`/api/v1/duplicates/${d.id}/decide`).send({ decision: 'same_person', reason: 'Same ID evidence (demo)' })).status).toBe(200);

      const stillBlocked = await agents.fbReg!.post(`/api/v1/submissions/${r.body.submissionId}/actions`).send({ action: 'approve' });
      expect(stillBlocked.body.error).toBe('person_merged_reject_registration');
      const rej = await agents.fbReg!.post(`/api/v1/submissions/${r.body.submissionId}/actions`).send({ action: 'reject', reason: 'Already registered (demo)' });
      expect(rej.body.state).toBe('rejected');
    });
  });

  describe('club recognition', () => {
    it('registrar submits, a secretariat member approves', async () => {
      const r = await agents.fbReg!.post('/api/v1/organisations').send({ type: 'club', name: 'Demo Club F', sportCode: 'football', territoryId: SEED.territories.zoneA });
      expect(r.status, JSON.stringify(r.body)).toBe(201);
      const ok = await agents.fbSec!.post(`/api/v1/submissions/${r.body.submissionId}/actions`).send({ action: 'approve' });
      expect(ok.body.state).toBe('approved');
      const org = await agents.fbSec!.get(`/api/v1/organisations/${r.body.organisationId}`);
      expect(org.body.organisation.recognition_status).toBe('recognised');
    });
  });

  describe('user administration', () => {
    it('secretariat can create a club admin in its federation only', async () => {
      const base = { fullName: 'Demo New Admin', temporaryPassword: 'Temp-password-123' };
      const ok = await agents.fbSec!.post('/api/v1/users').send({ ...base, email: 'new.admin@demo.osh.test', assignments: [{ roleKey: 'club.admin', orgId: SEED.orgs.clubE, sportCode: 'football' }] });
      expect(ok.status, JSON.stringify(ok.body)).toBe(201);
      const otherFed = await agents.fbSec!.post('/api/v1/users').send({ ...base, email: 'x1@demo.osh.test', assignments: [{ roleKey: 'club.admin', orgId: SEED.orgs.clubB, sportCode: 'athletics' }] });
      expect(otherFed.status).toBe(403);
      const escalate = await agents.fbSec!.post('/api/v1/users').send({ ...base, email: 'x2@demo.osh.test', assignments: [{ roleKey: 'platform.admin' }] });
      expect(escalate.status).toBe(403);
    });
  });

  describe('reporting and audit', () => {
    it('command centre shows live counts and marks unused modules as not collected (rule 5)', async () => {
      const r = await agents.exec!.get('/api/v1/reports/command-centre');
      expect(r.status).toBe(200);
      const byKey = Object.fromEntries(r.body.indicators.map((i: { key: string }) => [i.key, i]));
      expect(byKey.federations_recognised.denominator).toBe(4);
      expect(byKey.competitions_validated.status).toBe('not_collected');
      expect(byKey.competitions_validated.value).toBeNull();
      expect((await agents.clubA!.get('/api/v1/reports/command-centre')).status).toBe(403);
    });

    it('audit chain is intact and append-only', async () => {
      const v = await agents.admin!.get('/api/v1/audit/verify');
      expect(v.body).toEqual({ intact: true, firstBrokenEventId: null });
      const c = new pg.Client({ connectionString: DB });
      await c.connect();
      await expect(c.query("UPDATE audit.event SET action = 'tampered'")).rejects.toThrow(/append-only/);
      await c.end();
    });
  });
});
