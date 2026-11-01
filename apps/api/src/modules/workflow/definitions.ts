import type { Permission } from '../../core/permissions.js';

/**
 * Configured workflows (05-workflows §3). DECISION: OD-03 — steps are templates until the Bureau
 * confirms who approves what. Each step names the permission its actor needs; the scope is the
 * submission's organisation (and ancestors), sport and territory.
 */
export interface StepDef {
  key: string;
  permission: Permission;
}
export interface WorkflowDef {
  code: string;
  subjectType: string;
  submitPermission: Permission;
  steps: StepDef[];
}

export const WORKFLOWS: Record<string, WorkflowDef> = {
  org_recognition: {
    code: 'org_recognition',
    subjectType: 'institutions.organisation',
    submitPermission: 'institutions.organisation.submit',
    steps: [{ key: 'secretariat_approval', permission: 'institutions.organisation.approve' }],
  },
  person_registration: {
    code: 'person_registration',
    subjectType: 'people.person',
    submitPermission: 'people.register',
    steps: [{ key: 'registrar_verification', permission: 'people.affiliation.approve' }],
  },
};

export type WorkflowAction = 'approve' | 'return' | 'reject' | 'withdraw' | 'resubmit';
export const REASON_REQUIRED: readonly WorkflowAction[] = ['return', 'reject'];
