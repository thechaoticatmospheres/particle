import { describe, expect, it } from "vitest";
import { combine, worldPoint, type PaletteItem } from "./combiner";
import { E } from "./elements";
import { Simulation } from "./simulation";

const item = (id: number): PaletteItem => ({ kind: "material", id });
describe("drag combination workflow", () => {
  it("makes salty water in either drop order", () => {
    const result = combine(item(E.Salt), item(E.Water));
    expect(result).toEqual(combine(item(E.Water), item(E.Salt)));
    expect(result.results[0]).toMatchObject({
      id: E.Water,
      properties: { salinity: 35 },
    });
  });
  it("carries existing modifiers through another reaction", () => {
    const salty = combine(item(E.Salt), item(E.Water)).results[0];
    expect(combine(salty, item(E.Oil)).results[0]).toMatchObject({
      id: E.Water,
      properties: { salinity: 35, pollution: 55 },
    });
  });
  it("keeps both products from material reactions available", () => {
    const result = combine(item(E.Lava), item(E.Water));
    expect(result.results.map((r) => r.kind === "material" && r.id)).toEqual(
      expect.arrayContaining([E.Obsidian, E.Steam]),
    );
  });
  it("does not invent recipes for incompatible materials or creatures", () => {
    expect(combine(item(E.Sand), item(E.Sand)).results).toEqual([]);
    expect(
      combine({ kind: "life", species: "human" }, item(E.Water)).results,
    ).toEqual([]);
  });
  it("drops a bounded modified blob without replacing existing terrain", () => {
    const s = new Simulation(40, 30);
    s.set(20, 15, E.Stone);
    const result = combine(item(E.Water), item(E.Salt)).results[0];
    if (result.kind !== "material") throw new Error("Expected material");
    s.paint(20, 15, result.id, 5, false, result.properties);
    expect(s.get(20, 15)).toBe(E.Stone);
    const water = [...s.cells].flatMap((id, i) => (id === E.Water ? [i] : []));
    expect(water.length).toBeGreaterThan(50);
    expect(water.length).toBeLessThan(100);
    expect(water.every((i) => s.fields.salinity[i] === 35)).toBe(true);
    expect(s.get(26, 15)).toBe(E.Empty);
  });
});
describe("world drop coordinates", () => {
  const bounds = { left: 230, top: 200, width: 1080, height: 440 };
  it("maps the displayed canvas into simulation cells", () => {
    expect(worldPoint(770, 420, bounds, 540, 220)).toEqual({ x: 270, y: 110 });
    expect(worldPoint(230, 200, bounds, 540, 220)).toEqual({ x: 0, y: 0 });
    expect(worldPoint(1309, 639, bounds, 540, 220)).toEqual({ x: 539, y: 219 });
  });
  it("rejects drops in the surrounding UI and collapsed canvases", () => {
    for (const [x, y] of [
      [229, 200],
      [230, 199],
      [1310, 200],
      [230, 640],
    ])
      expect(worldPoint(x, y, bounds, 540, 220)).toBeNull();
    expect(worldPoint(230, 200, { ...bounds, width: 0 }, 540, 220)).toBeNull();
  });
});
