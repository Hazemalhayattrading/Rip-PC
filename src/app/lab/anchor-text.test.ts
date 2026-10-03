import { describe, expect, it } from 'vitest';
import { rayTracingWords, resolutionName, upscalingWords } from './anchor-text';

describe('resolutionName', () => {
  it('names a resolution the way the copy guide does, never as pixels', () => {
    expect(resolutionName('1920x1080')).toBe('1080p');
    expect(resolutionName('2560x1440')).toBe('1440p');
    expect(resolutionName('3840x2160')).toBe('4K');
    expect(resolutionName('3440x1440')).toBe('1440p ultrawide');
  });
});

describe('rayTracingWords', () => {
  it('reads "ray tracing off", "ray tracing on" or "path tracing" (copy guide §10)', () => {
    expect(rayTracingWords('off')).toBe('ray tracing off');
    expect(rayTracingWords('on')).toBe('ray tracing on');
    expect(rayTracingWords('path-tracing')).toBe('path tracing');
  });
});

describe('upscalingWords', () => {
  it('says "no upscaling" for native, and names an upscaler with its mode and version', () => {
    expect(upscalingWords({ method: 'native', mode: null, version: null })).toBe('no upscaling');
    expect(upscalingWords({ method: 'DLSS', mode: 'Quality', version: 'DLSS 4' })).toBe(
      'DLSS Quality (DLSS 4)',
    );
    expect(upscalingWords({ method: 'XeSS', mode: 'Ultra Quality', version: null })).toBe(
      'XeSS Ultra Quality',
    );
    expect(upscalingWords({ method: 'TSR', mode: null, version: null })).toBe('TSR');
  });
});
