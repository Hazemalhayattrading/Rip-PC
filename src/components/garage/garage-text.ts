/** What the 3D preview region says when it is not showing the 3D scene. */
export const GARAGE_TEXT = {
  region: '3D preview',
  loading: 'Loading the 3D preview…',
  noWebGL:
    'The 3D preview needs WebGL 2, which this browser has turned off or does not support. Everything else on the page works without it.',
  failed: 'The 3D preview could not start. Everything else on the page works without it.',
} as const;
