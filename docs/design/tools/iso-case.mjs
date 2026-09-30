// Generates the "3D view placeholder" drawing used by the three WP-DS0 mocks.
// One geometry (a generic mid-tower at real millimetre dimensions, not any real product),
// projected obliquely so the glass side reads broadly. Output is SVG markup with semantic
// classes (material + face), so each direction styles the same drawing its own way in CSS.
//
//   node docs/design/tools/iso-case.mjs <variant> > out.svg.html
//   variant: bench | folio | studio
//
// Units: millimetres. Axes: x = width (glass side -> far side), y = height, z = depth (front -> back).

const variant = process.argv[2] || 'bench';

const V = {
  // screen vectors per mm for x, y, z; scale; padding
  bench: { ex: [-0.30, -0.25], ey: [0, -1], ez: [0.94, -0.16], s: 0.78, pad: 34 },
  folio: { ex: [-0.34, -0.28], ey: [0, -1], ez: [0.92, -0.20], s: 0.86, pad: 26 },
  studio: { ex: [-0.40, -0.22], ey: [0, -1], ez: [0.90, -0.12], s: 1.12, pad: 20 },
}[variant];

const W = 215, H = 469, D = 447; // generic mid-tower, mm

function P(x, y, z) {
  return [x * V.ex[0] + y * V.ey[0] + z * V.ez[0], x * V.ex[1] + y * V.ey[1] + z * V.ez[1]].map((v) => v * V.s);
}
const r1 = (n) => Math.round(n * 10) / 10;
const poly = (pts) => 'M' + pts.map((p) => r1(p[0]) + ' ' + r1(p[1])).join('L') + 'Z';
const line = (a, b) => `M${r1(a[0])} ${r1(a[1])}L${r1(b[0])} ${r1(b[1])}`;

// Visible faces of an axis-aligned box for this camera: x-min (side), y-max (top), z-min (front).
function box(x0, x1, y0, y1, z0, z1) {
  return {
    side: [P(x0, y0, z0), P(x0, y0, z1), P(x0, y1, z1), P(x0, y1, z0)],
    top: [P(x0, y1, z0), P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0)],
    front: [P(x0, y0, z0), P(x0, y1, z0), P(x1, y1, z0), P(x1, y0, z0)],
  };
}
function circleOnX(x, yc, zc, r, n = 48) { // circle in a plane x = const
  const pts = []; for (let i = 0; i < n; i++) { const t = (i / n) * 2 * Math.PI; pts.push(P(x, yc + r * Math.sin(t), zc + r * Math.cos(t))); } return pts;
}
function circleOnZ(z, xc, yc, r, n = 48) { // circle in a plane z = const
  const pts = []; for (let i = 0; i < n; i++) { const t = (i / n) * 2 * Math.PI; pts.push(P(xc + r * Math.cos(t), yc + r * Math.sin(t), z)); } return pts;
}

const out = [];
const add = (cls, d, extra = '') => out.push(`<path class="${cls}" d="${d}"${extra}/>`);
function drawBox(mat, b, faces = ['side', 'top', 'front']) { for (const f of faces) add(`${mat} f-${f}`, poly(b[f])); }

// ---- geometry -------------------------------------------------------------------------
const boardX = W - 22; // motherboard plane (far side), components grow toward x = 0 (glass)
const cpu = { y: 369, z: 337 };

