import { memo, useDeferredValue } from 'react';
import { useSearchParams } from 'wouter';
import type { SpecRecord } from '../../data/schema';
import type { Catalogue } from '../../engine/types';
import type { RigBuild } from '../../state/build-codec';
import { useBuild } from '../build-hooks';
import { CHIP_PARAM } from './lab-links';
import { CATEGORY_LABELS } from './lab-text';
import { PartDetails } from './PartDetails';
import { ChipPicker, PartPicker } from './PartPicker';
import { pickedParts, type PartSection } from './parts-model';

/**
 * `/lab/parts`: the shared picker, a GPU chip picker, and every picked part's specs, sources and
 * prices. The pickers answer at once; the part details follow as a deferred render, so a pick
 * never waits for a long spec table (interactions under 100 ms).
 */
export function LabParts({ catalogue }: { readonly catalogue: Catalogue }) {
  const build = useBuild((state) => state.selections);
  const [params, setParams] = useSearchParams();
  const chip = params.get(CHIP_PARAM);
  const shownBuild = useDeferredValue(build);
  const shownChip = useDeferredValue(chip);

  function pickChip(id: string): void {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (id === '') next.delete(CHIP_PARAM);
        else next.set(CHIP_PARAM, id);
        return next;
      },
      { replace: true },
    );
  }

  return (
    <>
      <PartPicker catalogue={catalogue} build={build} />
      <ChipPicker chips={catalogue.parts['gpu-chip']} picked={chip} onPick={pickChip} />
      <PartSections catalogue={catalogue} build={shownBuild} chip={shownChip} />
    </>
  );
}

interface PartSectionsProps {
  readonly catalogue: Catalogue;
  readonly build: RigBuild;
  readonly chip: string | null;
}

function isKnown(section: PartSection): section is PartSection & { readonly record: SpecRecord } {
  return section.record !== null;
}

/** Memoised, so the urgent render after a pick skips it until the deferred values arrive. */
const PartSections = memo(function PartSections({ catalogue, build, chip }: PartSectionsProps) {
  const sections = pickedParts(catalogue, build, chip);
  if (sections.length === 0) {
    return (
      <p className="mt-10 max-w-prose text-ink-2">
        Pick a part above to see its specs, their sources and its prices.
      </p>
    );
  }
  return sections.map((section) =>
    isKnown(section) ? (
      <PartDetails
        key={`${section.category} ${section.id}`}
        catalogue={catalogue}
        section={section}
      />
    ) : section.via === 'card' ? (
      // An unknown pick or chip from the link is named next to its picker; only a card's chip
      // can be unknown here, which the validator rules out.
      <p key={`${section.category} ${section.id}`} className="mt-10">
        Unknown part in this catalogue: {CATEGORY_LABELS[section.category]} {section.id}
      </p>
    ) : null,
  );
});
