import { Redis } from 'ioredis';
import pg from 'pg';
import type { AppConfig } from '../config.js';

export type ProbeName = 'database' | 'redis' | 'objectStorage' | 'identity';
export type Probe = () => Promise<void>;
export type Probes = Partial<Record<ProbeName, Probe>>;
export const HEALTH_PROBES = Symbol('HEALTH_PROBES');

export function createProbes(cfg: AppConfig): Probes {
  const probes: Probes = {
    database: async () => {
      const client = new pg.Client({
        connectionString: cfg.databaseUrl,
        connectionTimeoutMillis: cfg.probeTimeoutMs,
        ssl: cfg.databaseSsl ? { rejectUnauthorized: false } : undefined,
      });
      try {
        await client.connect();
        await client.query('SELECT 1');
      } finally {
        await client.end().catch(() => undefined);
      }
    },
  };
  const redisUrl = cfg.redisUrl;
  if (redisUrl) {
    probes.redis = async () => {
      const redis = new Redis(redisUrl, { lazyConnect: true, connectTimeout: cfg.probeTimeoutMs, maxRetriesPerRequest: 0 });
      try {
        await redis.connect();
        const pong = await redis.ping();
        if (pong !== 'PONG') throw new Error(`Unexpected reply: ${pong}`);
      } finally {
        redis.disconnect();
      }
    };
  }
  const s3 = cfg.objectStorageUrl;
  if (s3) {
    // Any S3-compatible service: an HTTP answer below 500 (anonymous GET is usually 403) means it is up.
    probes.objectStorage = async () => {
      const res = await fetch(s3, { signal: AbortSignal.timeout(cfg.probeTimeoutMs) });
      if (res.status >= 500) throw new Error(`HTTP ${res.status} from ${s3}`);
    };
  }
  // Identity is built into the API in Release 1 (ADR-05 revised), so there is no external probe.
  return probes;
}
