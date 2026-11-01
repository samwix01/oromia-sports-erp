import { Controller, Get, HttpCode, Res } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../core/actor.js';
import { HealthService } from './health.service.js';

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /** Liveness: the process is up. No dependency checks. */
  @Get('live')
  @HttpCode(200)
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  /** Readiness: database, Redis, object storage and Keycloak. 503 when any is down. */
  @Get()
  @ApiOkResponse({ description: 'All dependencies reachable' })
  async ready(@Res({ passthrough: true }) res: Response) {
    const report = await this.health.check();
    res.status(report.status === 'ok' ? 200 : 503);
    return report;
  }
}
