import { describe, expect, it } from "vitest";
import { E, starters } from "./elements";
import { combine } from "./combiner";
import {
  allItems,
  itemKey,
  itemFromKey,
  combinationRecipes,
  recipeForUnlock,
  restoreProgress,
  PROGRESS_VERSION,
} from "./crafting";
import { generateStartingWorld } from "./starting-world";
import { Simulation } from "./simulation";

describe("four-element progression", () => {
  it("starts with exactly Sand, Water, Stone, and Fire and no life", () => {
    expect(starters).toEqual([E.Sand, E.Water, E.Stone, E.Fire]);
    expect([...restoreProgress(null)]).toEqual(starters);
    const sim = new Simulation();
    generateStartingWorld(sim);
    expect(sim.creatures).toHaveLength(0);
    expect(sim.plants).toHaveLength(0);
    expect(
      [...new Set(sim.cells)].every((id) => !id || starters.includes(id)),
    ).toBe(true);
  });
  it("reaches all 87 palette items through the actual combiner from four starters", () => {
    const known = restoreProgress(null);
    for (let round = 0; round < allItems.length; round++) {
      const before = known.size;
      const keys = [...known];
      for (const a of keys)
        for (const b of keys) {
          for (const result of combine(itemFromKey(a), itemFromKey(b)).results)
            known.add(itemKey(result));
        }
      if (known.size === before) break;
    }
    expect([...known].sort()).toEqual(allItems.map(itemKey).sort());
    expect(known.size).toBe(87);
  });
  it("has a usable hint for every locked material and species", () => {
    for (const item of allItems) {
      if (item.kind === "material" && starters.includes(item.id)) continue;
      const recipe = recipeForUnlock(itemKey(item));
      expect(recipe).toBeDefined();
      expect(
        combine(itemFromKey(recipe!.a), itemFromKey(recipe!.b)).results.map(
          itemKey,
        ),
      ).toContain(itemKey(item));
    }
  });
  it("has no conflicting pair definitions", () => {
    const keys = combinationRecipes.map((r) =>
      [String(r.a), String(r.b)].sort().join("|"),
    );
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("unlocks life through combinations in either order", () => {
    for (const [a, b, expected] of [
      [E.Plant, E.Water, "freshwater"],
      ["freshwater", E.Salt, "saltwater"],
      [E.Mud, E.Plant, "human"],
    ] as const) {
      expect(
        combine(itemFromKey(a), itemFromKey(b)).results.map(itemKey),
      ).toContain(expected);
      expect(
        combine(itemFromKey(b), itemFromKey(a)).results.map(itemKey),
      ).toContain(expected);
    }
  });
  it("ignores legacy unlocks but preserves valid new progression including life", () => {
    expect([...restoreProgress({ unlocked: allItems.map(itemKey) })]).toEqual(
      starters,
    );
    expect([...restoreProgress([E.Acid, E.Gunpowder])]).toEqual(starters);
    const restored = restoreProgress({
      version: PROGRESS_VERSION,
      unlocked: [E.Steam, "human", 999, "invalid"],
    });
    expect(restored.size).toBe(6);
    expect(restored.has("human")).toBe(true);
    expect(restored.has(E.Steam)).toBe(true);
  });
});
