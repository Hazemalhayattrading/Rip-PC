/**
 * Links into the lab's parts page. The build travels in `b`, through the existing codec. Two
 * lab-only parameters ride along: `cat`, the category the page shows, and `chip`, a GPU chip,
 * which a build never picks (it picks a card).
 */
import type { RigBuild } from '../../state/build-codec';
import { encodeSelections } from '../../state/build-store';
import {
  PART_CATEGORIES,
  type PartCategory,
  type SinglePartCategory,
} from '../../state/categories';
import { BUILD_PARAM } from '../../state/url-sync';
import { BUILD_STEP_LABELS, pathOf } from '../routes';

/** The lab-only query parameter that names the GPU chip the parts page shows. */
export const CHIP_PARAM = 'chip';
/** The lab-only query parameter that names the category the parts page shows. */
export const CATEGORY_PARAM = 'cat';

/** What the parts page's one-part picker can show: a build category, or a GPU chip. */
export type PickerCategory = PartCategory | 'gpu-chip';

/** The codec's category order, with GPU chips after the cards they are built on. */
export const PICKER_CATEGORIES: readonly PickerCategory[] = PART_CATEGORIES.flatMap((category) =>
  category === 'gpu-card' ? [category, 'gpu-chip' as const] : [category],
);

/** The route table's step labels (lab-spec §2), and "GPU chip" (copy guide §5). */
export const PICKER_LABELS: Readonly<Record<PickerCategory, string>> = {
  cpu: BUILD_STEP_LABELS.cpu,
  motherboard: BUILD_STEP_LABELS.motherboard,
  ram: BUILD_STEP_LABELS.ram,
  'gpu-card': BUILD_STEP_LABELS.gpu,
  'gpu-chip': 'GPU chip',
  storage: BUILD_STEP_LABELS.storage,
  psu: BUILD_STEP_LABELS.psu,
  cooler: BUILD_STEP_LABELS.cooling,
  case: BUILD_STEP_LABELS.case,
  'case-fan': 'Case fans',
};

function isPickerCategory(value: string | null): value is PickerCategory {
  return (PICKER_CATEGORIES as readonly (string | null)[]).includes(value);
}

/** Whether the link picks a part in a category: a drive, a fan model, a chip, or one part. */
function picks(params: URLSearchParams, build: RigBuild, category: PickerCategory): boolean {
  if (category === 'gpu-chip') return params.get(CHIP_PARAM) !== null;
  if (category === 'storage') return (build.storage ?? []).length > 0;
  return build[category] !== undefined;
}

/**
 * The category the parts page shows: the one the link names, else the first the link picks a part
 * in, else CPU.
 */
export function shownCategory(params: URLSearchParams, build: RigBuild): PickerCategory {
  const named = params.get(CATEGORY_PARAM);
  if (isPickerCategory(named)) return named;
  return PICKER_CATEGORIES.find((category) => picks(params, build, category)) ?? 'cpu';
}

/** A part a link can open the parts page on. */
export interface PartTarget {
  readonly category: SinglePartCategory | 'gpu-chip';
  readonly id: string;
}

/** The build a link to `target` opens: with the part picked, or as it is for a GPU chip. */
export function buildWith(build: RigBuild, target: PartTarget): RigBuild {
  return target.category === 'gpu-chip' ? build : { ...build, [target.category]: target.id };
}

/** The parts page, showing `target`: `/lab/parts?b=…&cat=cpu`, `…&cat=gpu-chip&chip=…`. */
export function partsPageHref(build: RigBuild, target: PartTarget): string {
  const params = new URLSearchParams();
  const encoded = encodeSelections(buildWith(build, target));
  if (encoded !== null) params.set(BUILD_PARAM, encoded);
  params.set(CATEGORY_PARAM, target.category);
  if (target.category === 'gpu-chip') params.set(CHIP_PARAM, target.id);
  return `${pathOf({ name: 'lab', page: 'parts' })}?${params.toString()}`;
}
