/**
 * The field label map (lab-spec §5): what every catalogue field path is called in the lab.
 *
 * - `fieldLabel` gives a spec its full name, "{part role}: {spec}", as the evidence list shows
 *   it: "Graphics card: length", "Case: graphics card limit". The specs the compatibility rules
 *   read have explicit labels, in the words of the lab spec, its mock and the copy guide; every
 *   other field reads from its own name.
 * - `nodeLabel` names one level of a path, for the parts table, which indents nested fields
 *   under their parent: "Memory", then "Speeds", then "1", then "Speed".
 *
 * A row of a list is numbered from 1. design-lead reviews every label here with the engine's
 * strings (copy guide §13). Pure, so Phase 2 reuses it unchanged.
 */
import type { SpecCategory } from '../../data/schema';

/** The part role that opens a label (copy guide §5: "graphics card", "drive", "power supply"). */
export const PART_ROLES: Readonly<Record<SpecCategory, string>> = {
  cpu: 'CPU',
  motherboard: 'Motherboard',
  ram: 'Memory',
  'gpu-chip': 'GPU chip',
  'gpu-card': 'Graphics card',
  storage: 'Drive',
  psu: 'Power supply',
  cooler: 'Cooler',
  case: 'Case',
  'case-fan': 'Case fan',
};

/**
 * The specs the compatibility rules read (plan §3, copy guide §7), by path, with `*` for any row
 * of a list. The label is what follows the part role.
 */
const FIELD_LABELS: Readonly<Record<SpecCategory, Readonly<Record<string, string>>>> = {
  cpu: {
    socket: 'socket',
    'memory.types': 'memory types',
    'memory.speeds.*.speedMtps': 'official memory speed',
    igpu: 'integrated graphics',
    'igpu.model': 'integrated graphics',
    'power.tdpW': 'TDP',
    'power.pptW': 'PPT',
    'power.processorBasePowerW': 'base power',
    'power.maxTurboPowerW': 'maximum turbo power',
  },
  motherboard: {
    socket: 'socket',
    chipset: 'chipset',
    formFactor: 'form factor',
    'biosSupport.cpus.*.listing': 'CPU support list',
    'biosSupport.cpus.*.asListed': 'CPU support list entry',
    'biosSupport.cpus.*.minBiosVersion': 'BIOS for this CPU',
    'biosSupport.families.*.minBiosVersion': 'BIOS for this CPU family',
    'biosFlashback.supported': 'BIOS FlashBack',
    'biosFlashback.name': 'BIOS FlashBack name',
    'memory.type': 'memory type',
    'memory.slots': 'memory slots',
    'memory.maxSpeedMtps': 'maximum memory speed',
    'm2Slots.*.label': 'M.2 slot',
    'headers.usbCFront': 'USB-C headers',
    'headers.usbCFront.*.speedGbps': 'USB-C header speed',
  },
  ram: {
    type: 'memory type',
    speedMtps: 'rated speed',
    moduleCount: 'modules',
    heightMm: 'height',
    'profiles.xmp': 'overclock profile',
    'profiles.expo': 'EXPO profile',
  },
  'gpu-chip': {
    'vram.sizeGb': 'VRAM',
    referenceTbpW: 'reference board power (TBP)',
    referencePsuW: 'reference power supply',
  },
  'gpu-card': {
    lengthMm: 'length',
    thicknessMm: 'thickness',
    heightMm: 'height',
    slots: 'thickness in slots',
    cardPowerW: 'card power',
    recommendedPsuW: 'recommended power supply',
    'powerConnectors.*.type': 'power connector',
    'powerConnectors.*.count': 'power connectors',
    'powerConnectors.*.standard': '16-pin standard',
  },
  storage: {
    interface: 'interface',
    formFactor: 'form factor',
  },
  psu: {
    wattageW: 'wattage',
    formFactor: 'form factor',
    lengthMm: 'length',
    'connectors.pcie16pin': '16-pin cables',
    'connectors.pcie16pinStandard': '16-pin standard',
    'connectors.pcie8pin': '8-pin PCIe cables',
  },
  cooler: {
    type: 'type',
    sockets: 'sockets',
    heightMm: 'height',
    ramClearanceMm: 'memory clearance',
    radiatorSizeMm: 'radiator size',
    radiatorThicknessMm: 'radiator thickness',
  },
  case: {
    supportedBoards: 'motherboard form factors',
    'gpuClearance.*.maxLengthMm': 'graphics card limit',
    gpuMaxThicknessMm: 'graphics card thickness limit',
    gpuMaxHeightMm: 'graphics card height limit',
    'coolerClearance.*.maxHeightMm': 'cooler height limit',
    'radiatorSupport.*.sizesMm': 'radiator sizes',
    'radiatorSupport.*.maxThicknessMm': 'radiator thickness limit',
    'psu.formFactors': 'power supply form factors',
    'psu.clearance.*.maxLengthMm': 'power supply limit',
    'frontIo.usbC': 'front USB-C ports',
    'frontIo.usbC.*.speedGbps': 'front USB-C speed',
  },
  'case-fan': {},
};

