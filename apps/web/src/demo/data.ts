/**
 * FICTIONAL demo data for the M0-T06 clickable prototype (CLAUDE.md rule 10).
 * Every organisation, person, place and figure here is invented and labelled "Demo".
 * None of it describes real Oromia institutions, athletes or statistics.
 */
import type { Workspace } from '@oromia/contracts';

export type Sport = Exclude<Workspace, 'bureau'>;
export const SPORTS: readonly Sport[] = ['football', 'athletics', 'volleyball', 'cycling'];

export const TERRITORIES = [
  { id: 'tz-a', name: 'Demo Zone A' },
  { id: 'tz-b', name: 'Demo Zone B' },
] as const;

export interface Club {
  id: string;
  name: string;
  territoryId: string;
  recognition: 'recognised' | 'pending' | 'unverified';
  sections: { sport: Sport; squads: string[]; staff: number; obligationsOpen: number }[];
  documents: { title: string; status: 'accepted' | 'returned' | 'expiring' | 'missing' }[];
}

export const CLUBS: Club[] = [
  {
    id: 'club-a',
    name: 'Demo Club A',
    territoryId: 'tz-a',
    recognition: 'recognised',
    sections: [
      { sport: 'football', squads: ['U17', 'Senior'], staff: 6, obligationsOpen: 1 },
      { sport: 'volleyball', squads: ['Women Senior'], staff: 3, obligationsOpen: 0 },
    ],
    documents: [
      { title: 'Statute (demo)', status: 'accepted' },
      { title: 'Annual report (demo)', status: 'missing' },
      { title: 'Venue safety certificate (demo)', status: 'expiring' },
    ],
  },
  {
    id: 'club-b',
    name: 'Demo Club B',
    territoryId: 'tz-b',
    recognition: 'recognised',
    sections: [{ sport: 'athletics', squads: ['Sprints', 'Middle distance'], staff: 4, obligationsOpen: 0 }],
    documents: [{ title: 'Statute (demo)', status: 'accepted' }],
  },
  {
    id: 'club-c',
    name: 'Demo Cycling Team C',
    territoryId: 'tz-a',
    recognition: 'pending',
    sections: [{ sport: 'cycling', squads: ['Road'], staff: 2, obligationsOpen: 2 }],
    documents: [{ title: 'Recognition evidence (demo)', status: 'returned' }],
  },
  {
    id: 'club-e',
    name: 'Demo Club E',
    territoryId: 'tz-b',
    recognition: 'recognised',
    sections: [{ sport: 'football', squads: ['U17'], staff: 5, obligationsOpen: 0 }],
    documents: [{ title: 'Statute (demo)', status: 'accepted' }],
  },
];

export interface Person {
  id: string;
  name: string;
  birthYear: number;
  identity: 'verified' | 'pending' | 'disputed';
  roles: { role: 'athlete' | 'coach' | 'official'; sport: Sport; clubId?: string; from: string; to?: string }[];
  qualifications: { title: string; sport: Sport; expires?: string; status: 'verified' | 'pending_issuer' }[];
  results: { sport: Sport; event: string; mark: string; date: string; status: 'published' | 'superseded' }[];
  externalIds: { scheme: string; value: string; verifiedOn?: string }[];
  clearance: 'cleared' | 'pending' | 'not_required';
}

