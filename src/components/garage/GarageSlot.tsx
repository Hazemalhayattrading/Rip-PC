import { Component, Suspense, lazy, type ReactNode } from 'react';
import { GARAGE_TEXT } from './garage-text';
import { webGL2Available } from './webgl';

// The only door into src/three. Vite turns this dynamic import into its own chunk, which
// holds three.js, React Three Fiber and drei; nothing else may import them (ESLint enforces it).
const Garage = lazy(() => import('../../three/Garage'));

interface BoundaryState {
  readonly failed: boolean;
}

/** Keeps a 3D failure (chunk load, context loss) inside the preview region. */
class GarageErrorBoundary extends Component<{ readonly children: ReactNode }, BoundaryState> {
  override state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  override render() {
    return this.state.failed ? <p>{GARAGE_TEXT.failed}</p> : this.props.children;
  }
}

/**
 * The 3D preview region. It reserves its box before anything loads, so the page does not
 * shift when the scene arrives. Without WebGL 2 it shows a message and never downloads the
 * 3D chunk.
 */
export function GarageSlot() {
  return (
    <section aria-label={GARAGE_TEXT.region} className="aspect-4/3 w-full max-w-3xl">
      {webGL2Available() ? (
        <GarageErrorBoundary>
          <Suspense fallback={<p>{GARAGE_TEXT.loading}</p>}>
            <Garage />
          </Suspense>
        </GarageErrorBoundary>
      ) : (
        <p>{GARAGE_TEXT.noWebGL}</p>
      )}
    </section>
  );
}
