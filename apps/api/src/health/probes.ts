import { Redis } from 'ioredis';
import pg from 'pg';
import type { AppConfig } from '../config.js';

export type ProbeName = 'database' | 'redis' | 'objectStorage' | 'identity';
export type Probe = () => Promise<void>;
export type Probes = Record<ProbeName, Probe>;
export const HEALTH_PROBES = Symbol('HEALTH_PROBES');

async function httpOk(url: string, timeoutMs: number): Promise<void> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
}

export function createProbes(cfg: AppConfig): Probes {
  return {
    database: async () => {
      const client = new pg.Client({ connectionString: cfg.databaseUrl, connectionTimeoutMillis: cfg.probeTimeoutMs });
      try {
        await client.connect();
        await client.query('SELECT 1');
      } finally {
        await client.end().catch(() => undefined);
      }
    },
    redis: async () => {
      const redis = new Redis(cfg.redisUrl, { lazyConnect: true, connectTimeout: cfg.probeTimeoutMs, maxRetriesPerRequest: 0 });
      try {
        await redis.connect();
        const pong = await redis.ping();
        if (pong !== 'PONG') throw new Error(`Unexpected reply: ${pong}`);
      } finally {
        redis.disconnect();
      }
    },
    // Any S3-compatible service: an HTTP answer below 500 (an anonymous GET is usually 403) means it is up.
    objectStorage: async () => {
      const res = await fetch(cfg.objectStorageUrl, { signal: AbortSignal.timeout(cfg.probeTimeoutMs) });
      if (res.status >= 500) throw new Error(`HTTP ${res.status} from ${cfg.objectStorageUrl}`);
    },
    identity: () =>
      httpOk(`${cfg.keycloakUrl}/realms/${cfg.keycloakRealm}/.well-known/openid-configuration`, cfg.probeTimeoutMs),
  };
}
