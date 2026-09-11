import { describe, it, expect } from "vitest";
import { Simulation } from "./simulation";
import { E } from "./elements";
import { nextLabInput } from "./lab-input";
import { combine, type PaletteItem } from "./combiner";
import { growthStatus, germinate, stepLife } from "./life";
import { stepDynamics } from "./dynamics";
const item = (id: number): PaletteItem => ({ kind: "material", id });
const run = (s: Simulation, n: number) => {
  for (let t = 0; t < n; t++) s.step();
};
describe("combiner pinning", () => {
  it("keeps the full modified ingredient through successful and failed attempts", () => {
    const pinned: PaletteItem = {
      kind: "material",
      id: E.Water,
      properties: { salinity: 35 },
    };
    let inputs = nextLabInput([], item(E.Fire), pinned);
    expect(combine(inputs[0], inputs[1]).results.length).toBeGreaterThan(0);
    inputs = nextLabInput(inputs, item(E.Neutronium), pinned);
    expect(inputs[0]).toBe(pinned);
    expect(combine(inputs[0], inputs[1]).results).toHaveLength(0);
    inputs = nextLabInput(inputs, item(E.Water), pinned);
    expect(inputs).toEqual([pinned, item(E.Water)]);
  });
  it("starts a normal new attempt after unpinning", () => {
    expect(
      nextLabInput([item(E.Water), item(E.Fire)], item(E.Stone), null),
    ).toEqual([item(E.Stone)]);
  });
});
describe("visible physical interactions", () => {
  it("carries dissolved contamination from the soil volume into roots", () => {
    const s = new Simulation(30, 30);
    const stem = 315,
      root = 345,
      source = 346;
    s.put(stem, E.Seed);
    s.put(root, E.Soil);
    s.put(source, E.Soil);
    expect(germinate(s, stem)).toBe(true);
    s.fields.moisture[root] = 30;
    s.fields.moisture[source] = 60;
    for (const key of [
      "salinity",
      "pollution",
      "acidity",
      "radiation",
    ] as const)
      s.fields[key][source] = 60;
    s.tick = 15;
    stepLife(s);
    for (const key of [
      "salinity",
      "pollution",
      "acidity",
      "radiation",
    ] as const) {
      expect(s.fields[key][root]).toBe(3);
      expect(s.fields[key][root] + s.fields[key][source]).toBe(60);
    }
  });
  it("replenishes each colony update phase using finite nutrients", () => {
    for (const i of [310, 311, 312]) {
      const s = new Simulation(30, 30);
      s.random = () => 0.99;
      s.put(i, E.Coral);
      s.put(i + 30, E.Water);
      s.fields.vitality[i] = 20;
      s.fields.fertility[i + 30] = 8;
      s.fields.salinity[i + 30] = 35;
      s.tick = 60 + (i % 3) * 4;
      stepDynamics(s, i);
      expect(s.fields.vitality[i]).toBe(36);
      expect(s.fields.fertility[i + 30]).toBe(0);
      s.tick += 60;
      stepDynamics(s, i);
      expect(s.fields.vitality[i]).toBe(36);
    }
  });
  it("places Sodium directly inside a pool and erupts after simulation resumes", () => {
    const s = new Simulation(60, 45);
    for (let y = 20; y < 43; y++)
      for (let x = 5; x < 55; x++) s.set(x, y, E.Water);
    s.paint(30, 25, E.Sodium, 3);
    expect(s.cells.includes(E.Sodium)).toBe(true);
    run(s, 12);
    expect(s.milestones.has("water-reactive")).toBe(true);
    expect(s.cells.includes(E.Steam) || s.cells.includes(E.Fire)).toBe(true);
  });
  it("preserves solid terrain while injecting material into liquid", () => {
    const s = new Simulation(20, 20);
    s.set(5, 5, E.Stone);
    expect(s.deposit(5, 5, E.Sodium)).toBe(false);
    expect(s.get(5, 5)).toBe(E.Stone);
    s.set(10, 10, E.Water);
    s.fields.salinity[210] = 35;
    s.deposit(10, 10, E.Sodium);
    expect(s.cells.filter((v) => v === E.Water).length).toBe(1);
    expect([...s.fields.salinity].includes(35)).toBe(true);
  });
  it("keeps hot Sodium reactive instead of converting it into generic metal", () => {
    const s = new Simulation(30, 30);
    s.set(15, 15, E.Sodium);
    s.fields.temperature[465] = 120;
    run(s, 4);
    expect(s.cells.includes(E.Sodium)).toBe(true);
  });
  it("primes neighboring explosive charges for a chain reaction", () => {
    const s = new Simulation(50, 40);
    s.set(27, 20, E.Gunpowder);
    s.explode(20, 20, 10);
    expect(s.get(27, 20)).toBe(E.Gunpowder);
    expect(s.fields.temperature[1027]).toBeGreaterThan(140);
    run(s, 8);
    expect(s.get(27, 20)).not.toBe(E.Gunpowder);
  });
  it("settles painted Plant onto soil and visibly grows a woody canopy", () => {
    const s = new Simulation(60, 50);
    for (let y = 35; y < 50; y++)
      for (let x = 0; x < 60; x++) s.set(x, y, E.Soil);
    s.paint(30, 25, E.Plant, 2);
    run(s, 360);
    expect(s.plants.length).toBeGreaterThan(0);
    expect(s.plants.some((p) => p.height > 7)).toBe(true);
    expect(s.cells.includes(E.Wood)).toBe(true);
  });
  it("grows on watered sand but explains dry and salty roots", () => {
    const s = new Simulation(40, 40);
    for (let y = 28; y < 40; y++)
      for (let x = 0; x < 40; x++) {
        s.set(x, y, E.Sand);
        s.fields.moisture[y * 40 + x] = 65;
      }
    s.set(20, 27, E.Seed);
    run(s, 240);
    expect(s.plants.length).toBeGreaterThan(0);
    expect(s.plants[0].height).toBeGreaterThan(2);
    const i = 27 * 40 + 20,
      root = 28 * 40 + 20;
    s.fields.moisture[root] = 0;
    expect(growthStatus(s, i)).toContain("Thirsty");
    s.fields.salinity[root] = 35;
    expect(growthStatus(s, i)).toContain("salty");
  });
  it("continues deterministically after saving growing plants and blast conditions", () => {
    const s = new Simulation(50, 45);
    for (let y = 30; y < 45; y++)
      for (let x = 0; x < 50; x++) s.set(x, y, E.Soil);
    s.paint(25, 20, E.Plant, 2);
    run(s, 100);
    const restored = new Simulation(50, 45);
    restored.restore(s.serialize());
    run(s, 150);
    run(restored, 150);
    expect(restored.serialize()).toEqual(s.serialize());
  });
  it("anchors legacy saved canopies before their first movement tick", () => {
    const s = new Simulation(30, 30);
    s.put(315, E.Seed);
    s.put(345, E.Soil);
    expect(germinate(s, 315)).toBe(true);
    s.fields.age[315] = 0;
    s.tick = 7;
    const restored = new Simulation(30, 30);
    restored.restore(s.serialize());
    expect(restored.fields.age[315]).toBe(65535);
    restored.step();
    expect(restored.cells[315]).toBe(E.Plant);
  });
});
