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