/** Every explicit label's path, as "category path": for the test that keeps the map honest. */
export const EXPLICIT_FIELD_PATTERNS: readonly string[] = Object.entries(FIELD_LABELS).flatMap(
  ([category, labels]) => Object.keys(labels).map((pattern) => `${category} ${pattern}`),
);

/**
 * Field names that don't read well split into words, in every category: acronyms, units in the
 * name, and short names that need their noun.
 */
const NODE_NAMES: Readonly<Record<string, string>> = {
  l2CacheMb: 'L2 cache',
  l3CacheMb: 'L3 cache',
  has3dVCache: '3D V-Cache',
  pCoreBaseClockMhz: 'P-core base clock',
  pCoreBoostClockMhz: 'P-core boost clock',
  eCoreBaseClockMhz: 'E-core base clock',
  eCoreBoostClockMhz: 'E-core boost clock',
  efficiencyCores: 'Efficient cores',
  tdpW: 'TDP',
  pptW: 'PPT',
  igpu: 'Integrated graphics',
  pcie: 'PCIe',
  pcieGen: 'PCIe generation',
  pcieLanes: 'PCIe lanes',
  pcieSlots: 'PCIe slots',
  m2Slots: 'M.2 slots',
  sataPorts: 'SATA ports',
  sataSupport: 'SATA support',
  biosSupport: 'BIOS support',
  biosFlashback: 'BIOS FlashBack',
  minBiosVersion: 'Minimum BIOS',
  cpus: 'CPUs',
  cpuId: 'CPU',
  families: 'CPU families',
  source: 'Lane source',
  text: 'Manual text',
  rearIo: 'Rear I/O',
  frontIo: 'Front I/O',
  wifi: 'Wi-Fi',
  lan: 'LAN',
  usbCFront: 'Front USB-C',
  usbC: 'USB-C',
  usbA: 'USB-A',
  usb3Gen1: 'USB 3.2 Gen 1',
  usb2: 'USB 2.0',
  argb5v3pin: 'ARGB (5 V, 3-pin)',
  rgb12v4pin: 'RGB (12 V, 4-pin)',
  rgb: 'RGB',
  cl: 'CL',
  trcd: 'tRCD',
  trp: 'tRP',
  tras: 'tRAS',
  xmp: 'XMP',
  expo: 'EXPO',
  vram: 'VRAM',
  referenceTbpW: 'Reference board power (TBP)',
  referencePsuW: 'Reference power supply',
  recommendedPsuW: 'Recommended power supply',
  ocModeBoostClockMhz: 'OC mode boost clock',
  nandType: 'NAND type',
  seqReadMBps: 'Sequential read',
  seqWriteMBps: 'Sequential write',
  efficiency80Plus: '80 PLUS rating',
  atxVersion: 'ATX version',
  pcie16pin: '16-pin PCIe',
  pcie16pinStandard: '16-pin standard',
  pcie8pin: '8-pin PCIe',
  eps8pin: 'EPS 8-pin',
  sata: 'SATA',
  nsprRating: 'NSPR rating',
  ramClearanceMm: 'Memory clearance',
  psu: 'Power supply',
  clearance: 'Length limits',
  gpuClearance: 'Graphics card limits',
  gpuMaxThicknessMm: 'Graphics card thickness limit',
  gpuMaxHeightMm: 'Graphics card height limit',
  coolerClearance: 'Cooler height limits',
  coolerMaxHeightMm: 'Cooler height limit',
  tallGpuLimit: 'Limit for tall graphics cards',
  aboveGpuHeightMm: 'Cards taller than',
  radiatorFanMaxThicknessMm: 'Radiator and fan thickness limit',
  bays35: '3.5-inch bays',
  bays25: '2.5-inch bays',
  verticalGpuMount: 'Vertical graphics card mount',
  makerSizeClass: 'Maker’s size class',
  size: 'Size class',
  maxRpm: 'Maximum speed',
  minRpm: 'Minimum speed',
  packSize: 'Fans per pack',
  asPublished: 'As published',
  speedsAsPublished: 'Speeds as published',
  launchDate: 'Launch date',
  chipId: 'GPU chip',
};

