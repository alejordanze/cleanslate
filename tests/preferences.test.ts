import { describe, expect, it, vi } from 'vitest';

import { clearLegacyOutputMode, readLegacyOutputMode } from '../src/renderer/src/preferences';

describe('legacy output preference', () => {
  it('reads only an explicitly remembered choice', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => { values.delete(key); }
    };

    expect(readLegacyOutputMode(storage)).toBeNull();
    values.set('cleanslate.output-mode', 'replace');
    expect(readLegacyOutputMode(storage)).toBe('replace');
    clearLegacyOutputMode(storage);
    expect(readLegacyOutputMode(storage)).toBeNull();
  });

  it('ignores invalid or inaccessible old storage', () => {
    expect(readLegacyOutputMode({ getItem: () => 'unexpected' })).toBeNull();
    expect(readLegacyOutputMode({ getItem: () => { throw new Error('unavailable'); } })).toBeNull();
    const removeItem = vi.fn(() => { throw new Error('unavailable'); });
    expect(() => clearLegacyOutputMode({ removeItem })).not.toThrow();
  });
});
