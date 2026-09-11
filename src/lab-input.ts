import type { PaletteItem } from "./combiner";

/** A pinned ingredient survives every attempt, including combinations with no result. */
export function nextLabInput(
  current: PaletteItem[],
  item: PaletteItem,
  pinned: PaletteItem | null,
): PaletteItem[] {
  if (pinned) return [pinned, item];
  return current.length === 2 ? [item] : [...current, item];
}
