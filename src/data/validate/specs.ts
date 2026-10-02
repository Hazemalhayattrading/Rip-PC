import { deriveCaseSize, type Case, type LayoutCondition } from '../schema/case';
import { CPU_FAMILIES, SOCKET_MEMORY, type Cpu } from '../schema/cpu';
import { DATA_PATHS, SPEC_CATEGORIES, type SpecCategory, type SpecRecord } from '../schema/files';
import { CHIPSETS_BY_SOCKET, type Motherboard } from '../schema/motherboard';
import type { IssueSink } from './issues';
import type { Dataset } from './parse';
import { checkSourcedRecord, type RecordPolicy, type Registry } from './sources';

const SPEC_EXEMPT = ['id', 'category', 'manufacturer', 'sources', 'notes', 'chipId'] as const;

/** Paths where null means "none" for this record (documented on each schema field). */
function nullMeansNone(record: SpecRecord): string[] {
  switch (record.category) {
    case 'cpu':
      return ['hybrid', 'igpu', 'boxCooler', 'memory.speeds.*.config'];
    case 'motherboard':
      return [
        'wifi',
        'bluetooth',
        'lan',
        'biosSupport.families.*.minBiosVersion',
        ...record.biosSupport.cpus.flatMap((row, i) =>
          row.listing === 'since' ? [] : [`biosSupport.cpus.${String(i)}.minBiosVersion`],
        ),
        ...(record.biosFlashback.supported ? [] : ['biosFlashback.name']),
      ];
    case 'ram':
      return ['profiles.xmp'];
    case 'gpu-card':
      return [
        'ocModeBoostClockMhz',
        ...record.powerConnectors.flatMap((c, i) => (c.type === '16-pin' ? [] : [`powerConnectors.${String(i)}.standard`])),
        ...(record.powerConnectors.some((c) => c.type === '16-pin') ? [] : ['powerAdapter']),
      ];
    case 'psu':
      return [
        ...(record.connectors.pcie16pin === 0 ? ['connectors.pcie16pinStandard'] : []),
        ...(record.formFactor === 'ATX' ? ['atxBracketIncluded'] : []),
      ];
    case 'cooler':
      return [...(record.manufacturer === 'noctua' ? [] : ['nsprRating']), ...(record.type === 'air' ? ['singleFanRamClearanceMm'] : [])];
    case 'case':
      return ['gpuClearance.*.condition', 'coolerClearance.*.condition', 'psu.clearance.*.condition', 'includedFans.*.model', 'gpuMaxHeightMm'];
    case 'gpu-chip':
    case 'storage':
    case 'case-fan':
      return [];
  }
}

function specPolicy(record: SpecRecord): RecordPolicy {
  return {
    type: 'spec',
    // A case's size class is derived from its boards (deriveCaseSize), so no source backs it.
    exempt: record.category === 'case' ? [...SPEC_EXEMPT, 'size'] : SPEC_EXEMPT,
    nullMeansNone: nullMeansNone(record),
    manufacturer: record.manufacturer,
    ...(record.category === 'motherboard'
      ? {
          docTypes: [
            { path: 'biosSupport.cpus', docTypes: ['cpu-support-list'] },
            { path: 'biosSupport.families', docTypes: ['cpu-support-list', 'bios-release-notes'] },
            { path: 'laneSharing', docTypes: ['manual'] },
          ],
        }
      : {}),
  };
}

export function allSpecRecords(dataset: Dataset): { category: SpecCategory; record: SpecRecord }[] {
  return SPEC_CATEGORIES.flatMap((category) =>
    (dataset.specs[category] ?? []).map((record: SpecRecord) => ({ category, record })),
  );
}

