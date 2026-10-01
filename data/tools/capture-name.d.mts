/** Types for capture-name.mjs. Arguments are plain strings: the functions check them and throw. */
export function captureStem(
  kind: string,
  market: string,
  partId: string,
  retailer: string,
  date: string,
): string;
export function freeCaptureBase(stem: string, exists?: (path: string) => boolean): string;
