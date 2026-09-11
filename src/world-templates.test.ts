import { it, expect } from "vitest";
import { Simulation } from "./simulation";
import { generateTemplate, worldTemplates } from "./world-templates";
import { E, elements } from "./elements";
import { restoreProgress } from "./crafting";

it("builds distinct landscapes with starter materials without granting discoveries", () => {
  const layouts = new Set<string>();
  for (const t of worldTemplates.filter((t) => t.id !== "random")) {
    const s = new Simulation(160, 100);
    const found: number[] = [];
    s.onDiscover = (id) => found.push(id);
    generateTemplate(s, t.id, restoreProgress(null));
    expect(found).toEqual([]);
    expect(
      [...s.cells].every((id) => [0, E.Sand, E.Stone, E.Water].includes(id)),
    ).toBe(true);
    expect(s.creatures.length + s.plants.length).toBe(0);
    layouts.add(JSON.stringify([...s.cells]));
    if (t.id === "empty") expect(s.cells.every((id) => id === 0)).toBe(true);
  }
  expect(layouts.size).toBe(5);
});
it("randomizes only discovered materials and reproduces a seed", () => {
  const unlocked = new Set([E.Sand, E.Water, E.Sodium]);
  const a = new Simulation(),
    b = new Simulation();
  generateTemplate(a, "random", unlocked, 123);
  generateTemplate(b, "random", unlocked, 123);
  expect(a.serialize()).toEqual(b.serialize());
  expect(new Set([...a.cells].filter(Boolean))).toEqual(unlocked);
  generateTemplate(b, "random", unlocked, 456);
  expect(b.serialize()).not.toEqual(a.serialize());
});
it("fits all 200 discovered materials and retains save compatibility", () => {
  const s = new Simulation();
  const unlocked = new Set(elements.map((e) => e.id));
  generateTemplate(s, "random", unlocked);
  expect(new Set([...s.cells].filter(Boolean))).toEqual(unlocked);
  const restored = new Simulation();
  restored.restore(s.serialize());
  expect(restored.serialize()).toEqual(s.serialize());
});