function checkMotherboard(sink: IssueSink, file: string, board: Motherboard, cpus: readonly Cpu[] | null): void {
  const id = board.id;
  // Slots: unique IDs across M.2, PCIe and SATA.
  const slotLanes = new Map<string, number | null>();
  const slotIds: string[] = [];
  for (const s of board.m2Slots) {
    slotIds.push(s.id);
    slotLanes.set(s.id, s.lanes);
  }
  for (const s of board.pcieSlots) {
    slotIds.push(s.id);
    slotLanes.set(s.id, s.electricalLanes);
  }
  for (const s of board.sataPorts) {
    slotIds.push(s.id);
    slotLanes.set(s.id, null);
  }
  const seen = new Set<string>();
  for (const sid of slotIds) {
    if (seen.has(sid)) sink.error('ref-slot', file, `slot ID "${sid}" is used twice on this board`, id);
    seen.add(sid);
  }
  const ruleIds = new Set<string>();
  board.laneSharing.forEach((rule, i) => {
    const at = `laneSharing.${String(i)}`;
    if (ruleIds.has(rule.id)) sink.error('ref-slot', file, `lane-sharing rule ID "${rule.id}" is used twice`, id, at);
    ruleIds.add(rule.id);
    if (!slotLanes.has(rule.trigger.slot)) {
      sink.error('ref-slot', file, `trigger slot "${rule.trigger.slot}" is not a slot on this board`, id, `${at}.trigger.slot`);
    }
    if (rule.trigger.deviceType === 'sata') {
      const m2 = board.m2Slots.find((s) => s.id === rule.trigger.slot);
      if (!m2?.sataSupport) {
        sink.error('sanity', file, `trigger deviceType "sata" needs an M.2 slot that accepts SATA drives`, id, `${at}.trigger`);
      }
    }
    rule.effects.forEach((effect, j) => {
      const eat = `${at}.effects.${String(j)}`;
      const targets = effect.type === 'disables' ? effect.slots : [effect.slot];
      for (const t of targets) {
        if (!slotLanes.has(t)) sink.error('ref-slot', file, `effect slot "${t}" is not a slot on this board`, id, eat);
        if (t === rule.trigger.slot) sink.error('sanity', file, `rule "${rule.id}" affects its own trigger slot`, id, eat);
      }
      if (effect.type === 'reduces') {
        const lanes = slotLanes.get(effect.slot);
        if (lanes === null) sink.error('sanity', file, `"reduces" cannot apply to SATA port "${effect.slot}"`, id, eat);
        else if (lanes !== undefined && effect.lanes >= lanes) {
          sink.error('sanity', file, `reduces "${effect.slot}" to x${String(effect.lanes)}, but it only has x${String(lanes)}`, id, eat);
        }
      }
    });
  });

  // Chipset, memory and form factor agree with the socket.
  const chipsets: readonly string[] = CHIPSETS_BY_SOCKET[board.socket];
  if (!chipsets.includes(board.chipset)) {
    sink.error('sanity', file, `chipset ${board.chipset} is not a ${board.socket} chipset`, id, 'chipset');
  }
  if (!SOCKET_MEMORY[board.socket].includes(board.memory.type)) {
    sink.error('sanity', file, `${board.socket} does not take ${board.memory.type}`, id, 'memory.type');
  }
  if (board.formFactor === 'Mini-ITX' && (board.memory.slots > 2 || board.pcieSlots.length > 1)) {
    sink.error('sanity', file, 'a Mini-ITX board has at most 2 DIMM slots and 1 PCIe slot', id);
  }
  board.pcieSlots.forEach((s, i) => {
    if (s.electricalLanes > Number(s.physicalSize.slice(1))) {
      sink.error('sanity', file, `slot ${s.label} has more electrical lanes than its physical size`, id, `pcieSlots.${String(i)}`);
    }
  });
  if (board.biosFlashback.supported !== (board.biosFlashback.name !== null)) {
    sink.error('sanity', file, 'biosFlashback.name is set exactly when flashback is supported', id, 'biosFlashback');
  }
  const official = board.memory.officialMaxSpeedMtps;
  if (official !== null && official > board.memory.maxSpeedMtps) {
    sink.error('sanity', file, 'the official memory speed is above the highest listed speed', id, 'memory.officialMaxSpeedMtps');
  }

  // BIOS support: families match the socket; one row per catalogue CPU on the socket.
  board.biosSupport.families.forEach((f, i) => {
    if (CPU_FAMILIES[f.family].socket !== board.socket) {
      sink.error('sanity', file, `CPU family ${f.family} is not a ${board.socket} family`, id, `biosSupport.families.${String(i)}`);
    }
  });
  if (cpus === null) return;
  const cpuById = new Map(cpus.map((c) => [c.id, c]));
  const listed = new Set<string>();
  board.biosSupport.cpus.forEach((row, i) => {
    const at = `biosSupport.cpus.${String(i)}`;
    if (listed.has(row.cpuId)) sink.error('bios-coverage', file, `CPU "${row.cpuId}" is listed twice`, id, at);
    listed.add(row.cpuId);
    if ((row.listing === 'since') !== (row.minBiosVersion !== null)) {
      sink.error('sanity', file, 'minBiosVersion is set exactly when listing is "since"', id, at);
    }
    const cpu = cpuById.get(row.cpuId);
    if (cpu === undefined) {
      sink.error('ref', file, `CPU "${row.cpuId}" is not in ${DATA_PATHS.specs.cpu}`, id, `${at}.cpuId`);
      return;
    }
    if (cpu.socket !== board.socket) {
      sink.error('sanity', file, `CPU "${cpu.id}" is ${cpu.socket}, the board is ${board.socket}`, id, `${at}.cpuId`);
    }
    if (!board.biosSupport.families.some((f) => f.family === cpu.family)) {
      sink.error('bios-coverage', file, `family ${cpu.family} of CPU "${cpu.id}" has no family BIOS row`, id, 'biosSupport.families');
    }
  });
  for (const cpu of cpus) {
    if (cpu.socket === board.socket && !listed.has(cpu.id)) {
      sink.error('bios-coverage', file, `no BIOS row for catalogue CPU "${cpu.id}" (${cpu.socket})`, id, 'biosSupport.cpus');
    }
  }
}

