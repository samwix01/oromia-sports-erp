/** Runtime configuration from environment. Defaults match infra/docker-compose.yml (local only). */
export interface AppConfig {
  port: number;
  version: string;
  production: boolean;
  databaseUrl: string;
  databaseSsl: boolean;
  /** Optional until the modules that need them land (jobs, documents). Unset = not probed. */
  redisUrl: string | null;
  objectStorageUrl: string | null;
  /** DECISION: built-in login replaces Keycloak for Release 1 (ADR-05 revised). */
  sessionTtlHours: number;
  /** DECISION: OD-03 — MFA required for privileged roles once users are enrolled. */
  mfaRequired: boolean;
  probeTimeoutMs: number;
}

const bool = (v: string | undefined, d: boolean) => (v === undefined ? d : v === 'true' || v === '1');

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const production = env.NODE_ENV === 'production';
  return {
    port: Number(env.PORT ?? env.API_PORT ?? 4000),
    version: env.APP_VERSION ?? env.RENDER_GIT_COMMIT?.slice(0, 7) ?? '0.1.0-dev',
    production,
    databaseUrl: env.DATABASE_URL ?? 'postgres://oromia:oromia@localhost:5432/oromia_sports',
    databaseSsl: bool(env.DATABASE_SSL, false),
    redisUrl: env.REDIS_URL ?? (production ? null : 'redis://localhost:6379'),
    objectStorageUrl: env.S3_ENDPOINT ?? (production ? null : 'http://localhost:8333'),
    sessionTtlHours: Number(env.SESSION_TTL_HOURS ?? 8),
    mfaRequired: bool(env.MFA_REQUIRED, false),
    probeTimeoutMs: Number(env.HEALTH_PROBE_TIMEOUT_MS ?? 2000),
  };
}

export const APP_CONFIG = Symbol('APP_CONFIG');
