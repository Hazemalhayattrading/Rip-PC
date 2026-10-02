/**
 * Motion tokens for code that animates from script: Motion (motion/react) and the 3D scene.
 *
 * These are the --dur-*, --delay-* and --ease-* values of tokens.css in the units scripts use.
 * tokens.test.ts fails if the two ever differ. Direction C, Studio: docs/design/motion.md.
 * Only transform and opacity animate, and numbers swap instead of counting.
 */

/** Durations in milliseconds. */
export const durationMs = {
  /** Hover, pressed states, a pill's highlight. */
  ui: 160,
  /** Crossfades: a callout chip, a compatibility state. */
  fade: 200,
  /** An old value leaving; the step track filling. */
  exit: 240,
  /** A new value arriving; the rail sliding; the callout re-anchoring. */
  value: 360,
  /** The RGB colour changing, in the shader. */
  light: 400,
  /** A part seating in 3D. */
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
 */
export function motionSeconds(name: DurationName, reducedMotion: boolean): number {
  if (reducedMotion && name !== 'cut') return 0;
  return durationMs[name] / 1000;
}

/** A delay in seconds. With reduced motion nothing waits. */
export function delaySeconds(name: DelayName, reducedMotion: boolean): number {
  return reducedMotion ? 0 : delayMs[name] / 1000;
}
