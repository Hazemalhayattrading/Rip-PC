/**
 * An anchor's test setting in words (copy guide §3 and §10): resolutions by name, ray tracing
 * and upscaling as the readout's conditions say them. Pure.
 */
import type { GameBenchmark, Resolution, Upscaling } from '../../data/schema';

const RESOLUTIONS: Readonly<Record<Resolution, string>> = {
  '1920x1080': '1080p',
  '2560x1440': '1440p',
  '3840x2160': '4K',
  '3440x1440': '1440p ultrawide',
};

/** "1080p", "1440p", "4K": never "2560x1440". */
export function resolutionName(resolution: Resolution): string {
  return RESOLUTIONS[resolution];
}

/** "ray tracing off", "ray tracing on" or "path tracing". */
export function rayTracingWords(mode: GameBenchmark['rayTracing']): string {
  switch (mode) {
    case 'off':
      return 'ray tracing off';
    case 'on':
      return 'ray tracing on';
    case 'path-tracing':
      return 'path tracing';
  }
}

/** "no upscaling", or the upscaler with its mode and version as published: "DLSS Quality (DLSS 4)". */
export function upscalingWords(upscaling: Upscaling): string {
  if (upscaling.method === 'native') return 'no upscaling';
  const name = upscaling.mode === null ? upscaling.method : `${upscaling.method} ${upscaling.mode}`;
  return upscaling.version === null ? name : `${name} (${upscaling.version})`;
}
