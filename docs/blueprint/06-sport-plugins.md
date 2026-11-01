# 06 — Sport Plugin Contract and the Four Federation Workspaces

Principle from the proposal: **"Shared data model. Separate technical rules. Accountable human decisions."** Shared fields must not flatten sport differences. Each federation controls its own technical results; the platform provides shared logistics.

## 1. The plugin contract (`packages/sport-sdk`)

```ts
export interface SportPlugin<RS = unknown, EP = unknown, RP = unknown> {
  key: string;                                   // 'football'
  family: 'team_match' | 'measured_timed' | 'combat_judged' | 'racket_mind' | 'traditional_para';
  version: string;

  // Configuration
  ruleSetSchema: z.ZodType<RS>;                  // validates ref.rule_set.config
  defaultRuleSet(): RS;                          // FICTIONAL sensible defaults, marked draft
  competitionFormatSchema: z.ZodType<unknown>;   // league/cup/meet/race formats

  // Structure
  eventPayloadSchema: z.ZodType<EP>;             // event.payload
  generateSchedule?(input: ScheduleInput<RS>): ScheduledEvent[]; // round-robin, heats, start order

  // Entries
  entrySchema: z.ZodType<unknown>;
  eligibilityRules(ruleSet: RS): EligibilityRule[];

  // Results
  resultPayloadSchema: z.ZodType<RP>;            // result_version.payload
  validateResult(payload: RP, ctx: ResultContext<RS>): ValidationIssue[];
  deriveOutcome(payload: RP, ctx: ResultContext<RS>): Outcome; // winner, ranks, marks
  computeStandings?(results: PublishedResult<RP>[], ruleSet: RS): StandingTable;   // team sports
  computeClassification?(results: PublishedResult<RP>[], ruleSet: RS): Classification; // races/meets
  isRecordCandidate?(payload: RP, existing: RecordRow[]): RecordCandidate[];

  // Officials
  officialRoles: OfficialRoleDef[];              // with required qualification types

  // UI hooks (web)
  ui: {
    entryForm: string;                           // component ids resolved by apps/web registry
    resultEntryForm: string;
    resultDisplay: string;
    workspaceNav: NavItem[];
  };

  // Imports
  importers?: ImporterDef[];                     // e.g. Hy-Tek/Meet Manager CSV for athletics (if approved)
}
```

- Plugins are **pure** (no DB access); the competitions module passes data in and persists outputs. This makes them unit-testable with fixtures.
- Each plugin ships a **conformance test** from `sport-sdk/testing` (schema round-trip, standings determinism, correction re-computation).
- Family base classes (`TeamMatchPluginBase`, `MeasuredTimedPluginBase`, …) provide defaults so onboarding a new sport (e.g. basketball, taekwondo, chess) is mostly configuration.

## 2. Rule sets

- Owned by the federation (`owner_org_id`), versioned, `draft → approved → retired`. A competition pins a rule set version at approval; changing rules mid-competition requires a new version + decision.
- UI: rule-set editor generated from the plugin's Zod schema (form + JSON view), diff between versions, approval workflow.
- **All values below marked (default) are placeholders** to be confirmed with each federation's technical authority (OD-07). Never present them as Oromia rules.

---

## 3. Schedule A — Oromia Football Federation (`packages/sports/football`, family `team_match`)

**Workspace nav:** Clubs & teams · Player registration · Seasons & competitions · Fixtures · Officials · Match sheets · Results & standings · Discipline & protests · Development · External IDs

**Rule set (Zod sketch):**
```ts
{
  categories: [{ code: 'U17_M', gender: 'men', ageMax: 17 }, ...],   // (default)
  squad: { min: 16, max: 30 },                                       // (default)
  matchSheet: { starters: 11, maxSubstitutes: 9, maxSubstitutionsUsed: 5 }, // (default)
  points: { win: 3, draw: 1, loss: 0 },
  tieBreakers: ['points','head_to_head_points','goal_difference','goals_for','fair_play','drawing_of_lots'], // ordered, configurable
  registrationWindows: [{ from: '...', to: '...' }],
  allowMultiClub: false,
  cards: { yellowSuspensionThreshold: 5, redAutoSuspensionMatches: 1 }, // (default) → creates *proposed* sanction for committee decision
  extraTime: boolean, penalties: boolean
}
```

**Result payload:** `{ home: {goals, penaltyGoals?}, away: {...}, events: [{minute, type: 'goal'|'own_goal'|'yellow'|'second_yellow'|'red'|'sub_in'|'sub_out', personId, teamSide}], lineups: {home: [...], away: [...]}, abandoned?: {...}, commissionerReportDocId? }`

**Officials:** referee, assistant referee, fourth official, match commissioner (qualification types per federation).

**Acceptance scenario (from Schedule A):** club submits player + team entry → registrar resolves an identity query → eligibility approved, officials appointed → match report validated → protest changes publication status → authorised decision produces versioned correction and updated standings.

**Boundaries:** EFF/FIFA/CAF identifiers are references only, exchanged through permitted routes (OD-06). No regional control of national clearance (transfers) or club licensing assumed.

---

## 4. Schedule B — Oromia Athletics Federation (`packages/sports/athletics`, family `measured_timed`)

**Workspace nav:** Athletes & clubs · Meet calendar · Event catalogue · Entries · Start lists (heats/lanes/flights) · Results & conditions · Records · Officials & equipment · Development

