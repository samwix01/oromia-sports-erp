import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentActor, type Actor } from '../../core/actor.js';
import { forbidden, parse } from '../../core/errors.js';
import { WorkflowService } from './workflow.service.js';

const Action = z.object({
  action: z.enum(['approve', 'return', 'reject', 'withdraw', 'resubmit']),
  reason: z.string().max(2000).optional(),
  payload: z.record(z.unknown()).optional(),
});

@ApiTags('workflow')
@Controller('submissions')
export class WorkflowController {
  constructor(private readonly wf: WorkflowService) {}

  @Get('inbox')
  inbox(@CurrentActor() actor: Actor) {
    return this.wf.inbox(actor);
  }

  @Get(':id')
  async get(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    const s = await this.wf.get(id);
    const canAct = await this.wf.canAct(actor, s);
    // Visible to the submitter, anyone who can act now, or anyone who acted on it before.
    const history = await this.wf.history(id);
    const involved = s.submitted_by === actor.userId || canAct || history.log.some((l) => (l as { actor_id?: string }).actor_id === actor.userId);
    if (!involved) throw forbidden();
    return { submission: s, canAct, ...history };
  }

  @Post(':id/actions')
  @HttpCode(200)
  act(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown) {
    const b = parse(Action, body);
    return this.wf.act(actor, id, b.action, b.reason, b.payload);
  }
}