const VRAM_BUS_WIDTHS = new Set([64, 96, 128, 160, 192, 256, 320, 384, 448, 512]);
/** Theoretical x4 NVMe ceilings per PCIe generation, MB/s. */
const NVME_X4_MAX_MBPS: Readonly<Record<number, number>> = { 3: 3940, 4: 7880, 5: 15760 };
const RAD_FANS: Readonly<Record<number, { size: number; count: number }>> = {
  120: { size: 120, count: 1 },
  140: { size: 140, count: 1 },
  240: { size: 120, count: 2 },
  280: { size: 140, count: 2 },
  360: { size: 120, count: 3 },
  420: { size: 140, count: 3 },
};

/**
 * Structured case conditions must be possible in that case: a radiator condition names a position
 * and sizes the case supports, and a drive-tray count fits its trays. Drive-tray layouts must agree
 * with the case's other limits.
 */
function checkCaseLayouts(r: Case, bad: (message: string, path?: string) => void): void {
  const rows: { path: string; condition: LayoutCondition | null }[] = [
    ...r.gpuClearance.map((c, i) => ({ path: `gpuClearance.${String(i)}`, condition: c.condition })),
    ...r.coolerClearance.map((c, i) => ({ path: `coolerClearance.${String(i)}`, condition: c.condition })),
    ...(r.psu.clearance ?? []).map((c, i) => ({ path: `psu.clearance.${String(i)}`, condition: c.condition })),
  ];
  for (const { path, condition } of rows) {
    if (condition === null) continue;
    if (condition.kind === 'radiator') {
      const supported = new Set(r.radiatorSupport.filter((s) => s.position === condition.position).flatMap((s) => s.sizesMm));
      const missing = condition.sizesMm.filter((size) => !supported.has(size));
      if (missing.length > 0) bad(`the case takes no ${missing.join('/')} mm radiator at the ${condition.position}`, `${path}.condition`);
    } else if (condition.count > r.driveBays.bays35) {
      bad(`${String(condition.count)} drive trays, but the case has ${String(r.driveBays.bays35)}`, `${path}.condition`);
    }
  }
  const layouts = r.driveTrayLayouts ?? [];
  if (new Set(layouts.map((l) => l.label)).size !== layouts.length) bad('drive-tray layout labels must be unique', 'driveTrayLayouts');
  const frontMax = Math.max(0, ...r.radiatorSupport.filter((s) => s.position === 'front').flatMap((s) => s.sizesMm));
  layouts.forEach((l, i) => {
    const at = `driveTrayLayouts.${String(i)}`;
    if (new Set(l.trays).size !== l.trays.length) bad('a layout lists a tray position twice', at);
    if (l.trays.length > r.driveBays.bays35) bad(`${String(l.trays.length)} trays, but the case has ${String(r.driveBays.bays35)}`, at);
    if (l.psuMaxLengthMm < 90 || l.psuMaxLengthMm > 400) bad('layout PSU length limit out of range', at);
    if (l.frontRadiatorMaxMm > frontMax) bad(`a ${String(l.frontRadiatorMaxMm)} mm front radiator, but the case takes ${String(frontMax)} mm at most`, at);
    for (const c of r.psu.clearance ?? []) {
      if (c.condition?.kind === 'drive-trays' && c.condition.count === l.trays.length && l.psuMaxLengthMm > c.maxLengthMm) {
        bad(`the layout allows a longer PSU than the ${String(c.condition.count)}-tray limit of ${String(c.maxLengthMm)} mm`, at);
      }
    }
  });
}