export const PEOPLE: Person[] = [
  {
    id: 'p-001',
    name: 'Demo Athlete 001',
    birthYear: 2006,
    identity: 'verified',
    // Rule 2 demo: one person, dated roles in two sports, each scoped separately.
    roles: [
      { role: 'athlete', sport: 'athletics', clubId: 'club-b', from: '2023-09-12' },
      { role: 'coach', sport: 'football', clubId: 'club-a', from: '2025-01-15' },
      { role: 'athlete', sport: 'football', clubId: 'club-e', from: '2021-10-01', to: '2024-07-07' },
    ],
    qualifications: [
      { title: 'Demo grassroots coaching certificate', sport: 'football', expires: '2027-01-31', status: 'verified' },
    ],
    results: [
      { sport: 'athletics', event: '1500m — Demo Regional Meet', mark: '4:02.17', date: '2026-05-10', status: 'published' },
      { sport: 'athletics', event: '800m — Demo Regional Meet', mark: '1:56.40', date: '2026-05-09', status: 'superseded' },
    ],
    externalIds: [{ scheme: 'DEMO-NATIONAL-ID', value: 'DEMO-0001', verifiedOn: '2026-02-03' }],
    clearance: 'cleared',
  },
  {
    id: 'p-002',
    name: 'Demo Athlete 002',
    birthYear: 2009,
    identity: 'pending',
    roles: [{ role: 'athlete', sport: 'football', clubId: 'club-a', from: '2025-09-11' }],
    qualifications: [],
    results: [],
    externalIds: [],
    clearance: 'pending',
  },
  {
    id: 'p-003',
    name: 'Demo Official 003',
    birthYear: 1988,
    identity: 'verified',
    roles: [{ role: 'official', sport: 'football', from: '2019-03-01' }],
    qualifications: [{ title: 'Demo referee badge', sport: 'football', expires: '2026-12-15', status: 'verified' }],
    results: [],
    externalIds: [],
    clearance: 'not_required',
  },
  {
    id: 'p-005',
    name: 'Demo Athlete 005',
    birthYear: 2004,
    identity: 'verified',
    roles: [{ role: 'athlete', sport: 'volleyball', clubId: 'club-a', from: '2024-09-11' }],
    qualifications: [],
    results: [],
    externalIds: [],
    clearance: 'cleared',
  },
  {
    id: 'p-006',
    name: 'Demo Rider 006',
    birthYear: 2001,
    identity: 'pending',
    roles: [{ role: 'athlete', sport: 'cycling', clubId: 'club-c', from: '2025-11-01' }],
    qualifications: [],
    results: [],
    externalIds: [],
    clearance: 'pending',
  },
];

export type Eligibility = 'pass' | 'fail' | 'exception';
export interface EntryMember {
  personId: string;
  displayName: string;
  shirt: number;
  checks: { rule: 'active_affiliation' | 'age_category' | 'not_suspended' | 'duplicate_resolved'; outcome: Eligibility }[];
}

export const FOOTBALL_ENTRY = {
  id: 'entry-1',
  competition: 'Demo U17 Cup 2019',
  club: 'Demo Club A',
  category: 'U17',
  members: [
    { personId: 'p-101', displayName: 'Demo Player 101', shirt: 1, checks: [{ rule: 'active_affiliation', outcome: 'pass' }, { rule: 'age_category', outcome: 'pass' }, { rule: 'not_suspended', outcome: 'pass' }] },
    { personId: 'p-102', displayName: 'Demo Player 102', shirt: 4, checks: [{ rule: 'active_affiliation', outcome: 'pass' }, { rule: 'age_category', outcome: 'fail' }, { rule: 'not_suspended', outcome: 'pass' }] },
    { personId: 'p-002', displayName: 'Demo Athlete 002', shirt: 9, checks: [{ rule: 'active_affiliation', outcome: 'pass' }, { rule: 'age_category', outcome: 'pass' }, { rule: 'duplicate_resolved', outcome: 'exception' }] },
    { personId: 'p-104', displayName: 'Demo Player 104', shirt: 10, checks: [{ rule: 'active_affiliation', outcome: 'pass' }, { rule: 'age_category', outcome: 'pass' }, { rule: 'not_suspended', outcome: 'pass' }] },
  ] satisfies EntryMember[],
};

export interface DemoEvent {
  id: string;
  sport: 'football' | 'athletics';
  title: string;
  date: string;
  venue: string;
}

