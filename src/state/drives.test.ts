import { describe, expect, it } from 'vitest';
import { MAX_PART_ID_LENGTH } from './build-codec';
import { canAddDrive } from './drives';

/** The longest part id the codec takes, made unique by its last characters. */
const longId = (n: number) => `${'a'.repeat(MAX_PART_ID_LENGTH - 4)}-${String(n).padStart(3, '0')}`;

describe('canAddDrive', () => {
  it('allows another drive while one more of the longest ids still fits a link', () => {
    expect(canAddDrive({})).toBe(true);
    const drives = Array.from({ length: 11 }, (_, i) => longId(i));
    // 11 drives of 83 characters each, plus "v1": 915 characters, and a 12th makes 998.
    expect(canAddDrive({ storage: drives })).toBe(true);
    expect(canAddDrive({ storage: [...drives, longId(11)] })).toBe(false);
  });

  it('counts the rest of the build against the same link', () => {
    const drives = Array.from({ length: 11 }, (_, i) => longId(i));
    // The 11 drives fit with one more (998 of 1,024), but not once a CPU takes 83 more.
    expect(canAddDrive({ cpu: longId(99), storage: drives })).toBe(false);
  });
});