function checkSanity(sink: IssueSink, file: string, r: SpecRecord): void {
  const bad = (message: string, path?: string): void => {
    sink.error('sanity', file, message, r.id, path);
  };
  switch (r.category) {
    case 'cpu': {
      if (r.threads < r.cores) bad(`threads (${String(r.threads)}) < cores (${String(r.cores)})`, 'threads');
      if (r.threads > r.cores * 2) bad('threads > 2 x cores', 'threads');
      if (r.boostClockMhz < r.baseClockMhz) bad('boost clock < base clock', 'boostClockMhz');
      if (r.hybrid !== null) {
        const h = r.hybrid;
        if (h.performanceCores + h.efficiencyCores !== r.cores) bad('P-cores + E-cores != cores', 'hybrid');
        if (h.pCoreBoostClockMhz < h.pCoreBaseClockMhz) bad('P-core boost < base', 'hybrid');
        if (h.eCoreBoostClockMhz < h.eCoreBaseClockMhz) bad('E-core boost < base', 'hybrid');
        if (h.pCoreBaseClockMhz !== r.baseClockMhz) bad('baseClockMhz must equal the P-core base clock', 'baseClockMhz');
      }
      if ((r.power.scheme === 'amd') !== (r.brand === 'AMD')) bad(`power scheme ${r.power.scheme} does not match brand ${r.brand}`, 'power');
      if (r.power.scheme === 'amd' && r.power.pptW !== null && r.power.pptW < r.power.tdpW) bad('PPT < TDP', 'power.pptW');
      if (r.power.scheme === 'intel' && r.power.maxTurboPowerW < r.power.processorBasePowerW) bad('max turbo power < base power', 'power');
      if (CPU_FAMILIES[r.family].socket !== r.socket) bad(`family ${r.family} is not a ${r.socket} family`, 'family');
      const socketMem = SOCKET_MEMORY[r.socket];
      for (const t of r.memory.types) if (!socketMem.includes(t)) bad(`${r.socket} does not take ${t}`, 'memory.types');
      for (const s of r.memory.speeds) if (!r.memory.types.includes(s.type)) bad(`speed row for ${s.type} not in memory.types`, 'memory.speeds');
      if (r.has3dVCache !== r.name.includes('X3D')) bad('has3dVCache must match an X3D model name', 'has3dVCache');
      if (r.igpu !== null && /(?:\d|K)F\b/.test(r.name)) bad('an F SKU has no integrated graphics', 'igpu');
      break;
    }
    case 'motherboard':
      break; // checked in checkMotherboard
    case 'ram': {
      const [lo, hi] = r.type === 'DDR4' ? [1600, 5333] : [3200, 12000];
      if (r.speedMtps < lo || r.speedMtps > hi) bad(`${r.type} speed ${String(r.speedMtps)} MT/s is out of range`, 'speedMtps');
      if (r.voltageV < 1.0 || r.voltageV > 1.7) bad('voltage out of range', 'voltageV');
      if (r.formFactor === 'CUDIMM' && r.type !== 'DDR5') bad('CUDIMM is DDR5 only', 'formFactor');
      if (r.heightMm !== null && (r.heightMm < 25 || r.heightMm > 80)) bad('module height out of range', 'heightMm');
      break;
    }
    case 'gpu-chip': {
      const { baseMhz, gameMhz, boostMhz } = r.clocks;
      if (baseMhz !== null && boostMhz !== null && boostMhz < baseMhz) bad('boost < base clock', 'clocks');
      if (gameMhz !== null && boostMhz !== null && boostMhz < gameMhz) bad('boost < game clock', 'clocks');
      if (!VRAM_BUS_WIDTHS.has(r.vram.busWidthBits)) bad('unusual VRAM bus width', 'vram.busWidthBits');
      if (r.referenceTbpW < 20 || r.referenceTbpW > 1000) bad('TBP out of range', 'referenceTbpW');
      if (r.referencePsuW !== null && r.referencePsuW < r.referenceTbpW) bad('PSU recommendation < TBP', 'referencePsuW');
      const vendorId = r.brand.toLowerCase();
      if (r.manufacturer !== vendorId) bad(`chip manufacturer must be the vendor "${vendorId}"`, 'manufacturer');
      break;
    }
    case 'gpu-card': {
      if (r.slots < 1 || r.slots > 5) bad('slot count out of range', 'slots');
      if (r.lengthMm < 100 || r.lengthMm > 450) bad('length out of range', 'lengthMm');
      r.powerConnectors.forEach((c, i) => {
        if (c.type !== '16-pin' && c.standard !== null) bad('only a 16-pin connector has a standard', `powerConnectors.${String(i)}`);
      });
      if (r.cardPowerW !== null && r.recommendedPsuW !== null && r.recommendedPsuW < r.cardPowerW) bad('PSU recommendation < card power', 'recommendedPsuW');
      if (r.powerAdapter !== null && !r.powerConnectors.some((c) => c.type === '16-pin')) bad('only a card with a 16-pin plug has a 16-pin adapter', 'powerAdapter');
      break;
    }
    case 'storage': {
      if (r.interface === 'SATA') {
        if (r.seqReadMBps > 600 || r.seqWriteMBps > 600) bad('SATA is limited to 600 MB/s', 'seqReadMBps');
      } else {
        const ceiling = (NVME_X4_MAX_MBPS[r.pcieGen] ?? 0) * (r.pcieLanes / 4);
        if (r.seqReadMBps > ceiling || r.seqWriteMBps > ceiling) bad(`faster than PCIe ${String(r.pcieGen)}.0 x${String(r.pcieLanes)} allows`, 'seqReadMBps');
      }
      break;
    }
    case 'psu': {
      const maxLen = r.formFactor === 'SFX' ? 110 : r.formFactor === 'SFX-L' ? 135 : 260;
      if (r.lengthMm > maxLen) bad(`${r.formFactor} PSU longer than ${String(maxLen)} mm`, 'lengthMm');
      if ((r.connectors.pcie16pin === 0) !== (r.connectors.pcie16pinStandard === null)) {
        bad('pcie16pinStandard is set exactly when there is a 16-pin cable', 'connectors');
      }
      const cables = r.connectors.pcie8pinCables;
      if (cables !== null && (cables > r.connectors.pcie8pin || (cables === 0) !== (r.connectors.pcie8pin === 0))) {
        bad('PCIe 8-pin connectors need at least one cable, and no more cables than connectors', 'connectors.pcie8pinCables');
      }
      if (r.formFactor === 'ATX' && r.atxBracketIncluded !== null) bad('an ATX unit needs no SFX-to-ATX bracket', 'atxBracketIncluded');
      if (r.wattageW < 200 || r.wattageW > 3000) bad('wattage out of range', 'wattageW');
      break;
    }
    case 'cooler': {
      if (r.type === 'air' && (r.heightMm < 20 || r.heightMm > 200)) bad('air cooler height out of range', 'heightMm');
      if (r.type === 'air' && r.singleFanRamClearanceMm !== null) {
        if (r.fanCount < 2) bad('a single-fan RAM clearance needs a cooler with two or more fans', 'singleFanRamClearanceMm');
        if (r.ramClearanceMm !== null && r.singleFanRamClearanceMm < r.ramClearanceMm) {
          bad('the single-fan RAM clearance is lower than the clearance as sold', 'singleFanRamClearanceMm');
        }
      }
      if (r.type === 'aio') {
        const expect = RAD_FANS[r.radiatorSizeMm];
        if (expect !== undefined && (expect.size !== r.fanSizeMm || expect.count !== r.fanCount)) {
          bad(`a ${String(r.radiatorSizeMm)} mm radiator takes ${String(expect.count)} x ${String(expect.size)} mm fans`, 'fanCount');
        }
        if (r.radiatorThicknessMm < 15 || r.radiatorThicknessMm > 80) bad('radiator thickness out of range', 'radiatorThicknessMm');
      }
      if (r.manufacturer !== 'noctua' && r.nsprRating !== null) bad('NSPR is a Noctua rating', 'nsprRating');
      break;
    }
    case 'case': {
      const size = deriveCaseSize(r.supportedBoards, r.makerSizeClass);
      if (r.size !== size) bad(`size must be ${size}, from the largest supported board (deriveCaseSize)`, 'size');
      if (r.gpuClearance.filter((c) => c.condition === null).length !== 1) bad('exactly one unconditional GPU clearance row', 'gpuClearance');
      if (r.coolerClearance.filter((c) => c.condition === null).length !== 1) bad('exactly one unconditional cooler clearance row', 'coolerClearance');
      for (const c of r.gpuClearance) if (c.maxLengthMm < 100 || c.maxLengthMm > 600) bad('GPU clearance out of range', 'gpuClearance');
      for (const c of r.coolerClearance) if (c.maxHeightMm < 20 || c.maxHeightMm > 250) bad('cooler clearance out of range', 'coolerClearance');
      const psuRows = r.psu.clearance ?? [];
      if (psuRows.filter((c) => c.condition === null).length > 1) bad('at most one unconditional PSU length row', 'psu.clearance');
      for (const c of psuRows) if (c.maxLengthMm < 90 || c.maxLengthMm > 400) bad('PSU length limit out of range', 'psu.clearance');
      const positions = r.layoutPositions ?? [];
      if (new Set(positions.map((p) => p.position)).size !== positions.length) bad('layout positions must be unique', 'layoutPositions');
      for (const p of positions) {
        if (p.coolerMaxHeightMm < 20 || p.coolerMaxHeightMm > 250) bad('layout cooler clearance out of range', 'layoutPositions');
        if (p.gpuMaxThicknessMm < 10 || p.gpuMaxThicknessMm > 120) bad('layout GPU thickness out of range', 'layoutPositions');
        const stack = p.radiatorFanMaxThicknessMm;
        if (stack !== null && (stack < 20 || stack > 150)) bad('layout radiator-plus-fan limit out of range', 'layoutPositions');
        if (p.tallGpuLimit !== null && p.tallGpuLimit.maxThicknessMm > p.gpuMaxThicknessMm) {
          bad('a tall-GPU thickness limit must not be looser than the normal one', 'layoutPositions');
        }
      }
      checkCaseLayouts(r, bad);
      break;
    }
    case 'case-fan': {
      if (r.minRpm !== null && r.minRpm > r.maxRpm) bad('min RPM > max RPM', 'minRpm');
      if (![80, 92, 120, 140, 200].includes(r.sizeMm)) bad('unusual fan size', 'sizeMm');
      const [noiseLo, noiseHi] = r.noise.unit === 'dBA' ? [5, 60] : [0.05, 10];
      if (r.noise.value < noiseLo || r.noise.value > noiseHi) bad(`noise out of range for ${r.noise.unit}`, 'noise');
      break;
    }
  }
}

