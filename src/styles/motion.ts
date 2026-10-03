/**
 * Motion tokens for code that animates from script: Motion (motion/react) and the 3D scene.
 *
 * These are the --dur-*, --delay-* and --ease-* values of tokens.css in the units scripts use.
 * tokens.test.ts fails if the two ever differ, and motion.types.test.ts if Motion's own types stop
 * taking them. Direction C, Studio, and its rules for Phase 2: docs/design/motion.md.
 * Only transform and opacity animate, and numbers swap instead of counting.
 */

/** Durations in milliseconds. */
export const durationMs = {
  /** A hover overlay's fade, the pressed scale, a chevron's turn. */
  ui: 160,
  /** Crossfades: a callout chip, a compatibility state. */
  fade: 200,
  /** An old value leaving; the step track filling. */
  exit: 240,
  /** A new value arriving; the rail sliding; the callout re-anchoring. */
  value: 360,
  /** The RGB colour changing, in the shader. */
  light: 400,
  /** A part seating in 3D; the fans spinning up or down. */
  seat: 500,
  /** The camera moving to the next part. */
  camera: 700,
  /** Reduced motion only: the crossfade that replaces a camera move. */
  cut: 200,
} as const;

/** Delays in milliseconds. */
export const delayMs = {
  /** The new value starts after the old one begins to leave. */
  value: 40,
} as const;

type CubicBezier = readonly [number, number, number, number];

/** Cubic Bézier control points, in the array form Motion accepts as `ease`. */
export const easing = {
  /** UI: quick start, soft stop, no overshoot. */
  settle: [0.2, 0.8, 0.2, 1],
  /** The camera: eases in and out. */
  dolly: [0.65, 0, 0.35, 1],
} as const satisfies Record<string, CubicBezier>;

export type DurationName = keyof typeof durationMs;
export type DelayName = keyof typeof delayMs;

/**
 * A duration in seconds, Motion's unit. With reduced motion every movement is instant, except
 * `cut`, the short crossfade that stands in for a camera move.
 *
 * Pass `useReducedMotion()` from motion/react as it is. It is `null` only where there is no
 * window (a server render, a Node test), and `null` counts as no preference, as it does in Motion.
 */
export function motionSeconds(name: DurationName, reducedMotion: boolean | null): number {
  if (reducedMotion === true && name !== 'cut') return 0;
  return durationMs[name] / 1000;
}

/** A delay in seconds. With reduced motion nothing waits. `null` counts as no preference. */
export function delaySeconds(name: DelayName, reducedMotion: boolean | null): number {
  return reducedMotion === true ? 0 : delayMs[name] / 1000;
}
