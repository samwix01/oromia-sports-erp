import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentActor, type Actor } from '../../core/actor.js';
import { forbidden } from '../../core/errors.js';
import { grants } from '../../core/permissions.js';
import { TerritoriesService } from './territories.service.js';

@ApiTags('territories')
@Controller('territories')
export class TerritoriesController {
  constructor(private readonly territories: TerritoriesService) {}

  @Get()
  list(@CurrentActor() actor: Actor) {
    if (!actor.assignments.some((a) => grants(a, 'territories.read'))) throw forbidden();
    return this.territories.list();
  }
}
