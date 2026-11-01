/**
 * Permission registry and role templates (04-security-and-access §1).
 * Access = any active role assignment that grants the permission AND whose scope covers the target.
 * DECISION: OD-03 — role names and grants are templates until the Bureau confirms the authority matrix.
 */

export const PERMISSIONS = [
  'iam.user.read',
  'iam.user.manage',
  'audit.read',
  'reporting.read',
  'territories.read',
  'institutions.read',
  'institutions.organisation.submit',
  'institutions.organisation.review',
  'institutions.organisation.approve',
  'people.read',
  'people.read_sensitive',
  'people.register',
  'people.affiliation.approve',
  'people.duplicate.decide',
  'workflow.inbox',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_KEYS = [
  'platform.admin',
  'bureau.executive',
  'bureau.reviewer',
  'fed.secretariat',
  'fed.registrar',
  'club.admin',
  'territory.coordinator',
  'data.steward',
] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export const ROLE_PERMISSIONS: Record<RoleKey, readonly Permission[]> = {
  // Platform admins configure the system. They get NO personal-data access (rule 7).
  'platform.admin': ['iam.user.read', 'iam.user.manage', 'audit.read', 'territories.read', 'institutions.read'],
  'bureau.executive': ['reporting.read', 'institutions.read', 'territories.read', 'audit.read', 'workflow.inbox'],
  'bureau.reviewer': ['reporting.read', 'institutions.read', 'territories.read', 'workflow.inbox'],
  'fed.secretariat': [
    'institutions.read',
    'institutions.organisation.approve',
    'iam.user.read',
    'iam.user.manage',
    'reporting.read',
    'territories.read',
    'workflow.inbox',
  ],
  'fed.registrar': [
    'institutions.read',
    'institutions.organisation.submit',
    'institutions.organisation.review',
    'people.read',
    'people.read_sensitive',
    'people.affiliation.approve',
    'people.duplicate.decide',
    'territories.read',
    'workflow.inbox',
  ],
  'club.admin': [
    'institutions.read',
    'institutions.organisation.submit',
    'people.read',
    'people.register',
    'iam.user.read',
    'iam.user.manage',
    'territories.read',
    'workflow.inbox',
  ],
  'territory.coordinator': ['reporting.read', 'institutions.read', 'territories.read'],
  'data.steward': ['people.read', 'people.duplicate.decide', 'institutions.read', 'territories.read', 'workflow.inbox'],
};

/** Roles an assignment holder may grant to others (within their own scope). */
export const GRANTABLE: Record<RoleKey, readonly RoleKey[]> = {
  'platform.admin': ROLE_KEYS,
  'bureau.executive': [],
  'bureau.reviewer': [],
  'fed.secretariat': ['fed.registrar', 'fed.secretariat', 'club.admin'],
  'fed.registrar': [],
  'club.admin': ['club.admin'],
  'territory.coordinator': [],
  'data.steward': [],
};

export interface Assignment {
  id: string;
  roleKey: RoleKey;
  /** null = region-wide for this role. */
  orgId: string | null;
  sportCode: string | null;
  territoryId: string | null;
}

/**
 * What a check is about. orgChain = the target organisation and all its ancestors
 * (club → federation → bureau); territoryChain likewise. Empty arrays = not org/territory specific.
 */
export interface ScopeTarget {
  orgChain?: string[];
  sportCode?: string | null;
  territoryChain?: string[];
}

export function assignmentCovers(a: Assignment, t: ScopeTarget): boolean {
  if (a.orgId && !(t.orgChain ?? []).includes(a.orgId)) return false;
  if (a.sportCode && t.sportCode !== a.sportCode) return false;
  if (a.territoryId && !(t.territoryChain ?? []).includes(a.territoryId)) return false;
  return true;
}

export function grants(a: Assignment, perm: Permission): boolean {
  return ROLE_PERMISSIONS[a.roleKey]?.includes(perm) ?? false;
}

export function can(assignments: readonly Assignment[], perm: Permission, target: ScopeTarget = {}): boolean {
  return assignments.some((a) => grants(a, perm) && assignmentCovers(a, target));
}

/** Assignments that grant perm at all (any scope) — used to build list filters. */
export function scopesFor(assignments: readonly Assignment[], perm: Permission): Assignment[] {
  return assignments.filter((a) => grants(a, perm));
}

/** True when the actor may grant `role` scoped at `target` (org/sport/territory of the new assignment). */
export function canGrant(assignments: readonly Assignment[], role: RoleKey, target: ScopeTarget): boolean {
  return assignments.some(
    (a) => grants(a, 'iam.user.manage') && GRANTABLE[a.roleKey].includes(role) && assignmentCovers(a, target),
  );
}

export const isRoleKey = (v: string): v is RoleKey => (ROLE_KEYS as readonly string[]).includes(v);