// Interior back wall and floor visible through the glass
add('m-cavity f-side', poly([P(W - 12, 104, 10), P(W - 12, 104, D - 10), P(W - 12, H - 12, D - 10), P(W - 12, H - 12, 10)]));
// Motherboard
const mb = box(boardX, boardX + 2, 139, 444, 183, 427);
drawBox('m-board', mb, ['side']);
// Board details on its face (x = boardX): VRM heatsinks, chipset, M.2 cover, PCIe slots
const face = (y0, y1, z0, z1) => poly([P(boardX, y0, z0), P(boardX, y0, z1), P(boardX, y1, z1), P(boardX, y1, z0)]);
add('m-board-detail', face(398, 432, 300, 420)); // top VRM
add('m-board-detail', face(300, 395, 392, 420)); // side VRM
add('m-board-detail', face(160, 205, 300, 360)); // chipset
add('m-board-detail', face(214, 226, 200, 400)); // M.2 cover
add('m-slot', face(292, 297, 205, 400));
add('m-slot', face(196, 200, 205, 400));
add('m-socket', face(cpu.y - 22, cpu.y + 22, cpu.z - 22, cpu.z + 22));
// Rear fan (behind cooler)
drawBox('m-fan', box(47, 167, 324, 444, D - 30, D - 6), ['side', 'top']);
// RAM sticks
for (const z0 of [236, 249]) drawBox('m-ram', box(boardX - 42, boardX, 300, 433, z0, z0 + 7));
for (const z0 of [236, 249]) add('m-rgb', poly(box(boardX - 42, boardX - 36, 300, 433, z0, z0 + 7).side));
// GPU (2.5 slot, 304 mm)
const gpu = box(62, boardX - 6, 230, 282, 123, 427);
drawBox('m-gpu', gpu);
add('m-gpu-accent', poly([P(62, 262, 140), P(62, 262, 410), P(62, 266, 410), P(62, 266, 140)]));
// Cooler: fin stack + fan on its front
const tower = box(38, boardX - 8, 307, 431, 283, 393);
drawBox('m-cooler', tower);
const fins = [];
for (let y = 314; y < 428; y += 6) fins.push(line(P(38, y, 285), P(38, y, 391)));
add('m-fins', fins.join(''));
const cfan = box(38, boardX - 8, 307, 431, 258, 283);
drawBox('m-fan', cfan);
add('m-fan-ring', poly(circleOnZ(258, (38 + boardX - 8) / 2, 369, 56)));
// Front intake fans (behind the front panel, seen edge-on through the glass)
drawBox('m-fan', box(37, 177, 135, 275, 10, 35), ['side']);
drawBox('m-fan', box(37, 177, 285, 425, 10, 35), ['side']);
// PSU shroud
const shroud = box(0, W, 0, 104, 0, D);
drawBox('m-shroud', shroud, ['side', 'top']);
add('m-vent', [0, 1, 2, 3, 4, 5].map((i) => line(P(0, 30 + i * 9, 300), P(0, 30 + i * 9, 420))).join(''));
// Case shell: top and front are opaque; the glass side is a tint drawn last
const shellTop = box(0, W, H - 12, H, 0, D);
add('m-case f-top', poly(shellTop.top));
const front = box(0, W, 0, H, 0, 12);
add('m-case f-front', poly(front.front));
add('m-case f-side', poly([P(0, 0, 0), P(0, 0, 12), P(0, H, 12), P(0, H, 0)]));
// front mesh + visible fan rings behind the mesh
const mesh = [];
for (let x = 18; x < W - 12; x += 9) mesh.push(line(P(x, 16, 0), P(x, H - 18, 0)));
add('m-mesh', mesh.join(''));
add('m-fan-ring m-rgb-ring', poly(circleOnZ(0, W / 2, 205, 62)));
add('m-fan-ring m-rgb-ring', poly(circleOnZ(0, W / 2, 355, 62)));
// top vents
const vents = [];
for (let z = 40; z < D - 30; z += 12) vents.push(line(P(20, H, z), P(W - 20, H, z)));
add('m-mesh', vents.join(''));
// rear and bottom frame of the side (the glass sits in a frame)
add('m-case f-side', poly([P(0, 0, 12), P(0, 0, D), P(0, 14, D), P(0, 14, 12)]));
add('m-case f-side', poly([P(0, H - 12, 12), P(0, H - 12, D), P(0, H, D), P(0, H, 12)]));
add('m-case f-side', poly([P(0, 14, D - 12), P(0, 14, D), P(0, H - 12, D), P(0, H - 12, D - 12)]));
// glass
const glass = [P(0, 104, 12), P(0, 104, D - 12), P(0, H - 12, D - 12), P(0, H - 12, 12)];
add('m-glass', poly(glass));
add('m-glare', line(P(0, H - 40, 40), P(0, 140, 170)) + line(P(0, H - 30, 90), P(0, 200, 240)));
// feet (two visible on the glass side)
for (const z of [22, D - 62]) drawBox('m-case', box(8, 40, -9, 0, z, z + 40), ['side', 'front']);

// ---- annotations ----------------------------------------------------------------------
const cpuPt = P(boardX, cpu.y, cpu.z);
const coolerTip = P(38, 431, 338);
const ann = [];
if (variant === 'bench') {
  // GPU length along its underside, with end ticks (the label is laid out in HTML beside the drawing)
  const yDim = 220;
  const a = P(0, yDim, 123), b = P(0, yDim, 427);
  const tick = (p) => line([p[0], p[1] - 5], [p[0], p[1] + 5]);
  ann.push(`<path class="dim" d="${line(a, b)}${tick(a)}${tick(b)}"/>`);
  // Cooler height: from the board plane to the fin tip, drawn along x above the tower
  const c0 = P(38, 440, 300), c1 = P(boardX - 8, 440, 300);
  ann.push(`<path class="dim" d="${line(c0, c1)}${tick(c0)}${tick(c1)}"/>`);
  // Focus marker on the CPU socket (the part being chosen)
  ann.push(`<circle class="focus-ring" cx="${r1(cpuPt[0] - 20)}" cy="${r1(cpuPt[1] + 4)}" r="${r1(40 * V.s)}"/>`);
}
if (variant === 'studio') {
  const tip = [cpuPt[0] + 6, cpuPt[1] - 4];
  ann.push(`<circle class="focus-dot" cx="${r1(tip[0])}" cy="${r1(tip[1])}" r="4"/>`);
  ann.push(`<circle class="focus-halo" cx="${r1(tip[0])}" cy="${r1(tip[1])}" r="${r1(40 * V.s)}"/>`);
}

// ---- bounds ---------------------------------------------------------------------------
const allPts = [];
for (const m of out.join(' ').matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)) allPts.push([+m[1], +m[2]]);
const xs = allPts.map((p) => p[0]), ys = allPts.map((p) => p[1]);
const minX = Math.min(...xs) - V.pad, minY = Math.min(...ys) - V.pad;
const w = Math.max(...xs) - minX + V.pad, h = Math.max(...ys) - minY + V.pad;
const meta = { cpu: cpuPt, coolerTip, viewBox: [r1(minX), r1(minY), r1(w), r1(h)] };

process.stdout.write(
  `<svg class="case case-${variant}" data-units-per-mm="${V.s}" viewBox="${r1(minX)} ${r1(minY)} ${r1(w)} ${r1(h)}" role="img" aria-label="3D view placeholder: a generic mid-tower case with the parts chosen so far">` +
  `<g class="geo">${out.join('')}</g><g class="ann">${ann.join('')}</g></svg>\n` +
  `<!-- meta ${JSON.stringify(meta)} -->\n`
);
