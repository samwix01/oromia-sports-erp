import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import { HealthService } from '../src/health/health.service.js';
import type { Probes } from '../src/health/probes.js';

const ok = async () => undefined;
const cfg = { ...loadConfig({}), version: 'test' };
const fixedNow = () => new Date('2026-11-01T12:00:00Z');

describe('HealthService', () => {
  it('reports ok when every dependency responds', async () => {
    const probes: Probes = { database: ok, redis: ok, objectStorage: ok, identity: ok };
    const report = await new HealthService(probes, cfg).check(fixedNow);
    expect(report.status).toBe('ok');
    expect(report.version).toBe('test');
    expect(report.checkedAt).toBe('2026-11-01T12:00:00.000Z');
    expect(report.dependencies.map((d) => [d.name, d.status])).toEqual([
      ['database', 'ok'],
      ['redis', 'ok'],
      ['objectStorage', 'ok'],
      ['identity', 'ok'],
    ]);
  });

  it('reports degraded and names the failing dependency', async () => {
    const probes: Probes = {
      database: ok,
      redis: async () => {
        throw new Error('ECONNREFUSED');
      },
      objectStorage: ok,
      identity: ok,
    };
    const report = await new HealthService(probes, cfg).check(fixedNow);
    expect(report.status).toBe('degraded');
    expect(report.dependencies.find((d) => d.name === 'redis')).toMatchObject({ status: 'down', error: 'ECONNREFUSED' });
  });
});
