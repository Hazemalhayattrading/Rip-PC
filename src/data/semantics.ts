/**
 * What the data means, for code that must not load Zod (the engine). Type imports only, plus the
 * Zod-free path helpers. The validator uses the same functions, so the two can't drift apart.
 */
import type { SpecRecord } from './schema/files';
import { covers, splitPath } from './validate/paths';

/**
 * Paths where `null` means "none" for this record, a real answer (documented on each schema field):
 * `cpu.igpu: null` is a CPU without integrated graphics. Every other null spec value means "not
 * published" and has a note saying why. `*` matches any array index.
 */
export function nullMeansNone(record: SpecRecord): string[] {
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

/**
 * Whether a null at `path` (a dot path such as `igpu` or `biosSupport.cpus.2.minBiosVersion`) means
 * "none". `false` means the value is not published, and the rule that reads it can't verify.
 */
export function nullIsNone(record: SpecRecord, path: string): boolean {
  const target = splitPath(path);
  return nullMeansNone(record).some((pattern) => covers(splitPath(pattern), target));
}
