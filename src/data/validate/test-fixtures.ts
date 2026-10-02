/**
 * A small, fully valid dataset for the validator's own tests. Every record is an obvious fixture
 * ("Fixture" in the name, `.example` domains): it is test input, never catalogue data.
 */
import type { CreatorBenchmark } from '../schema/benchmark-creator';
import type { GameBenchmark } from '../schema/benchmark-game';
import type { SourceRef } from '../schema/common';
import { COMPAT_RULE_IDS, type CompatFixturesFile } from '../schema/compat-fixtures';
import { DATA_PATHS, type SpecCategory, type SpecRecordByCategory } from '../schema/files';
import type { GamesFile } from '../schema/game';
import type { PriceFile } from '../schema/price';
import type { Publisher } from '../schema/publisher';

export const TODAY = '2026-09-30';

export interface FixtureData {
  publishers: Publisher[];
  specs: { [C in SpecCategory]: SpecRecordByCategory[C][] };
  prices: { SA: PriceFile; US: PriceFile };
  games: GamesFile;
  gameBenchmarks: GameBenchmark[];
  creatorBenchmarks: CreatorBenchmark[];
  compatFixtures: CompatFixturesFile;
}

const src = (publisher: string, url: string, extra: Partial<SourceRef> = {}): SourceRef => ({
  url,
  publisher,
  retrievedAt: TODAY,
  docType: 'spec-page',
  ...extra,
});

const acme = (path: string): SourceRef => src('acme', `https://acme.example/${path}`);

