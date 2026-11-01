import { z } from 'zod';

/** Workspaces shown in the shell switcher. Federations beyond these join via onboarding (OD-16). */
export const WORKSPACES = ['bureau', 'football', 'athletics', 'volleyball', 'cycling'] as const;
export const Workspace = z.enum(WORKSPACES);
export type Workspace = z.infer<typeof Workspace>;

export const DependencyStatus = z.object({
  name: z.enum(['database', 'redis', 'objectStorage', 'identity']),
  status: z.enum(['ok', 'down']),
  latencyMs: z.number().int().nonnegative(),
  error: z.string().optional(),
});
export type DependencyStatus = z.infer<typeof DependencyStatus>;

export const HealthReport = z.object({
  status: z.enum(['ok', 'degraded']),
  version: z.string(),
  checkedAt: z.string().datetime(),
  dependencies: z.array(DependencyStatus),
});
export type HealthReport = z.infer<typeof HealthReport>;
