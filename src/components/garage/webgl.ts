/** Something that can be asked for a WebGL 2 context, such as a canvas element. */
export interface ContextSource {
  getContext(contextId: 'webgl2'): unknown;
}

/**
 * Whether the browser can create a WebGL 2 context. three.js renders only with WebGL 2
 * (since r163), so without it the 3D preview is replaced by a message.
 */
export function canUseWebGL2(
  createCanvas: () => ContextSource = () => document.createElement('canvas'),
): boolean {
  try {
    return createCanvas().getContext('webgl2') !== null;
  } catch {
    return false;
  }
}

let cached: boolean | undefined;

/** `canUseWebGL2`, probed once per page load; the throwaway canvas is garbage-collected. */
export function webGL2Available(): boolean {
  cached ??= canUseWebGL2();
  return cached;
}
