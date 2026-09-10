import { describe, it, expect } from "vitest";
import { Simulation } from "./simulation";
import { E, elements, recipes, starters } from "./elements";

describe("particle physics", () => {
  it("sand falls and settles without disappearing", () => {
    const s = new Simulation(20, 20, 15);
    s.set(10, 2, E.Sand);
    for (let n = 0; n < 40; n++) s.step();
    expect(s.get(10, 19)).toBe(E.Sand);
    expect(s.cells.filter((v) => v === E.Sand)).toHaveLength(1);
  });
  it("water spreads along a floor", () => {
    const s = new Simulation(20, 20, 15);
    for (let y = 5; y < 15; y++) s.set(10, y, E.Water);
    for (let n = 0; n < 100; n++) s.step();
    expect(s.cells.filter((v) => v === E.Water)).toHaveLength(10);
    expect([...s.cells.slice(19 * 20)].filter(Boolean).length).toBeGreaterThan(
      5,
    );
  });
  it("heavier grains sink through water", () => {
    const s = new Simulation(10, 10, 12);
    for (let y = 1; y < 10; y++)
      for (let x = 0; x < 10; x++) s.set(x, y, E.Water);
    s.set(5, 0, E.Sand);
    for (let n = 0; n < 30; n++) s.step();
    expect([...s.cells.slice(90)]).toContain(E.Sand);
  });
  it("gas rises and fire expires", () => {
    const s = new Simulation(20, 20);
    s.set(10, 15, E.Smoke);
    s.step();
    const i = s.cells.indexOf(E.Smoke);
    expect(Math.floor(i / 20)).toBeLessThan(15);
    s.set(5, 15, E.Fire);
    for (let n = 0; n < 90; n++) s.step();
    expect(s.cells.includes(E.Fire)).toBe(false);
  });
  it("fire triggers gunpowder explosions", () => {
    const s = new Simulation(40, 40, 28);
    s.set(20, 20, E.Fire);
    s.set(21, 20, E.Gunpowder);
    s.set(23, 21, E.Wood);
    s.step();
    expect(s.cells.filter((v) => v === E.Fire).length).toBeGreaterThan(10);
    expect(s.cells.includes(E.Gunpowder)).toBe(false);
  });
  it("paint and erase respect boundaries", () => {
    const s = new Simulation(10, 10);
    s.paint(0, 0, E.Stone, 4);
    expect(s.cells.filter(Boolean).length).toBeGreaterThan(4);
    s.paint(0, 0, 0, 4);
    expect(s.cells.every((v) => v === 0)).toBe(true);
  });
});
describe("extensible discoveries", () => {
  for (const r of recipes)
    it(`reacts ${r.a} + ${r.b} in either order`, () => {
      for (const reverse of [false, true]) {
        const s = new Simulation(10, 10);
        const found: number[] = [];
        s.onDiscover = (id) => found.push(id);
        s.put(44, reverse ? r.b : r.a);
        s.put(45, reverse ? r.a : r.b);
        expect(s.react(44, 45, true)).toBe(true);
        expect([s.cells[44], s.cells[45]]).toEqual(
          reverse
            ? [r.products[1] ?? 0, r.products[0]]
            : [r.products[0], r.products[1] ?? 0],
        );
        expect(found).toEqual(r.products.filter(Boolean));
      }
    });
});
describe("world storage and determinism", () => {
  it("restores the world and continues the exact simulation", () => {
    const a = new Simulation(60, 50, 45);
    a.paint(20, 10, E.Sand, 4);
    a.paint(40, 20, E.Water, 5);
    for (let n = 0; n < 15; n++) a.step();
    const b = new Simulation(60, 50);
    b.restore(JSON.parse(JSON.stringify(a.serialize())));
    for (let n = 0; n < 20; n++) {
      a.step();
      b.step();
    }
    expect(b.serialize()).toEqual(a.serialize());
  });
  it("rejects invalid data without changing the current world", () => {
    const s = new Simulation(10, 10);
    s.set(5, 5, E.Stone);
    const before = s.serialize();
    expect(() => s.restore({ version: 1, cells: [255] })).toThrow();
    expect(s.serialize()).toEqual(before);
  });
  it("generates reproducible editable terrain", () => {
    const a = new Simulation(),
      b = new Simulation();
    a.generate(99);
    b.generate(99);
    expect(a.serialize()).toEqual(b.serialize());
    expect(a.cells.includes(E.Plant)).toBe(true);
    expect(a.cells.includes(E.Water)).toBe(true);
    expect(a.cells.includes(E.Wood)).toBe(true);
  });
});