**Rule set sketch:**
```ts
{
  eventCatalogue: [{ code: '100m', type: 'track_sprint', unit: 's', precision: 0.01, windRequired: true, timing: ['hand','fat'] },
                   { code: 'LJ', type: 'field_horizontal', unit: 'm', precision: 0.01, attempts: 3, finalAttempts: 3, windRequired: true },
                   { code: 'HJ', type: 'field_vertical', unit: 'm', precision: 0.01 },
                   { code: '10000m', type: 'track_distance', unit: 's', precision: 0.01 },
                   { code: 'XC', type: 'cross_country', unit: 's', precision: 1, teamScoring: { scorers: 4 } }], // (default)
  categories: [...],
  entryStandards: { '<event>/<category>': mark },
  heatsAdvancement: { byPlace: n, byTime: m },
  maxEventsPerAthletePerDay: 3,                           // (default)
  handTimeRounding: 'up_to_tenth',                        // (default)
  windLegalLimit: 2.0                                     // for record eligibility (default)
}
```

**Result payload (per event session):** `{ results: [{ entryMemberId, lane?, bib, mark?: {value, unit, timingMethod}, attempts?: [{n, value|null, foul: bool, wind?}], heights?: [{bar, attempts: 'XXO'}], place?, status: 'OK'|'DNS'|'DNF'|'DQ'|'NM', reasonCode?, wind? }], conditions: { wind?, temperature?, altitudeM? }, deviceRefs: [...] }`

- Marks stored as integer in smallest unit (ms / mm) + display precision → no float errors.
- Records: `isRecordCandidate` flags; **ratification is a human workflow**; local validation never claims international ratification.
- Never combine performances across events or sports into one ranking. Rankings are per event × category.

**Acceptance scenario (Schedule B):** club submits track & field entries → officials check category and entry standards → schedule/start lists approved → technical results with conditions → reviewers confirm qualification & publication → corrected measurement retains the original and updates affected outputs (places, advancement, records).

---

## 5. Schedule C — Oromia Volleyball Federation (`packages/sports/volleyball`, family `team_match`)

**Workspace nav:** Clubs, teams & athletes · Competitions · Fixtures & courts · Match operations (rosters, line-ups, officials) · Results & standings · Development · Facilities & equipment

**Rule set sketch:**
```ts
{
  variant: 'indoor' | 'beach',                       // OD-12: confirm scope
  roster: { min: 6, max: 14, liberoMax: 2 },         // (default) beach: 2
  bestOf: 5, setPoints: 25, decidingSetPoints: 15, winBy: 2,   // (default)
  matchPoints: { '3-0': [3,0], '3-1': [3,0], '3-2': [2,1] },   // (default; configurable)
  tieBreakers: ['matches_won','points','set_ratio','point_ratio','head_to_head'],
}
```

**Result payload:** `{ sets: [{home: 25, away: 21}, ...], lineups?: {...}, sanctions?: [...], scoresheetDocId, rally?: [...] /* optional, later */ }`
`validateResult` enforces set scoring rules (win-by-2, deciding set length) and flags inconsistencies as issues, not hard rejects, so reviewers decide.

**Acceptance scenario (Schedule C):** teams submit rosters → registrars verify eligibility → organisers allocate courts and officials → scorers submit set results → reviewer validates → standings apply approved rules → disputed score stays under review until an authorised decision confirms/corrects. Live rally scoring is out of initial release.

---

## 6. Schedule D — Oromia Cycling Federation (`packages/sports/cycling`, family `measured_timed`)

**Workspace nav:** Riders & teams · Race calendar · Routes & readiness · Permits & coordination · Start lists & bibs · Timing & incidents · Classifications · Officials (commissaires) · Development & equipment

**Rule set sketch:**
```ts
{
  disciplines: ['road_race','time_trial','criterium','stage_race','mtb_xco','track'],  // OD-13
  categories: [...],
  timingPrecision: { road_race: 1, time_trial: 0.01 },   // seconds (default)
  sameTimeGapRule: { enabled: true, gapSeconds: 1 },      // (default)
  classifications: ['general','points','mountains','youth','team'],  // (stage races, configurable)
  penalties: [{ code: 'TIME', unit: 's' }, { code: 'POINTS' }, { code: 'DSQ' }],
  timeCutPercent: null
}
```

**Domain extras:** `route_version` (GeoJSON, distance, profile, checkpoints, feed zones), `permit` (responsible authority, reference, status), readiness checklist (course check, marshals, medical cover, police coordination — **evidence only; competent authorities approve**).

**Result payload (per race/stage):** `{ finishers: [{ entryMemberId, bib, timeMs, status: 'FIN'|'DNF'|'DNS'|'OTL'|'DSQ', penalties: [...] }], timingSource: 'manual'|'chip'|'photo_finish', incidents: [...], checkpointSplits?: [...] }`
GPS tracking is optional and **never** the official timing source without approval.

**Acceptance scenario (Schedule D):** organiser submits race + route → authorities confirm permissions (evidence uploaded) → riders enter, officials approve start list → timing and incident evidence captured → commissaires validate classifications → protest produces traceable decision and corrected publication.

---

## 7. Onboarding a new sport (beyond the four)

1. Create `ref.sport` with family + `plugin_key` (reuse a family base plugin if no special logic).
2. Draft rule set via editor; federation technical authority approves.
3. Configure qualification types and official roles.
4. Run plugin conformance suite + one witnessed (live or simulated) entry-to-result cycle.
5. Enable federation workspace; train administrators.
