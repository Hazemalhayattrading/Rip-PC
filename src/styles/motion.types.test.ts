/**
 * motion.ts against Motion's own types and its easing mapping (docs/design/motion.md, "Studio:
 * rules for Phase 2", section 4). A Motion upgrade that stops taking the tokens fails here, not in
 * the UI.
 *
 * The expectTypeOf assertions are checked at compile time only. Vitest's typecheck mode is off
 * (vitest.config.ts sets no `typecheck`), so they do nothing when the tests run; `tsc -b`
 * (npm run typecheck, part of verify) checks this file through tsconfig.node.json, which includes
 * src/**\/*.test.ts. The other tests run in Vitest against Motion's runtime.
 */
import { readFileSync } from 'node:fs';
import {
  isBezierDefinition,
  mapEasingToNativeEasing,
  type BezierDefinition,
  type MotionConfigProps,
  type Transition,
  type useReducedMotion,
} from 'motion/react';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { delaySeconds, easing, motionSeconds } from './motion';

const tokensCss = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');

/** Every easing motion.ts exports, so an easing added later is checked too. */
type StudioEasing = (typeof easing)[keyof typeof easing];

/** The value of a custom property in tokens.css, for example `--ease-settle`. */
function cssValue(property: string): string | undefined {
  return new RegExp(`${property}:\\s*([^;]+);`).exec(tokensCss)?.[1]?.trim();
}

describe("motion.ts satisfies Motion's types (checked by tsc -b)", () => {
  it('gives every easing as a BezierDefinition, which Transition takes as ease', () => {
    expectTypeOf<StudioEasing>().toExtend<BezierDefinition>();
    expectTypeOf<StudioEasing>().toExtend<NonNullable<Transition['ease']>>();
  });

  it('builds a Transition from the tokens: the value roll and the root default', () => {
    const roll = {
      duration: motionSeconds('value', false),
      delay: delaySeconds('value', false),
      ease: easing.settle,
    } satisfies Transition;
    const rootDefault = {
      duration: motionSeconds('ui', null),
      ease: easing.settle,
    } satisfies NonNullable<MotionConfigProps['transition']>;
    expectTypeOf(roll).toExtend<Transition>();
    expect(roll).toEqual({ duration: 0.36, delay: 0.04, ease: [0.2, 0.8, 0.2, 1] });
    expect(rootDefault).toEqual({ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] });
  });

  it('takes useReducedMotion() as it is: boolean, or null without a window', () => {
    expectTypeOf<ReturnType<typeof useReducedMotion>>().toExtend<
      Parameters<typeof motionSeconds>[1]
    >();
    expectTypeOf<ReturnType<typeof useReducedMotion>>().toExtend<
      Parameters<typeof delaySeconds>[1]
    >();
  });

  it('wraps the app in MotionConfig with reducedMotion "user"', () => {
    expectTypeOf<'user'>().toExtend<NonNullable<MotionConfigProps['reducedMotion']>>();
  });
});

describe('Motion reads the easings as the CSS tokens do', () => {
  it.each(Object.entries(easing))('hands the browser %s as its --ease token', (name, points) => {
    expect(points).toHaveLength(4);
    expect(isBezierDefinition(points)).toBe(true);
    // The string Motion gives the Web Animations API, so the compositor runs the same curve as CSS.
    expect(mapEasingToNativeEasing(points, 1)).toBe(cssValue(`--ease-${name}`));
  });

  it.each(Object.entries(easing))(
    'keeps %s in the CSS range, with no overshoot',
    (_name, points) => {
      const [x1, y1, x2, y2] = points;
      // CSS and WAAPI reject a cubic-bezier() whose x points leave 0 to 1. With both y points
      // in 0 to 1 too, the curve never leaves 0 to 1: nothing overshoots its target.
      for (const point of [x1, y1, x2, y2]) {
        expect(point).toBeGreaterThanOrEqual(0);
        expect(point).toBeLessThanOrEqual(1);
      }
    },
  );

  it('counts null from useReducedMotion as no preference, as Motion does', () => {
    expect(motionSeconds('value', null)).toBe(0.36);
    expect(motionSeconds('cut', null)).toBe(0.2);
    expect(delaySeconds('value', null)).toBe(0.04);
  });
});
