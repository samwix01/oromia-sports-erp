import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, type OnModuleInit } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentActor, type Actor } from '../../core/actor.js';
import { parse } from '../../core/errors.js';
import { WorkflowService } from '../workflow/public-api.js';
import { PeopleService } from './people.service.js';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Register = z.object({
  givenName: z.string().trim().min(1).max(100),
  fatherName: z.string().trim().max(100).optional(),
  grandfatherName: z.string().trim().max(100).optional(),
  sex: z.enum(['F', 'M']).optional(),
  dateOfBirth: isoDate.optional(),
  phone: z.string().trim().regex(/^\+?[0-9 ]{7,20}$/).optional(),
  email: z.string().email().optional(),
  territoryId: z.string().uuid().nullable().optional(),
  assisted: z.boolean().default(false),
  affiliation: z.object({
    orgId: z.string().uuid(),
    sportCode: z.string().min(2).max(40),
    roleType: z.enum(['athlete', 'coach', 'official', 'staff']),
    startDate: isoDate,
  }),
});
const ListQuery = z.object({ q: z.string().max(100).optional(), sport: z.string().optional(), org: z.string().uuid().optional() });
const Decide = z.object({ decision: z.enum(['same_person', 'different_people', 'held']), reason: z.string().trim().min(3).max(2000) });

@ApiTags('people')
@Controller()
export class PeopleController implements OnModuleInit {
  constructor(
    private readonly people: PeopleService,
    private readonly wf: WorkflowService,
  ) {}

  onModuleInit() {
    this.wf.register('person_registration', this.people.hooks());
  }

  @Get('people')
  list(@CurrentActor() actor: Actor, @Query() query: unknown) {
    const q = parse(ListQuery, query);
    return this.people.list(actor, { q: q.q, sport: q.sport, orgId: q.org });
  }

  @Post('people')
  register(@CurrentActor() actor: Actor, @Body() body: unknown) {
    return this.people.register(actor, parse(Register, body));
  }

  @Get('people/:id')
  get(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.people.get360(actor, id);
  }

  @Get('duplicates')
  duplicates(@CurrentActor() actor: Actor, @Query('status') status?: string) {
    return this.people.listDuplicates(actor, status === 'held' ? 'held' : 'open');
  }

  @Post('duplicates/:id/decide')
  @HttpCode(200)
  decide(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown) {
    const b = parse(Decide, body);
    return this.people.decideDuplicate(actor, id, b.decision, b.reason);
  }
}
