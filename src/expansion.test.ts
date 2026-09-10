import { describe, it, expect } from "vitest";
import { E, elements, starters } from "./elements";
import { expandedElements, expandedTraits } from "./expansion";
import { material } from "./materials";
import { Simulation } from "./simulation";
import { contact, ignite, stepEnvironment } from "./environment";
import { extendedStep } from "./material-behaviors";
import { isHabitable } from "./life";
import { restoreProgress, PROGRESS_VERSION } from "./crafting";

const pair = (a: number, b: number) => {
  const s = new Simulation(20, 20, 58);
  s.put(210, a);
  s.put(211, b);
  return s;
};
describe("expanded physical materials", () => {
  it("has 80 unlockable materials, 60 additions, and stable unique byte IDs", () => {
    expect(elements).toHaveLength(84);
    expect(elements.length - starters.length).toBe(80);
    expect(expandedElements).toHaveLength(60);
    expect(new Set(elements.map((e) => e.id)).size).toBe(84);
    expect(elements.every((e) => e.id > 0 && e.id < 256)).toBe(true);
    expect(expandedTraits.every((e) => material[e.id].conductivity > 0)).toBe(
      true,
    );
  });
  it("preserves old progression without granting the new materials", () => {
    const known = restoreProgress({
      version: PROGRESS_VERSION,
      unlocked: [1, 2, 3, 7, 13, "human"],
    });
    expect(known.size).toBe(6);
    expect(known.has(E.Steam)).toBe(true);
    expect(expandedElements.every((e) => !known.has(e.id))).toBe(true);
  });
  it("melts wax, lets it flow, and solidifies it again", () => {
    const s = pair(E.Wax, 0);
    s.fields.temperature[210] = 80;
    stepEnvironment(s);
    expect(s.cells[210]).toBe(E.MoltenWax);
    s.step();
    s.step();
    s.step();
    expect(s.cells[210]).toBe(0);
    const i = s.cells.indexOf(E.MoltenWax);
    s.fields.temperature[i] = 30;
    stepEnvironment(s);
    expect(s.cells[i]).toBe(E.Wax);
  });
  it("fires clay into brick and melts tin into a conductive liquid", () => {
    const s = pair(E.Clay, E.Tin);
    s.fields.temperature[210] = 500;
    s.fields.temperature[211] = 250;
    extendedStep(s, 210);
    extendedStep(s, 211);
    expect(s.cells[210]).toBe(E.Brick);
    expect(s.cells[211]).toBe(E.MoltenMetal);
    expect(material[s.cells[211]].electrical).toBeGreaterThan(0);
  });
  it("filters water with a finite pollutant capacity", () => {
    const s = pair(E.Charcoal, E.Water);
    s.fields.pollution[210] = 98;
    s.fields.pollution[211] = 40;
    s.fields.moisture[210] = 100;
    contact(s, 210, 211);
    expect(s.fields.pollution[210]).toBe(100);
    expect(s.fields.pollution[211]).toBe(38);
    contact(s, 210, 211);
    expect(s.fields.pollution[211]).toBe(38);
  });
  it("dissolves fertilizer into nutrients and lets sponge absorb a finite water supply", () => {
    const a = pair(E.Fertilizer, E.Water);
    contact(a, 210, 211);
    expect(a.cells[210]).toBe(0);
    expect(a.fields.fertility[211]).toBeGreaterThan(30);
    const b = pair(E.Sponge, E.Water);
    for (let n = 0; n < 30; n++) contact(b, 210, 211);
    expect(b.fields.moisture[210]).toBe(100);
    expect(b.cells[211]).toBe(0);
  });
  it("neutralizes acidity without an unlimited mineral reserve", () => {
    const s = pair(E.Limestone, E.Acid);
    s.fields.fertility[210] = 5;
    contact(s, 210, 211);
    expect(s.fields.fertility[210]).toBe(0);
    expect(s.fields.acidity[211]).toBeLessThan(100);
  });
  it("corrodes iron into rust while gold resists water", () => {
    const s = pair(E.Iron, E.Water);
    s.random = () => 0;
    s.fields.corrosion[210] = 84;
    contact(s, 210, 211);
    expect(s.cells[210]).toBe(E.Rust);
    const g = pair(E.Gold, E.Water);
    g.random = () => 0;
    for (let n = 0; n < 100; n++) contact(g, 210, 211);
    expect(g.cells[210]).toBe(E.Gold);
    expect(g.fields.corrosion[210]).toBe(0);
  });
  it("conducts sparks through copper but not rubber", () => {
    const s = pair(E.Copper, E.Spark);
    contact(s, 210, 211);
    expect(s.fields.charge[210]).toBeGreaterThan(0);
    const r = pair(E.Rubber, E.Spark);
    contact(r, 210, 211);
    expect(r.fields.charge[210]).toBe(0);
  });
  it("mercury contaminates water and slime is not a safe fish habitat", () => {
    const s = pair(E.Mercury, E.Water);
    contact(s, 210, 211);
    expect(s.fields.pollution[211]).toBeGreaterThan(0);
    s.put(210, E.Slime);
    expect(isHabitable(s, 210, "freshwater")).toBe(false);
  });
  it("makes foam when soap meets water", () => {
    const s = pair(E.Soap, E.Water);
    contact(s, 210, 211);
    expect(s.cells[210]).toBe(E.Foam);
    expect(s.life[210]).toBe(80);
  });
  it("sublimates dry ice and condenses alcohol vapor", () => {
    const s = pair(E.DryIce, E.AlcoholVapor);
    s.fields.temperature[210] = -65;
    s.fields.temperature[211] = 50;
    extendedStep(s, 210);
    extendedStep(s, 211);
    expect(s.cells[210]).toBe(E.CarbonDioxide);
    expect(s.cells[211]).toBe(E.Alcohol);
  });
  it("uses oxygen to assist ignition and carbon dioxide to suppress it", () => {
    const s = pair(E.Oxygen, E.Coal);
    s.fields.temperature[211] = 250;
    contact(s, 210, 211);
    expect(s.cells[210]).toBe(0);
    expect(s.fields.temperature[211]).toBeGreaterThanOrEqual(300);
    const c = pair(E.CarbonDioxide, E.Fire);
    contact(c, 210, 211);
    expect(c.cells[211]).toBe(E.Smoke);
    expect(c.cells[210]).toBe(0);
  });
  it("explodes hydrogen and prevents wet cotton from burning", () => {
    const s = pair(E.Hydrogen, 0);
    expect(ignite(s, 210)).toBe(true);
    expect(s.cells.includes(E.Fire)).toBe(true);
    const c = pair(E.Cotton, 0);
    c.fields.moisture[210] = 70;
    expect(ignite(c, 210)).toBe(false);
    c.fields.moisture[210] = 0;
    expect(ignite(c, 210)).toBe(true);
  });
  it("grows algae only with appropriate salinity and nutrients", () => {
    const s = pair(E.Algae, E.Water);
    s.tick = 60;
    s.random = () => 0;
    s.fields.fertility[211] = 40;
    extendedStep(s, 210);
    expect(s.cells[211]).toBe(E.Algae);
    expect(s.fields.fertility[211]).toBe(36);
    const salty = pair(E.Algae, E.Water);
    salty.tick = 60;
    salty.random = () => 0;
    salty.fields.fertility[211] = 40;
    salty.fields.salinity[211] = 35;
    extendedStep(salty, 210);
    expect(salty.cells[211]).toBe(E.Water);
    salty.put(210, E.Kelp);
    extendedStep(salty, 210);
    expect(salty.cells[211]).toBe(E.Kelp);
  });
  it("round-trips a world containing every material and continues deterministically", () => {
    const s = new Simulation(100, 40);
    elements.forEach((e, i) => s.set(i + 5, 15, e.id));
    const restored = new Simulation(100, 40);
    restored.restore(JSON.parse(JSON.stringify(s.serialize())));
    expect(restored.serialize()).toEqual(s.serialize());
    for (let n = 0; n < 80; n++) {
      s.step();
      restored.step();
    }
    expect(restored.serialize()).toEqual(s.serialize());
  });
});
