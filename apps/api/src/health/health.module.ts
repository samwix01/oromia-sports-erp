import { Module } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config.js';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';
import { HEALTH_PROBES, createProbes } from './probes.js';

@Module({
  controllers: [HealthController],
  providers: [
    HealthService,
    { provide: HEALTH_PROBES, useFactory: (cfg: AppConfig) => createProbes(cfg), inject: [APP_CONFIG] },
  ],
})
export class HealthModule {}
