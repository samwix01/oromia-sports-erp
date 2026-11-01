'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ATHLETICS_START_LIST, type DemoEvent } from '@/demo/data';
import { Badge, Card, DateText, DemoTag, NotSaved } from './bits';

type Status = 'draft' | 'submitted' | 'validated' | 'published' | 'superseded';
type Role = 'roleOfficial' | 'roleReviewer' | 'roleManager';
type FootballPayload = { home: number; away: number };
type AthleticsPayload = { rows: { bib: string; time: string; outcome: 'OK' | 'DNS' | 'DNF' | 'DQ' }[] };
type Payload = FootballPayload | AthleticsPayload;

interface Version {
  seq: number;
  status: Status;
  payload: Payload;
  reason?: string;
  log: { status: Status; role: Role }[];
}

const NEXT: Partial<Record<Status, { to: Status; role: Role; action: 'submit' | 'validate' | 'publish' }>> = {
  draft: { to: 'submitted', role: 'roleOfficial', action: 'submit' },
  submitted: { to: 'validated', role: 'roleReviewer', action: 'validate' },
  validated: { to: 'published', role: 'roleManager', action: 'publish' },
};

const initialPayload = (sport: DemoEvent['sport']): Payload =>
  sport === 'football'
    ? { home: 2, away: 1 }
    : { rows: ATHLETICS_START_LIST.map((r, i) => ({ bib: r.bib, time: ['10.62', '10.48', '10.71', ''][i] ?? '', outcome: i === 3 ? 'DNS' : 'OK' })) };

