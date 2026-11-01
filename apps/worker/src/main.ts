// BullMQ workers (imports, notifications, reporting refresh, outbox relay) arrive in M1.
// This placeholder keeps the workspace buildable and documents the queue names from 02-architecture §5.
export const QUEUES = ['imports', 'notifications', 'reporting', 'integration', 'outbox'] as const;

console.log(`[worker] no consumers registered yet; planned queues: ${QUEUES.join(', ')}`);
