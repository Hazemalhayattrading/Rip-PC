/**
 * Part names as every engine sentence and every UI label writes them (copy guide §4). The UI
 * finds these names inside a result's `reason` to mark them `translate="no"`, so the engine and
 * the UI must use this one function.
 */
import type { SpecCategory } from '../data/schema';
import type { Catalogue } from './types';

/**
 * The display name: the brand, a space and the name, unless the name already starts with the
 * brand as a word (ignoring case). The maker's own capitals and punctuation stay as they are.
 * "AMD" + "AMD Ryzen 7 9800X3D" is "AMD Ryzen 7 9800X3D"; "ASUS" + "TUF GAMING Z890-PLUS WIFI"
 * is "ASUS TUF GAMING Z890-PLUS WIFI".
 */
export function displayName(part: { readonly brand: string; readonly name: string }): string {
  const { brand, name } = part;
  const startsWithBrand =
    name.toLowerCase().startsWith(brand.toLowerCase()) &&
    (name.length === brand.length || name[brand.length] === ' ');
  return startsWithBrand ? name : `${brand} ${name}`;
}

const wordsOf = (text: string): string[] => text.split(' ').filter((word) => word !== '');

/** Whether two runs of words are the same, ignoring case. */
const sameWords = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((word, i) => word.toLowerCase() === b[i]?.toLowerCase());

/**
 * What is wrong where the brand meets the name in a part's display name, one sentence each, or
 * nothing (the Director's ruling of 2026-10-03, after the Kingston doubled-brand defect):
 * - the name starts with words the brand ends with: "Kingston FURY" and "FURY Beast" would show
 *   "Kingston FURY FURY Beast";
 * - the brand appears more than once: "Kingston" and "FURY Beast by Kingston".
 * A structural check, so no list of names needs editing for every data batch; design-lead reads
 * the dump's names file for everything else.
 */
export function displayNameProblems(part: {
  readonly brand: string;
  readonly name: string;
}): string[] {
  const shown = displayName(part);
  const brand = wordsOf(part.brand);
  if (brand.length === 0) return [];
  const problems: string[] = [];
  if (shown !== part.name) {
    // The brand was put in front: compare its last words with the name's first, longest first.
    const name = wordsOf(part.name);
    for (let size = Math.min(brand.length, name.length); size >= 1; size--) {
      if (sameWords(brand.slice(-size), name.slice(0, size))) {
        const repeated = name.slice(0, size).join(' ');
        problems.push(`"${shown}" repeats "${repeated}" where the brand meets the name.`);
        break;
      }
    }
  }
  const words = wordsOf(shown);
  let count = 0;
  for (let i = 0; i + brand.length <= words.length; i++) {
    if (sameWords(words.slice(i, i + brand.length), brand)) count++;
  }
  if (count > 1) {
    problems.push(`"${shown}" names the brand ${part.brand} ${String(count)} times.`);
  }
  return problems;
}

/** Every catalogue part's display name, by category and in catalogue order, for review. */
export function displayNames(
  catalogue: Catalogue,
): { readonly category: SpecCategory; readonly id: string; readonly displayName: string }[] {
  return (Object.keys(catalogue.parts) as SpecCategory[]).flatMap((category) =>
    catalogue.parts[category].map((part) => ({
      category,
      id: part.id,
      displayName: displayName(part),
    })),
  );
}