/** Source coverage, references, BIOS and lane-sharing integrity, and sanity for every spec record. */
export function checkSpecs(sink: IssueSink, dataset: Dataset, registry: Registry, today: string): void {
  const chips = new Set((dataset.specs['gpu-chip'] ?? []).map((c) => c.id));
  for (const { category, record } of allSpecRecords(dataset)) {
    const file = DATA_PATHS.specs[category];
    checkSourcedRecord(sink, file, record, specPolicy(record), registry, today);
    const maker = registry.get(record.manufacturer);
    if (maker === undefined) {
      sink.error('publisher-known', file, `manufacturer "${record.manufacturer}" is not in data/publishers.json`, record.id, 'manufacturer');
    } else if (maker.kind !== 'manufacturer') {
      sink.error('publisher-kind', file, `manufacturer "${maker.id}" is registered as a ${maker.kind}`, record.id, 'manufacturer');
    }
    if (record.category === 'gpu-card' && dataset.specs['gpu-chip'] !== null && !chips.has(record.chipId)) {
      sink.error('ref', file, `chipId "${record.chipId}" is not in ${DATA_PATHS.specs['gpu-chip']}`, record.id, 'chipId');
    }
    if (record.category === 'motherboard') checkMotherboard(sink, file, record, dataset.specs.cpu);
    checkSanity(sink, file, record);
  }
}
