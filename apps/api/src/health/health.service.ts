import { Inject, Injectable } from '@nestjs/common';
import type { DependencyStatus, HealthReport } from '@oromia/contracts';
import { APP_CONFIG, type AppConfig } from '../config.js';
import { HEALTH_PROBES, type ProbeName, type Probes } from './probes.js';

@Injectable()
export class HealthService {
  constructor(
    @Inject(HEALTH_PROBES) private readonly probes: Probes,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  async check(now: () => Date = () => new Date()): Promise<HealthReport> {
    const names = Object.keys(this.probes) as ProbeName[];
    const dependencies = await Promise.all(names.map((name) => this.run(name)));
    return {
      status: dependencies.every((d) => d.status === 'ok') ? 'ok' : 'degraded',
      version: this.cfg.version,
      checkedAt: now().toISOString(),
      dependencies,
    };
  }

  private async run(name: ProbeName): Promise<DependencyStatus> {
    const started = performance.now();
    try {
      await this.probes[name]();
      return { name, status: 'ok', latencyMs: Math.round(performance.now() - started) };
    } catch (err) {
      return {
        name,
        status: 'down',
        latencyMs: Math.round(performance.now() - started),
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
