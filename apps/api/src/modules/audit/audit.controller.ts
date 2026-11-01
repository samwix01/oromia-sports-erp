import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentActor, type Actor } from '../../core/actor.js';
import { AuditService } from '../../core/audit.service.js';
import { forbidden } from '../../core/errors.js';
import { grants } from '../../core/permissions.js';
import { DbService } from '../../db/db.service.js';

@ApiTags('audit')
@Controller('audit')
export class AuditController {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
  ) {}

  @Get('verify')
  async verify(@CurrentActor() actor: Actor) {
    if (!actor.assignments.some((a) => grants(a, 'audit.read'))) throw forbidden();
    const broken = await this.audit.verify(this.db);
    return { intact: broken === null, firstBrokenEventId: broken };
  }

  @Get(':entityType/:entityId')
  async history(@CurrentActor() actor: Actor, @Param('entityType') entityType: string, @Param('entityId') entityId: string) {
    if (!actor.assignments.some((a) => grants(a, 'audit.read'))) throw forbidden();
    const r = await this.db.query(
      `SELECT e.id, e.at, e.action, e.data, u.full_name AS actor_name FROM audit.event e
       LEFT JOIN iam.user_account u ON u.id = e.actor_id WHERE e.entity_type = $1 AND e.entity_id = $2 ORDER BY e.id`,
      [entityType, entityId],
    );
    return r.rows;
  }
}