/** Unit suffixes a field name carries (`lengthMm`), dropped from its words. Longest first. */
const UNIT_SUFFIX = /(MmH2O|GBps|MBps|Gbps|Mtps|Mhz|Tbw|Bits|Rpm|Cfm|Years|Mm|Gb|Mb|W|V)$/;

const isIndex = (segment: string): boolean => /^\d+$/.test(segment);

/** "staticPressureMmH2O" → "Static pressure": camelCase to words, without the unit. */
function wordsOf(name: string): string {
  const bare = name.replace(UNIT_SUFFIX, '') || name;
  const words = bare
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function segmentName(segment: string): string {
  if (isIndex(segment)) return String(Number(segment) + 1);
  return NODE_NAMES[segment] ?? wordsOf(segment);
}

/** One level of a path, as the parts table's indented row names it: "Speed", "M.2 slots", "2". */
export function nodeLabel(_category: SpecCategory, path: string): string {
  return segmentName(path.slice(path.lastIndexOf('.') + 1));
}

/** A name inside a label starts in lower case, unless it opens with an acronym or a number. */
function inLabel(name: string): string {
  const keepsCase = /^([A-Z0-9][A-Z0-9.]|[0-9])/.test(name) || /^[A-Z]-/.test(name);
  return keepsCase ? name : name.charAt(0).toLowerCase() + name.slice(1);
}

function explicitLabel(category: SpecCategory, path: string): string | undefined {
  const pattern = path
    .split('.')
    .map((segment) => (isIndex(segment) ? '*' : segment))
    .join('.');
  return FIELD_LABELS[category][pattern];
}

/**
 * A spec's full name, "{part role}: {spec}": "Graphics card: length". Without an explicit label,
 * the levels of its path, a list's row number after the list's name: "Motherboard: M.2 slots 1,
 * lanes".
 */
export function fieldLabel(category: SpecCategory, path: string): string {
  const explicit = explicitLabel(category, path);
  if (explicit !== undefined) return `${PART_ROLES[category]}: ${explicit}`;
  const parts: string[] = [];
  for (const segment of path.split('.')) {
    if (isIndex(segment) && parts.length > 0) {
      parts[parts.length - 1] = `${parts.at(-1) ?? ''} ${segmentName(segment)}`;
    } else {
      parts.push(inLabel(segmentName(segment)));
    }
  }
  return `${PART_ROLES[category]}: ${parts.join(', ')}`;
}
