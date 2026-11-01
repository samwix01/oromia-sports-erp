/** Runtime configuration from environment. Defaults match infra/docker-compose.yml (local only). */
export interface AppConfig {
  port: number;
  version: string;
  databaseUrl: string;
  redisUrl: string;
  objectStorageUrl: string;
  keycloakUrl: string;
  keycloakRealm: string;
  probeTimeoutMs: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: Number(env.API_PORT ?? 4000),
    version: env.APP_VERSION ?? '0.1.0-dev',
    databaseUrl: env.DATABASE_URL ?? 'postgres://oromia:oromia@localhost:5432/oromia_sports',
    redisUrl: env.REDIS_URL ?? 'redis://localhost:6379',
    objectStorageUrl: env.S3_ENDPOINT ?? 'http://localhost:9000',
    keycloakUrl: env.KEYCLOAK_URL ?? 'http://localhost:8080',
    keycloakRealm: env.KEYCLOAK_REALM ?? 'oromia-sports',
    probeTimeoutMs: Number(env.HEALTH_PROBE_TIMEOUT_MS ?? 2000),
  };
}

export const APP_CONFIG = Symbol('APP_CONFIG');
