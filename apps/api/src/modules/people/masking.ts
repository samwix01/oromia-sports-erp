/** Field masking for people without people.read_sensitive in scope (04-security §3). */
export function maskPhone(p: string | null): string | null {
  if (!p) return p;
  const digits = p.replace(/\D/g, '');
  return digits.length <= 3 ? '***' : `${p.startsWith('+') ? '+' : ''}${'*'.repeat(Math.max(0, digits.length - 3))}${digits.slice(-3)}`;
}

export function maskEmail(e: string | null): string | null {
  if (!e) return e;
  const [user, domain] = e.split('@');
  if (!user || !domain) return '***';
  return `${user[0]}***@${domain}`;
}

/** Year only. */
export function maskDob(d: string | Date | null): string | null {
  if (!d) return null;
  const iso = typeof d === 'string' ? d : d.toISOString();
  return iso.slice(0, 4);
}

/** Score in [0,1] from name similarity, date of birth and phone (all signals kept for the reviewer). */
export function duplicateScore(s: { nameSimilarity: number; dobMatch: 'same' | 'near' | 'different' | 'unknown'; phoneMatch: boolean }): number {
  const dob = s.dobMatch === 'same' ? 1 : s.dobMatch === 'near' ? 0.5 : 0;
  return Math.round((0.6 * s.nameSimilarity + 0.25 * dob + 0.15 * (s.phoneMatch ? 1 : 0)) * 1000) / 1000;
}

export const DUPLICATE_THRESHOLD = 0.6;