export function fixtureData(): FixtureData {
  const publishers: Publisher[] = [
    { id: 'amd', name: 'AMD', kind: 'manufacturer', domains: ['amd.com'] },
    { id: 'nvidia', name: 'NVIDIA', kind: 'manufacturer', domains: ['nvidia.com'] },
    { id: 'acme', name: 'Acme Fixture Co', kind: 'manufacturer', domains: ['acme.example'] },
    { id: 'shop-us', name: 'Fixture Shop US', kind: 'retailer', domains: ['shop-us.example'], markets: ['US'] },
    { id: 'shop-sa', name: 'Fixture Shop SA', kind: 'retailer', domains: ['shop-sa.example'], markets: ['SA'] },
    { id: 'bench-a', name: 'Fixture Bench A', kind: 'reviewer', domains: ['bench-a.example'] },
    { id: 'bench-b', name: 'Fixture Bench B', kind: 'reviewer', domains: ['bench-b.example'] },
    { id: 'opendata', name: 'Fixture Open Data', kind: 'benchmark-database', domains: ['opendata.example'] },
    { id: 'tracker', name: 'Fixture Tracker', kind: 'tracker', domains: ['tracker.example'] },
    { id: 'store', name: 'Fixture Store', kind: 'platform', domains: ['store.example'] },
    { id: 'seedlist', name: 'Fixture Seed List', kind: 'dataset', domains: ['seed.example'] },
  ];

  const specs: FixtureData['specs'] = {
    cpu: [
      {
        id: 'fx-cpu-am5',
        category: 'cpu',
        manufacturer: 'amd',
        brand: 'AMD',
        name: 'AMD Ryzen 7 Fixture',
        family: 'ryzen-9000',
        codename: 'Granite Ridge',
        socket: 'AM5',
        cores: 8,
        threads: 16,
        hybrid: null,
        baseClockMhz: 3800,
        boostClockMhz: 5400,
        l2CacheMb: 8,
        l3CacheMb: 32,
        has3dVCache: false,
        power: { scheme: 'amd', tdpW: 65, pptW: null },
        memory: {
          types: ['DDR5'],
          speeds: [{ type: 'DDR5', speedMtps: 5600, config: '2x1R' }],
          asPublished: '2x1R DDR5-5600',
          maxCapacityGb: 192,
          channels: 2,
        },
        igpu: null,
        pcie: { maxGen: 5, usableLanes: 24, asPublished: '28 / 24' },
        launchDate: '2024-08-08',
        unlocked: true,
        boxCooler: null,
        sources: [src('amd', 'https://www.amd.com/en/products/fixture-cpu')],
        notes: [{ field: 'power.pptW', text: 'PPT is not published on the product page.' }],
      },
    ],
    motherboard: [
      {
        id: 'fx-board-am5',
        category: 'motherboard',
        manufacturer: 'acme',
        brand: 'Acme',
        name: 'Acme B650 Fixture',
        socket: 'AM5',
        chipset: 'B650',
        formFactor: 'ATX',
        biosSupport: {
          families: [{ family: 'ryzen-9000', minBiosVersion: '2000', statement: 'BIOS 2000: support Ryzen 9000.' }],
          cpus: [{ cpuId: 'fx-cpu-am5', listing: 'since', minBiosVersion: '2000', asListed: '2000' }],
        },
        biosFlashback: { supported: true, name: 'BIOS FlashBack' },
        memory: { type: 'DDR5', slots: 4, maxCapacityGb: 192, maxSpeedMtps: 8000, officialMaxSpeedMtps: 5600, speedsAsPublished: '8000(OC)/5600' },
        m2Slots: [
          { id: 'm2-1', label: 'M.2_1', pcieGen: 5, lanes: 4, source: 'cpu', sizes: ['2280'], sataSupport: false },
          { id: 'm2-2', label: 'M.2_2', pcieGen: 4, lanes: 4, source: 'chipset', sizes: ['2280'], sataSupport: true },
        ],
        pcieSlots: [
          { id: 'pcie-1', label: 'PCIEX16_1', gen: 4, electricalLanes: 16, physicalSize: 'x16', source: 'cpu' },
          { id: 'pcie-2', label: 'PCIEX16_2', gen: 4, electricalLanes: 4, physicalSize: 'x16', source: 'chipset' },
        ],
        sataPorts: [
          { id: 'sata-1', label: 'SATA6G_1' },
          { id: 'sata-2', label: 'SATA6G_2' },
        ],
        laneSharing: [
          {
            id: 'ls-1',
            trigger: { slot: 'm2-2', deviceType: 'sata' },
            effects: [{ type: 'disables', slots: ['sata-2'] }],
            manualPage: '1-4',
            text: 'SATA6G_2 is disabled when M.2_2 holds a SATA device.',
          },
          {
            id: 'ls-2',
            trigger: { slot: 'm2-2', deviceType: 'any' },
            effects: [{ type: 'reduces', slot: 'pcie-2', lanes: 2 }],
            manualPage: '1-4',
            text: 'PCIEX16_2 runs at x2 when M.2_2 is occupied.',
          },
        ],
        rearIo: ['1 x HDMI port', '4 x USB 5Gbps ports'],
        wifi: 'Wi-Fi 6E',
        bluetooth: '5.3',
        lan: 'Realtek 2.5Gb Ethernet',
        headers: {
          usbCFront: [{ label: 'USB 10Gbps Type-C header', speedGbps: 10, count: 1 }],
          usb3Gen1: 1,
          usb2: 2,
          argb5v3pin: 3,
          rgb12v4pin: 1,
          fans: [
            { label: 'CPU_FAN', count: 1, role: 'cpu' },
            { label: 'CHA_FAN', count: 3, role: 'chassis' },
          ],
        },
        sources: [
          acme('b650-fixture/spec'),
          { ...acme('b650-fixture/cpu-support'), docType: 'cpu-support-list', fields: ['biosSupport'] },
          { ...acme('b650-fixture/manual.pdf'), docType: 'manual', fields: ['laneSharing'] },
        ],
      },
    ],
    ram: [
      {
        id: 'fx-ram',
        category: 'ram',
        manufacturer: 'acme',
        brand: 'Acme',
        name: 'Acme Fixture DDR5-6000 32GB',
        partNumber: 'FX-6000',
        series: 'Fixture',
        type: 'DDR5',
        formFactor: 'UDIMM',
        moduleCapacityGb: 16,
        moduleCount: 2,
        speedMtps: 6000,
        timings: { cl: 30, trcd: 36, trp: 36, tras: 96 },
        voltageV: 1.35,
        profiles: { xmp: '3.0', expo: true },
        heightMm: 44,
        rgb: true,
        sources: [acme('ram')],
      },
    ],
    'gpu-chip': [
      {
        id: 'fx-chip',
        category: 'gpu-chip',
        manufacturer: 'nvidia',
        brand: 'NVIDIA',
        name: 'GeForce Fixture 1',
        architecture: 'Blackwell',
        shaders: { count: 3840, unit: 'CUDA Cores' },
        clocks: { baseMhz: 2000, gameMhz: null, boostMhz: 2500 },
        vram: { sizeGb: 8, type: 'GDDR7', busWidthBits: 128, speedGbps: 28, bandwidthGBps: 448 },
        referenceTbpW: 150,
        referencePsuW: 550,
        pcie: { gen: 5, lanes: 8 },
        upscaling: ['DLSS 4'],
        frameGeneration: ['DLSS Multi Frame Generation'],
        launchDate: '2025-05',
        sources: [src('nvidia', 'https://www.nvidia.com/en-us/fixture-chip/')],
        notes: [{ field: 'clocks.gameMhz', text: 'NVIDIA does not publish a game clock.' }],
      },
    ],
    'gpu-card': [
      {
        id: 'fx-card',
        category: 'gpu-card',
        manufacturer: 'acme',
        brand: 'Acme',
        name: 'Acme Fixture 1 OC',
        chipId: 'fx-chip',
        partNumber: 'FX1-OC',
        lengthMm: 240,
        heightMm: 120,
        thicknessMm: 40,
        slots: 2,
        powerConnectors: [{ type: '8-pin', standard: null, count: 1 }],
        powerAdapter: null,
        cardPowerW: 160,
        recommendedPsuW: 550,
        outputs: [{ type: 'HDMI 2.1b', count: 1 }],
        boostClockMhz: 2550,
        ocModeBoostClockMhz: null,
        sources: [acme('card')],
      },
    ],
    storage: [
      {
        id: 'fx-ssd',
        category: 'storage',
        manufacturer: 'acme',
        brand: 'Acme',
        name: 'Acme Fixture SSD 1TB',
        partNumber: 'FX-SSD-1T',
        capacityGb: 1000,
        seqReadMBps: 7000,
        seqWriteMBps: 6000,
        cache: 'dram',
        nandType: 'TLC',
        enduranceTbw: 600,
        heatsink: false,
        warrantyYears: 5,
        interface: 'NVMe',
        formFactor: 'M.2 2280',
        pcieGen: 4,
        pcieLanes: 4,
        sources: [acme('ssd')],
      },
    ],
    psu: [
      {
        id: 'fx-psu',
        category: 'psu',
        manufacturer: 'acme',
        brand: 'Acme',
        name: 'Acme Fixture 850W',
        partNumber: 'FX-850',
        wattageW: 850,
        efficiency80Plus: 'Gold',
        cybenetics: null,
        atxVersion: '3.1',
        formFactor: 'ATX',
        lengthMm: 140,
        atxBracketIncluded: null,
        modularity: 'full',
        fanSizeMm: 120,
        connectors: { pcie16pin: 1, pcie16pinStandard: '12V-2x6', pcie8pin: 3, pcie8pinCables: 3, eps8pin: 2, sata: 8, molex: 3 },
        sources: [acme('psu')],
        notes: [{ field: 'cybenetics', text: 'No Cybenetics rating is published.' }],
      },
    ],
    cooler: [
      {
        id: 'fx-cooler',
        category: 'cooler',
        manufacturer: 'acme',
        brand: 'Acme',
        name: 'Acme Fixture Tower',
        partNumber: 'FX-T1',
        sockets: ['AM5'],
        fanSizeMm: 120,
        fanCount: 1,
        tdpW: 220,
        nsprRating: null,
        rgb: false,
        type: 'air',
        heightMm: 157,
        ramClearanceMm: 40,
        singleFanRamClearanceMm: null,
        sources: [acme('cooler')],
      },
    ],
    case: [
      {
        id: 'fx-case',
        category: 'case',
        manufacturer: 'acme',
        brand: 'Acme',
        name: 'Acme Fixture Mid',
        partNumber: null,
        size: 'mid-tower',
        makerSizeClass: 'Mid Tower',
        supportedBoards: ['ATX', 'Micro-ATX', 'Mini-ITX'],
        gpuClearance: [
          { maxLengthMm: 380, condition: null },
          { maxLengthMm: 350, condition: { kind: 'radiator', position: 'front', sizesMm: [360], asPublished: 'with a 360 mm front radiator' } },
        ],
        gpuMaxThicknessMm: null,
        gpuMaxHeightMm: null,
        coolerClearance: [{ maxHeightMm: 170, condition: null }],
        radiatorSupport: [{ position: 'front', sizesMm: [240, 360], maxThicknessMm: null }],
        fanMounts: [{ position: 'front', sizeMm: 120, count: 3 }],
        includedFans: [],
        psu: { formFactors: ['ATX'], clearance: [{ maxLengthMm: 200, condition: null }] },
        driveBays: { bays35: 2, bays25: 2 },
        expansionSlots: 7,
        frontIo: {
          usbC: [{ label: 'USB 3.2 Gen 2 Type-C', speedGbps: 10, count: 1 }],
          usbA: [{ speedGbps: 5, count: 2 }],
          audioJack: true,
        },
        verticalGpuMount: 'none',
        sidePanel: 'Tempered glass',
        colors: ['Black'],
        dimensionsMm: { height: 460, width: 230, depth: 450 },
        sources: [acme('case')],
        notes: [
          { field: 'partNumber', text: 'No part number is published.' },
          { field: 'gpuMaxThicknessMm', text: 'Not published.' },
          { field: 'radiatorSupport.0.maxThicknessMm', text: 'Not published.' },
        ],
      },
    ],
    'case-fan': [
      {
        id: 'fx-fan',
        category: 'case-fan',
        manufacturer: 'acme',
        brand: 'Acme',
        name: 'Acme Fixture 120',
        partNumber: 'FX-F120',
        sizeMm: 120,
        thicknessMm: 25,
        maxRpm: 1800,
        minRpm: 200,
        airflowCfm: 56,
        staticPressureMmH2O: 2.2,
        noise: { value: 22, unit: 'dBA' },
        connector: '4-pin PWM',
        lighting: 'none',
        packSize: 1,
        bearing: 'Fluid dynamic bearing',
        sources: [acme('fan')],
      },
    ],
  };

  const unpriced = ['fx-board-am5', 'fx-ram', 'fx-card', 'fx-ssd', 'fx-psu', 'fx-cooler', 'fx-case', 'fx-fan'];
  const priceFile = (market: 'SA' | 'US'): PriceFile => {
    const shop = market === 'SA' ? 'shop-sa' : 'shop-us';
    return {
      schemaVersion: 1,
      market,
      currency: market === 'SA' ? 'SAR' : 'USD',
      batches: [{ id: 'fixture-batch', label: 'Fixture batch', windowStart: '2026-09-30', windowEnd: '2026-10-02' }],
      priceBasis: 'As displayed.',
      observations: [
        {
          partId: 'fx-cpu-am5',
          batch: 'fixture-batch',
          market,
          currency: market === 'SA' ? 'SAR' : 'USD',
          amount: market === 'SA' ? 1299 : 329.99,
          retailer: shop,
          url: `https://${shop}.example/p/fx-cpu-am5`,
          inStock: true,
          isMarketplace: false,
          seller: 'Fixture Shop',
          retrievedAt: TODAY,
          capture: `artifacts/prices/${market}/fx-cpu-am5--${shop}--${TODAY}.html`,
          captureSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        },
      ],
      gaps: unpriced.map((partId) => ({
        partId,
        batch: 'fixture-batch',
        market,
        reasonCode: 'not-listed' as const,
        reason: 'Not listed at the retailer on the check date.',
        retailersTried: [shop],
        checkedAt: TODAY,
      })),
    };
  };

  const games: GamesFile = {
    schemaVersion: 1,
    listDate: TODAY,
    method: 'Fixture method.',
    considered: [],
    games: [
      {
        id: 'fx-game',
        title: 'Fixture Game',
        franchiseSlot: null,
        steamAppId: 730,
        releaseDate: '2023-09-27',
        listStatus: 'confirmed',
        replaces: null,
        inclusionReason: 'Fixture.',
        playerCounts: [{ metric: 'steam-24h-peak', value: 1000, asOf: TODAY, period: null, scope: 'steam' }],
        sources: [
          { ...src('tracker', 'https://tracker.example/app/730'), docType: 'tracker-page', fields: ['playerCounts'] },
          { ...src('store', 'https://store.example/app/730'), docType: 'store-page' },
        ],
      },
      {
        id: 'fx-cod',
        title: 'Fixture Duty',
        franchiseSlot: 'call-of-duty',
        steamAppId: null,
        releaseDate: '2025-11-14',
        listStatus: 'confirmed',
        replaces: null,
        inclusionReason: 'Fixture.',
        playerCounts: [{ metric: 'monthly-active-users', value: 5000, asOf: '2026-09-01', period: 'August 2026', scope: 'all-platforms' }],
        sources: [{ ...src('tracker', 'https://tracker.example/cod'), docType: 'tracker-page' }],
      },
      {
        id: 'fx-fc',
        title: 'Fixture FC',
        franchiseSlot: 'ea-sports-fc',
        steamAppId: 2000,
        releaseDate: '2025-09-26',
        listStatus: 'replacement',
        replaces: 'Fixture FC Old',
        inclusionReason: 'Fixture.',
        playerCounts: [{ metric: 'steam-period-average', value: 800, asOf: TODAY, period: 'Last 30 Days', scope: 'steam' }],
        sources: [{ ...src('tracker', 'https://tracker.example/app/2000'), docType: 'tracker-page' }],
      },
    ],
  };

  const bench = (id: string, publisher: string, avgFps: number, extra: Partial<SourceRef> = {}): GameBenchmark => ({
    id,
    gameId: 'fx-game',
    limiter: 'gpu',
    testSystem: {
      cpu: { name: 'AMD Ryzen 7 Fixture', catalogueId: 'fx-cpu-am5' },
      gpu: { chipName: 'GeForce Fixture 1', chipId: 'fx-chip', card: 'Acme Fixture 1 OC', cardId: 'fx-card' },
      ram: '32GB (2x16GB) DDR5-6000 CL30',
      motherboard: 'Acme B650 Fixture',
      os: 'Windows 11',
      gpuDriver: '581.00',
    },
    gameVersion: null,
    scene: 'built-in benchmark',
    resolution: '2560x1440',
    preset: 'Ultra',
    rayTracing: 'off',
    upscaling: { method: 'native', mode: null, version: null },
    frameGeneration: 'off',
    avgFps,
    onePercentLowFps: Math.round(avgFps * 0.8),
    publishedAt: '2025-05-20',
    sources: [{ ...src(publisher, `https://${publisher}.example/review`), docType: 'review', ...extra }],
    notes: [{ field: 'gameVersion', text: 'The review does not state the patch.' }],
  });

  // Every rule gets the same ok build (an AM5 CPU on an AM5 board) and a gap for each other outcome.
  const compatFixtures: CompatFixturesFile = {
    schemaVersion: 1,
    rules: COMPAT_RULE_IDS.map((rule) => ({
      rule,
      fixtures: [
        {
          id: `${rule}-ok-fixture`,
          outcome: 'ok' as const,
          parts: { cpu: 'fx-cpu-am5', motherboard: 'fx-board-am5' },
          reason: 'Fixture: both are AM5.',
          facts: [
            { part: 'fx-cpu-am5', path: 'socket', value: 'AM5' },
            { part: 'fx-board-am5', path: 'socket', value: 'AM5' },
          ],
        },
      ],
      gaps: (['warn', 'block', 'cant-verify'] as const).map((outcome) => ({ outcome, kind: 'not-applicable' as const, reason: 'Fixture.' })),
    })),
  };

  return {
    publishers,
    specs,
    prices: { SA: priceFile('SA'), US: priceFile('US') },
    games,
    gameBenchmarks: [
      bench('fx-bench-live', 'bench-a', 100),
      bench('fx-bench-archived', 'bench-b', 105, {
        archiveUrl: 'https://web.archive.org/web/20250601120000/https://bench-b.example/review',
      }),
    ],
    compatFixtures,
    creatorBenchmarks: [
      {
        id: 'fx-blender',
        app: 'blender',
        appVersion: '4.5.0',
        test: 'monster',
        device: 'gpu',
        backend: 'OptiX',
        subject: { type: 'gpu', chipId: 'fx-chip' },
        score: 3000,
        unit: 'samples-per-minute',
        aggregate: { statistic: 'median', sampleSize: 50 },
        testSystem: null,
        publishedAt: TODAY,
        sources: [{ ...src('opendata', 'https://opendata.example/query'), docType: 'benchmark-database' }],
      },
    ],
  };
}

/** Lays fixture data out as repo-relative files, as the validator reads them. */
export function toFiles(d: FixtureData): Record<string, unknown> {
  const files: Record<string, unknown> = {
    [DATA_PATHS.publishers]: { schemaVersion: 1, publishers: d.publishers },
    [DATA_PATHS.games]: d.games,
    [DATA_PATHS.prices.SA]: d.prices.SA,
    [DATA_PATHS.prices.US]: d.prices.US,
    [DATA_PATHS.benchmarks.game]: { schemaVersion: 1, items: d.gameBenchmarks },
    [DATA_PATHS.benchmarks.creator]: { schemaVersion: 1, items: d.creatorBenchmarks },
    [DATA_PATHS.compatFixtures]: d.compatFixtures,
  };
  for (const [category, items] of Object.entries(d.specs)) {
    files[DATA_PATHS.specs[category as SpecCategory]] = { schemaVersion: 1, category, items };
  }
  return files;
}