export function ResultEntry({ event }: { event: DemoEvent }) {
  const t = useTranslations('proto');
  const [versions, setVersions] = useState<Version[]>([
    { seq: 1, status: 'draft', payload: initialPayload(event.sport), log: [{ status: 'draft', role: 'roleOfficial' }] },
  ]);
  const [editing, setEditing] = useState<Payload | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState(false);

  const current = versions[versions.length - 1]!;
  const working = editing ?? current.payload;
  const editable = current.status === 'draft' || editing !== null;

  const advance = () => {
    const step = NEXT[current.status];
    if (!step) return;
    setVersions(versions.map((v) => (v.seq === current.seq ? { ...v, status: step.to, log: [...v.log, { status: step.to, role: step.role }] } : v)));
  };

  // Rule 3: a correction creates version n+1 and supersedes, never overwrites.
  const saveCorrection = () => {
    if (!editing) return;
    if (!reason.trim()) return setReasonError(true);
    const next: Version = { seq: current.seq + 1, status: 'draft', payload: editing, reason: reason.trim(), log: [{ status: 'draft', role: 'roleOfficial' }] };
    setVersions([...versions.map((v) => (v.seq === current.seq ? { ...v, status: 'superseded' as Status, log: [...v.log, { status: 'superseded' as Status, role: 'roleManager' as Role }] } : v)), next]);
    setEditing(null);
    setReason('');
    setReasonError(false);
  };

  const update = (p: Payload) => (current.status === 'draft' ? setVersions(versions.map((v) => (v.seq === current.seq ? { ...v, payload: p } : v))) : setEditing(p));
  const step = NEXT[current.status];

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">
          {event.title}
          <DemoTag />
        </h1>
        <p className="text-sm text-muted-foreground">
          <DateText iso={event.date} /> · {t('common.venue')}: {event.venue}
        </p>
      </header>
      <NotSaved />

      <Card
        title={
          <span>
            {t('results.title')} · {t('common.version')} {current.seq}{' '}
            <Badge tone={current.status === 'published' ? 'good' : 'warn'}>
              <span data-testid="current-status">{t(`results.status.${current.status}`)}</span>
            </Badge>
          </span>
        }
      >
        {'home' in working ? (
          <div className="flex items-center gap-4 text-sm">
            {(['home', 'away'] as const).map((side) => (
              <label key={side} className="flex items-center gap-2">
                {t(`results.${side}`)} · {t('results.goals')}
                <input
                  type="number"
                  min={0}
                  disabled={!editable}
                  data-testid={`goals-${side}`}
                  className="w-16 rounded border border-border bg-background px-2 py-1"
                  value={working[side]}
                  onChange={(e) => update({ ...working, [side]: Number(e.target.value) })}
                />
              </label>
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th>{t('results.lane')}</th>
                <th>{t('results.bib')}</th>
                <th>{t('results.name')}</th>
                <th>{t('results.time')}</th>
                <th>{t('results.outcome')}</th>
              </tr>
            </thead>
            <tbody>
              {ATHLETICS_START_LIST.map((s, i) => {
                const row = working.rows[i]!;
                const set = (patch: Partial<typeof row>) =>
                  update({ rows: working.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
                return (
                  <tr key={s.bib} className="border-t border-border">
                    <td className="py-1">{s.lane}</td>
                    <td>{s.bib}</td>
                    <td>{s.name}</td>
                    <td>
                      <input
                        inputMode="decimal"
                        pattern="[0-9]+(\.[0-9]{1,2})?"
                        disabled={!editable || row.outcome !== 'OK'}
                        className="w-20 rounded border border-border bg-background px-2 py-1 font-mono"
                        value={row.time}
                        onChange={(e) => set({ time: e.target.value })}
                      />
                    </td>
                    <td>
                      <select
                        disabled={!editable}
                        className="rounded border border-border bg-background px-1 py-1"
                        value={row.outcome}
                        onChange={(e) => set({ outcome: e.target.value as typeof row.outcome })}
                      >
                        {(['OK', 'DNS', 'DNF', 'DQ'] as const).map((o) => (
                          <option key={o} value={o}>
                            {t(`results.outcomes.${o}`)}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {editing === null && step ? (
            <button type="button" className="rounded-lg bg-primary px-3 py-1.5 text-primary-foreground" onClick={advance}>
              {t(`common.${step.action}`)} · {t(`results.${step.role}`)}
            </button>
          ) : null}
          {editing === null && current.status === 'published' ? (
            <button type="button" className="rounded-lg border border-border px-3 py-1.5" onClick={() => setEditing(current.payload)}>
              {t('common.correct')}
            </button>
          ) : null}
        </div>

        {editing !== null ? (
          <div className="mt-4 space-y-2 rounded-lg bg-muted p-3 text-sm">
            <p>{t('results.correctionNote')}</p>
            <input
              aria-label={t('common.reason')}
              className="w-full rounded border border-border bg-background px-2 py-1"
              placeholder={t('results.placeholderReason')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            {reasonError ? <p className="text-xs text-accent">{t('common.reasonRequired')}</p> : null}
            <div className="flex gap-2">
              <button type="button" className="rounded-lg bg-primary px-3 py-1.5 text-primary-foreground" onClick={saveCorrection}>
                {t('common.submit')}
              </button>
              <button type="button" className="rounded-lg border border-border px-3 py-1.5" onClick={() => setEditing(null)}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        ) : null}
        <p className="mt-3 text-xs text-muted-foreground">{t('results.segregationNote')}</p>
      </Card>

      <Card title={t('results.versions')}>
        <ol className="space-y-2 text-sm" data-testid="versions">
          {[...versions].reverse().map((v) => (
            <li key={v.seq} className="border-t border-border pt-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">
                  {t('common.version')} {v.seq}
                </span>
                <Badge tone={v.status === 'published' ? 'good' : v.status === 'superseded' ? 'neutral' : 'warn'}>
                  {t(`results.status.${v.status}`)}
                </Badge>
                <span className="font-mono text-xs">
                  {'home' in v.payload ? `${v.payload.home}–${v.payload.away}` : v.payload.rows.map((r) => (r.outcome === 'OK' ? r.time : r.outcome)).join(' / ')}
                </span>
              </div>
              {v.reason ? (
                <p className="text-xs text-muted-foreground">
                  {t('common.reason')}: {v.reason}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {v.log.map((l) => `${t(`results.status.${l.status}`)} (${t(`results.${l.role}`)})`).join(' → ')}
              </p>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
