import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { setConsoleFunction } from 'three';
import { threeConsole } from './three-console';

// Before any Canvas exists, so its THREE.Clock warns no more (QA-P0-001, three-console.ts).
setConsoleFunction(threeConsole(console));

/**
 * Phase 0 placeholder for the 3D garage: one plain box and two lights.
 *
 * - Loaded only through `React.lazy` in `GarageSlot`, so three.js never reaches the landing page.
 * - `frameloop="demand"` renders a frame only when something changes (here: orbiting), so an
 *   idle preview costs no GPU time.
 * - `dpr={[1, 2]}` caps the pixel ratio at 2 on high-density screens.
 */
export default function Garage() {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ position: [1.8, 1.2, 2.4], fov: 35 }}
      role="img"
      aria-label="3D preview placeholder: a plain box that stands in for the PC. Drag to rotate it."
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 2]} intensity={2} />
      <mesh>
        <boxGeometry args={[0.5, 1, 1]} />
        <meshStandardMaterial />
      </mesh>
      <OrbitControls makeDefault enablePan={false} enableZoom={false} />
    </Canvas>
  );
}
