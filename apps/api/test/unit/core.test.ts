import { describe, expect, it } from 'vitest';
import { canonical, eventHash } from '../../src/core/audit.service.js';
import { hashPassword, passwordProblems, verifyPassword } from '../../src/core/password.js';
import { can, canGrant, type Assignment } from '../../src/core/permissions.js';
import { base32Decode, base32Encode, hotp, totp, verifyTotp } from '../../src/core/totp.js';
import { duplicateScore, maskDob, maskEmail, maskPhone } from '../../src/modules/people/masking.js';

const A = (p: Partial<Assignment> & Pick<Assignment, 'roleKey'>): Assignment => ({ id: 'x', orgId: null, sportCode: null, territoryId: null, ...p });

describe('permissions (rule 7: least privilege by org × sport × territory)', () => {
  const footballRegistrar = A({ roleKey: 'fed.registrar', orgId: 'fed-fb', sportCode: 'football' });

  it('grants within scope, denies outside', () => {
    expect(can([footballRegistrar], 'people.affiliation.approve', { orgChain: ['club-a', 'fed-fb', 'bureau'], sportCode: 'football' })).toBe(true);
    expect(can([footballRegistrar], 'people.affiliation.approve', { orgChain: ['club-b', 'fed-at', 'bureau'], sportCode: 'athletics' })).toBe(false);
    expect(can([footballRegistrar], 'people.affiliation.approve', { orgChain: ['club-a', 'fed-fb'], sportCode: 'athletics' })).toBe(false);
  });

  it('platform admin has no personal-data access', () => {
    expect(can([A({ roleKey: 'platform.admin' })], 'people.read', {})).toBe(false);
  });

  it('territory scope follows the territory chain', () => {
    const coord = A({ roleKey: 'territory.coordinator', territoryId: 'zone-a' });
    expect(can([coord], 'reporting.read', { territoryChain: ['woreda-1', 'zone-a', 'region'] })).toBe(true);
    expect(can([coord], 'reporting.read', { territoryChain: ['zone-b', 'region'] })).toBe(false);
  });

  it('grantors can only grant allowed roles inside their scope', () => {
    const sec = A({ roleKey: 'fed.secretariat', orgId: 'fed-fb', sportCode: 'football' });
    expect(canGrant([sec], 'club.admin', { orgChain: ['club-e', 'fed-fb'], sportCode: 'football' })).toBe(true);
    expect(canGrant([sec], 'platform.admin', { orgChain: ['fed-fb'], sportCode: 'football' })).toBe(false);
    expect(canGrant([sec], 'club.admin', { orgChain: ['club-b', 'fed-at'], sportCode: 'athletics' })).toBe(false);
  });
});

describe('TOTP (RFC 6238 / 4226 vectors)', () => {
  const secret = Buffer.from('12345678901234567890');
  it('HOTP matches RFC 4226 appendix D', () => {
    expect(['755224', '287082', '359152', '969429', '338314'].map((_, i) => hotp(secret, i))).toEqual(['755224', '287082', '359152', '969429', '338314']);
  });
  it('TOTP matches RFC 6238 (6 digits) at T=59 and verifies with drift', () => {
    const b32 = base32Encode(secret);
    expect(base32Decode(b32).equals(secret)).toBe(true);
    expect(totp(b32, 59_000)).toBe('287082');
    expect(verifyTotp(b32, '287082', 59_000 + 30_000)).toBe(true);
    expect(verifyTotp(b32, '287082', 59_000 + 120_000)).toBe(false);
  });
});

describe('passwords', () => {
  it('hashes and verifies with scrypt', async () => {
    const h = await hashPassword('Demo-password-123');
    expect(h.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword('Demo-password-123', h)).toBe(true);
    expect(await verifyPassword('wrong-password-123', h)).toBe(false);
  });
  it('enforces the minimum policy', () => {
    expect(passwordProblems('short1')).toContain('min_length_12');
    expect(passwordProblems('longbutnodigits')).toContain('letters_and_digits');
    expect(passwordProblems('long-enough-123')).toEqual([]);
  });
});

describe('masking and duplicate score', () => {
  it('masks contact data and date of birth', () => {
    expect(maskPhone('+251911234567')).toBe('+*********567');
    expect(maskEmail('demo.user@example.test')).toBe('d***@example.test');
    expect(maskDob('2008-03-14')).toBe('2008');
  });
  it('weights name, date of birth and phone', () => {
    expect(duplicateScore({ nameSimilarity: 1, dobMatch: 'same', phoneMatch: true })).toBe(1);
    expect(duplicateScore({ nameSimilarity: 0.5, dobMatch: 'unknown', phoneMatch: false })).toBe(0.3);
  });
});

describe('audit hash chain', () => {
  it('is stable for key order and changes with content', () => {
    expect(canonical({ b: 1, a: [2, { d: 3, c: 4 }] })).toBe('{"a":[2,{"c":4,"d":3}],"b":1}');
    const e = { actorId: 'u', action: 'x', entityType: 't', entityId: '1', data: { a: 1 } };
    const h1 = eventHash(null, e, '2026-01-01T00:00:00.000Z');
    expect(eventHash(null, { ...e }, '2026-01-01T00:00:00.000Z')).toBe(h1);
    expect(eventHash(h1, e, '2026-01-01T00:00:00.000Z')).not.toBe(h1);
  });
});
