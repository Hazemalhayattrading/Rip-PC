import { describe, expect, it } from 'vitest';
import { canUseWebGL2 } from './webgl';

describe('canUseWebGL2', () => {
  it('is true when the canvas returns a WebGL 2 context', () => {
    expect(canUseWebGL2(() => ({ getContext: () => ({}) }))).toBe(true);
  });

  it('is false when the canvas returns no context', () => {
    expect(canUseWebGL2(() => ({ getContext: () => null }))).toBe(false);
  });

  it('is false when asking for a context throws', () => {
    expect(
      canUseWebGL2(() => ({
        getContext: () => {
          throw new Error('blocked by policy');
        },
      })),
    ).toBe(false);
  });

  it('asks for webgl2 specifically', () => {
    const asked: string[] = [];
    canUseWebGL2(() => ({
      getContext: (kind: string) => {
        asked.push(kind);
        return null;
      },
    }));
    expect(asked).toEqual(['webgl2']);
  });
});
