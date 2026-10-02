/**
 * A three.js console function that drops one known message and passes every other one on.
 *
 * Since r183, three.js warns whenever a THREE.Clock is created. @react-three/fiber 9.8.1, its
 * latest release, still creates one in every Canvas store, so each build step logged a warning
 * that Rig Lab cannot fix (QA-P0-001). Dropping exactly that text keeps the console clean, so
 * QA can fail the smoke tests on any other warning.
 *
 * Remove this module once @react-three/fiber ships a release that uses THREE.Timer.
 */
type ThreeConsoleType = 'log' | 'warn' | 'error';

const CLOCK_DEPRECATION =
  'THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.';

/** For three's `setConsoleFunction`: messages go to `sink`, except the Clock deprecation. */
export function threeConsole(sink: Pick<Console, ThreeConsoleType>) {
  return (type: ThreeConsoleType, message: string, ...params: unknown[]): void => {
    if (type === 'warn' && message === CLOCK_DEPRECATION) return;
    sink[type](message, ...params);
  };
}
