import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { z } from 'zod';

/** Validate input with Zod; 400 with field issues on failure. */
export function parse<S extends z.ZodTypeAny>(schema: S, input: unknown): z.infer<S> {
  const r = schema.safeParse(input);
  if (!r.success) {
    throw new BadRequestException({
      error: 'validation_failed',
      issues: r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  return r.data;
}

export const forbidden = (code = 'forbidden', detail?: string) => new ForbiddenException({ error: code, detail });
export const notFound = (what: string) => new NotFoundException({ error: 'not_found', detail: what });
export const badRequest = (code: string, detail?: string) => new BadRequestException({ error: code, detail });

/** Map Postgres constraint errors to 409/400 responses with a stable code. */
export function pgErrorCode(err: unknown): string | null {
  const e = err as { code?: string; constraint?: string };
  if (e?.code === '23P01') return e.constraint ?? 'exclusion_violation';
  if (e?.code === '23505') return e.constraint ?? 'unique_violation';
  return null;
}
