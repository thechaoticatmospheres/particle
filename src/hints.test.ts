import { it, expect } from "vitest";
import { availableHints } from "./hints";
import { allItems, restoreProgress } from "./crafting";
import { E } from "./elements";

it("can guide a player from four starters to every discovery", () => {
  const unlocked = restoreProgress(null);
  for (let n = 0; n < allItems.length; n++) {
    const hints = availableHints(unlocked);
    if (!hints.length) break;
    for (const hint of hints) {
      expect(unlocked.has(hint.a) && unlocked.has(hint.b)).toBe(true);
      hint.products.forEach((key) => unlocked.add(key));
    }
  }
  expect(unlocked.size).toBe(allItems.length);
  expect(availableHints(unlocked)).toEqual([]);
});
it("prefers the locked ingredient and falls back when it has no discoveries", () => {
  const unlocked = restoreProgress(null);
  expect(
    availableHints(unlocked, E.Water).every(
      (h) => h.a === E.Water || h.b === E.Water,
    ),
  ).toBe(true);
  expect(availableHints(unlocked, E.Neutronium).length).toBeGreaterThan(0);
});
