import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { Queryable } from '../db/db.service.js';

export interface AuditInput {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  data?: Record<string, unknown>;
}

/** Stable JSON (sorted keys) so the hash chain is reproducible. */
export function canonical(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .sort()
    .filter((k) => o[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`)
    .join(',')}}`;
}

export function eventHash(prev: string | null, e: AuditInput, at: string): string {
  return createHash('sha256')
    .update(`${prev ?? ''}|${at}|${canonical({ ...e, data: e.data ?? {} })}`)
    .digest('hex');
}

/**
 * Appends to audit.event inside the caller's transaction (so the record and its audit commit together).
 * An advisory lock serialises writers so the hash chain never forks.
 */
@Injectable()
export class AuditService {
  async record(tx: Queryable, e: AuditInput): Promise<void> {
    await tx.query('SELECT pg_advisory_xact_lock(727002)');
    const last = await tx.query<{ hash: string }>('SELECT hash FROM audit.event ORDER BY id DESC LIMIT 1');
    const prev = last.rows[0]?.hash ?? null;
    const at = new Date().toISOString();
    await tx.query(
      `INSERT INTO audit.event(at, actor_id, action, entity_type, entity_id, data, prev_hash, hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [at, e.actorId, e.action, e.entityType, e.entityId, JSON.stringify(e.data ?? {}), prev, eventHash(prev, e, at)],
    );
  }

  /** Recomputes the chain; returns the id of the first broken event, or null if intact. */
  async verify(db: Queryable): Promise<number | null> {
    const r = await db.query<{
      id: string;
      at: Date;
      actor_id: string | null;
      action: string;
      entity_type: string;
      entity_id: string;
      data: Record<string, unknown>;
      prev_hash: string | null;
      hash: string;
    }>('SELECT * FROM audit.event ORDER BY id');
    let prev: string | null = null;
    for (const row of r.rows) {
      const h = eventHash(
        prev,
        { actorId: row.actor_id, action: row.action, entityType: row.entity_type, entityId: row.entity_id, data: row.data },
        new Date(row.at).toISOString(),
      );
      if (row.prev_hash !== prev || row.hash !== h) return Number(row.id);
      prev = row.hash;
    }
    return null;
  }
}