export const EVENTS: DemoEvent[] = [
  { id: 'ev-fb-1', sport: 'football', title: 'Demo Club A vs Demo Club E', date: '2026-10-25', venue: 'Demo Stadium 1' },
  { id: 'ev-at-1', sport: 'athletics', title: '100m Men U20 — Heat 1', date: '2026-10-26', venue: 'Demo Track 1' },
];

export const ATHLETICS_START_LIST = [
  { lane: 3, bib: '301', name: 'Demo Sprinter 301' },
  { lane: 4, bib: '302', name: 'Demo Sprinter 302' },
  { lane: 5, bib: '303', name: 'Demo Sprinter 303' },
  { lane: 6, bib: '304', name: 'Demo Sprinter 304' },
];

/** Command-centre indicators. Each carries definition, source, period, coverage and as-of (rule 5). */
export interface Indicator {
  key: 'coverage' | 'participants' | 'competitions' | 'facilities';
  value: number | null; // null = no report received (never shown as 0)
  denominator: number | null;
  coveragePct: number;
  source: string;
  asOf: string;
  verification: 'verified' | 'partially_verified' | 'unverified';
}

export const INDICATORS: Indicator[] = [
  { key: 'coverage', value: 4, denominator: 4, coveragePct: 100, source: 'institutions (demo)', asOf: '2026-11-01', verification: 'verified' },
  { key: 'participants', value: 128, denominator: null, coveragePct: 75, source: 'people (demo)', asOf: '2026-11-01', verification: 'partially_verified' },
  { key: 'competitions', value: 6, denominator: 9, coveragePct: 100, source: 'competitions (demo)', asOf: '2026-11-01', verification: 'verified' },
  { key: 'facilities', value: null, denominator: null, coveragePct: 0, source: 'facilities (demo)', asOf: '2026-11-01', verification: 'unverified' },
];

export const FEDERATION_REPORTING: { sport: Sport; monthly: 'accepted' | 'submitted' | 'overdue'; openActions: number }[] = [
  { sport: 'football', monthly: 'accepted', openActions: 2 },
  { sport: 'athletics', monthly: 'submitted', openActions: 1 },
  { sport: 'volleyball', monthly: 'overdue', openActions: 3 },
  { sport: 'cycling', monthly: 'accepted', openActions: 0 },
];

export const ACTION_QUEUE = [
  { id: 'a1', kind: 'overdue_report', subject: 'Demo Volleyball Federation — monthly report', due: '2026-10-30' },
  { id: 'a2', kind: 'duplicate', subject: 'Demo Athlete 002 — possible duplicate', due: '2026-11-05' },
  { id: 'a3', kind: 'expiring_qualification', subject: 'Demo Official 003 — referee badge', due: '2026-12-15' },
  { id: 'a4', kind: 'unvalidated_result', subject: 'Demo Club A vs Demo Club E', due: '2026-11-02' },
] as const;

/** Plans awaiting Bureau review. Amounts are decimal strings in ETB (never floats). */
export const PLAN_SUBMISSIONS = [
  {
    id: 'plan-fb',
    federation: 'football' as Sport,
    fiscalYear: 2019,
    version: 2,
    submittedOn: '2026-10-20',
    activities: [
      { title: 'Demo youth league season', budget: '450000.00' },
      { title: 'Demo referee refresher course', budget: '85000.00' },
    ],
  },
  {
    id: 'plan-at',
    federation: 'athletics' as Sport,
    fiscalYear: 2019,
    version: 1,
    submittedOn: '2026-10-28',
    activities: [
      { title: 'Demo school cross-country series', budget: '120000.00' },
      { title: 'Demo timing equipment maintenance', budget: '60000.00' },
    ],
  },
];

export const findClub = (id: string) => CLUBS.find((c) => c.id === id);
export const findPerson = (id: string) => PEOPLE.find((p) => p.id === id);
export const findEvent = (id: string) => EVENTS.find((e) => e.id === id);
