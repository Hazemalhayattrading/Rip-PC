import { Clock, setConsoleFunction, warn } from 'three';
import { describe, expect, it } from 'vitest';
import { threeConsole } from './three-console';

type Call = [type: 'log' | 'warn' | 'error', message: string, ...params: unknown[]];

/** A console that records what reaches it. */
function recordingConsole() {
  const calls: Call[] = [];
  const sink = {
    log: (message: string, ...params: unknown[]) => calls.push(['log', message, ...params]),
    warn: (message: string, ...params: unknown[]) => calls.push(['warn', message, ...params]),
    error: (message: string, ...params: unknown[]) => calls.push(['error', message, ...params]),
  };
  return { calls, sink };
}

// The exact text three r186 logs when anything creates a THREE.Clock (QA-P0-001).
const CLOCK_WARNING =
  'THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.';

describe('threeConsole', () => {
  it('drops the THREE.Clock deprecation warning', () => {
    const { calls, sink } = recordingConsole();
    threeConsole(sink)('warn', CLOCK_WARNING);
    expect(calls).toEqual([]);
  });

  it.each(['log', 'error'] as const)('passes the same text through as a %s', (type) => {
    const { calls, sink } = recordingConsole();
    threeConsole(sink)(type, CLOCK_WARNING);
    expect(calls).toEqual([[type, CLOCK_WARNING]]);
  });

  it('passes a warning that only contains the Clock text', () => {
    const { calls, sink } = recordingConsole();
    threeConsole(sink)('warn', `${CLOCK_WARNING} Seen twice.`);
    expect(calls).toEqual([['warn', `${CLOCK_WARNING} Seen twice.`]]);
  });

  it('passes every other message with all its parameters, in order', () => {
    const { calls, sink } = recordingConsole();
    const log = threeConsole(sink);
    const detail = { shader: 'fragment' };
    log('error', 'THREE.WebGLProgram: Shader Error 1282', detail, 7);
    log('warn', 'THREE.WebGLRenderer: Texture marked for update but no image data found.');
    log('log', 'THREE.WebGLRenderer: Context Lost.');
    expect(calls).toEqual([
      ['error', 'THREE.WebGLProgram: Shader Error 1282', detail, 7],
      ['warn', 'THREE.WebGLRenderer: Texture marked for update but no image data found.'],
      ['log', 'THREE.WebGLRenderer: Context Lost.'],
    ]);
  });
});

describe('threeConsole installed in three itself', () => {
  it('silences a new Clock and keeps every other three.js warning', () => {
    const { calls, sink } = recordingConsole();
    setConsoleFunction(threeConsole(sink));
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- creating a Clock is what warns
    new Clock();
    warn('Probe: still visible', 42);
    expect(calls).toEqual([['warn', 'THREE.Probe: still visible', 42]]);
  });
});
