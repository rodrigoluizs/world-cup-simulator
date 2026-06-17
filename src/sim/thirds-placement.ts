/**
 * Round-of-32 third-place allocation.
 *
 * In the real FIFA 2026 tournament the eight best third-placed teams are slotted
 * into specific Round-of-32 matches via a fixed published lookup table keyed on
 * *which* group-letters those thirds come from — one of C(12, 8) = 495 possible
 * combinations. That full 495-row table is not reproduced here; instead we use a
 * deterministic allocation that produces a stable, collision-free assignment for
 * ANY combination of qualifying groups. The bracket therefore plays out the full
 * 32-team knockout faithfully, with a well-defined (if not officially published)
 * mapping from thirds to slots.
 *
 * There are eight third-place slots in the Round-of-32 skeleton, indexed 0..7.
 */

/** Number of third-place slots in the Round-of-32 bracket. */
export const THIRD_SLOTS = 8

/**
 * Map each third-place Round-of-32 slot to the group letter that fills it.
 *
 * Qualifying group letters are assigned to slots in alphabetical order, which is
 * deterministic and collision-free. Returns a record keyed by slot index as a
 * string ("0".."7"); only as many slots as there are qualifying thirds are set.
 */
export function placeThirds(thirdLetters: string[]): Record<string, string> {
  const sorted = [...thirdLetters].sort()
  const placement: Record<string, string> = {}
  sorted.slice(0, THIRD_SLOTS).forEach((letter, slot) => {
    placement[String(slot)] = letter
  })
  return placement
}
