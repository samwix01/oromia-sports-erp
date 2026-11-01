import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Assignment, Permission, ScopeTarget } from './permissions.js';
import { can } from './permissions.js';

export interface Actor {
  userId: string;
  email: string;
  fullName: string;
  locale: 'om' | 'am' | 'en';
  mfaEnabled: boolean;
  assignments: Assignment[];
}

export const actorCan = (actor: Actor, perm: Permission, target?: ScopeTarget) => can(actor.assignments, perm, target);

export const IS_PUBLIC = 'osh:isPublic';
/** Marks an endpoint as reachable without a session (login, health). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const CurrentActor = createParamDecorator((_: unknown, ctx: ExecutionContext): Actor => {
  const req = ctx.switchToHttp().getRequest<{ actor?: Actor }>();
  if (!req.actor) throw new Error('CurrentActor used on a public route');
  return req.actor;
});
