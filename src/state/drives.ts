/**
 * The drives of a build, for the lab's picker. Only lab code imports this module, so it stays out
 * of the product pages' initial JS: the store keeps the drives, and this answers questions about
 * them.
 */
import { MAX_PART_ID_LENGTH, MAX_PAYLOAD_LENGTH, buildCodec, type RigBuild } from './build-codec';

/**
 * Whether one more drive still fits the build's link, whatever its id: the "Add a drive" button
 * shows only while it does.
 */
export function canAddDrive(selections: RigBuild): boolean {
  const longest = 'a'.repeat(MAX_PART_ID_LENGTH);
  const storage = [...(selections.storage ?? []), longest];
  return buildCodec.encode({ ...selections, storage }).length <= MAX_PAYLOAD_LENGTH;
}
