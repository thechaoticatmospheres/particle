import { describe, it, expect } from "vitest";
import { E, elements, byId } from "./elements";
import { frontierElements, frontierTraits, frontierRecipes } from "./frontier";
import { material } from "./materials";
import { Simulation } from "./simulation";
import { dynamicContact, stepDynamics, impulse } from "./dynamics";
import { contact, stepEnvironment, ignite } from "./environment";
import { modifierExperiments } from "./experiments";
import { combine } from "./combiner";
import { isHabitable } from "./life";
import { extendedStep } from "./material-behaviors";

const pair = (a: number, b: number) => {
  const s = new Simulation(30, 24, 58);
  s.put(310, a);
  s.put(311, b);
  s.tick = 4;
  return s;
};
const run = (s: Simulation, i = 310) => {
  s.tick = (i % 3) * 4;
  stepDynamics(s, i);
};
describe("shared dramatic systems", () => {
  it("bakes damp flour but leaves dry flour available for dust explosions", () => {
    const s = pair(E.Flour, E.Flour);
    s.fields.temperature[310] = 160;
    s.fields.temperature[311] = 160;
    s.fields.moisture[310] = 30;
    extendedStep(s, 310);
    extendedStep(s, 311);
    expect(s.cells[310]).toBe(E.Bread);
    expect(s.cells[311]).toBe(E.Flour);
    expect(ignite(s, 311)).toBe(true);
  });
  it("adds exactly 116 authored materials without cosmetic-only definitions", () => {
    expect(elements).toHaveLength(200);
    expect(frontierElements).toHaveLength(116);
    expect(new Set(elements.map((e) => e.id)).size).toBe(200);
    expect(frontierTraits.every((e) => Object.keys(e.traits).length > 0)).toBe(
      true,
    );
    for (const e of frontierElements)
      expect(byId.get(e.id)?.description.length).toBeGreaterThan(35);
  });
  it("does not shadow existing modifier pairs with new discoveries", () => {
    for (const e of modifierExperiments) {
      expect(
        frontierRecipes.some(
          (r) => (r.a === e.a && r.b === e.b) || (r.a === e.b && r.b === e.a),
        ),
        e.label,
      ).toBe(false);
    }
  });
  it("reacts water with alkali metal into hot gas and a visible burst", () => {
    const s = pair(E.Sodium, E.Water);
    dynamicContact(s, 310, 311);
    expect(s.cells[310]).toBe(E.Lye);
    expect(s.cells[311]).toBe(E.Hydrogen);
    expect(s.fields.temperature[311]).toBe(900);
    expect(s.cells.filter((id) => id === E.Hydrogen).length).toBeGreaterThan(4);
    expect(s.fields.pressure[311]).toBe(65);
    expect(s.effects.length).toBeGreaterThan(0);
  });
  it("consumes cement hydration reactants and leaves a concrete barrier", () => {
    const s = pair(E.Cement, E.Water);
    dynamicContact(s, 310, 311);
    expect(s.cells[310]).toBe(E.Concrete);
  });
  it("mixes real aluminum and rust into a hot-burning thermite fuel", () => {
    const s = pair(E.Aluminum, E.Rust);
    contact(s, 310, 311);
    expect(s.cells[310]).toBe(E.Thermite);
    expect(s.cells[311]).toBe(E.Thermite);
    s.fields.moisture[310] = 0;
    ignite(s, 310);
    run(s);
    expect(s.fields.temperature[311]).toBeGreaterThan(20);
  });
  it("blocks radiation with lead while exposed water receives a dose", () => {
    const s = pair(E.Uranium, E.Lead);
    s.put(312, E.Water);
    s.put(309, E.Water);
    run(s);
    expect(s.fields.radiation[312]).toBe(0);
    expect(s.fields.radiation[309]).toBeGreaterThan(0);
  });
  it("transports radioactive conditions between water particles and invalidates habitats", () => {
    const s = pair(E.Water, E.Water);
    s.fields.radiation[310] = 100;
    for (let n = 0; n < 10; n++) contact(s, 310, 311);
    expect(s.fields.radiation[311]).toBeGreaterThan(20);
    expect(isHabitable(s, 311, "freshwater")).toBe(false);
  });
  it("consumes antidote reserve while removing contamination and infection", () => {
    const s = pair(E.Antidote, E.Virus);
    dynamicContact(s, 310, 311);
    expect(s.cells[311]).toBe(E.Compost);
    expect(s.fields.vitality[310]).toBe(90);
    s.put(311, E.Water);
    s.fields.radiation[311] = 40;
    dynamicContact(s, 310, 311);
    expect(s.fields.radiation[311]).toBeLessThan(40);
  });
  it("mutates organic neighbors into interacting organisms", () => {
    const s = pair(E.Mutagen, E.Plant);
    s.random = () => 0;
    dynamicContact(s, 310, 311);
    expect(s.cells[311]).toBe(E.FireBloom);
    expect(s.fields.vitality[310]).toBe(80);
  });
  it("builds pressure in confined gas and vents weak walls", () => {
    const s = pair(E.Methane, E.Glass);
    for (const j of s.neighbors(310)) s.put(j, E.Glass);
    s.fields.pressure[310] = 84;
    run(s);
    expect(s.fields.pressure[310]).toBe(0);
    expect(s.cells.includes(E.Gravel)).toBe(true);
    expect(s.effects.length).toBeGreaterThan(0);
  });
  it("dissipates pressure in an open gas pocket", () => {
    const s = pair(E.Methane, 0);
    s.fields.pressure[310] = 50;
    run(s);
    expect(s.fields.pressure[310]).toBeLessThan(50);
  });
  it("moves particles with their modifiers without tunneling through walls", () => {
    const s = pair(E.Magnet, 0);
    s.put(313, E.Aluminum);
    s.fields.pollution[313] = 47;
    impulse(s, 310, 5, true, true);
    expect(s.cells[312]).toBe(E.Aluminum);
    expect(s.fields.pollution[312]).toBe(47);
    s.put(311, E.Stone);
    impulse(s, 310, 5, true, true);
    expect(s.cells[311]).toBe(E.Stone);
    expect(s.cells[312]).toBe(E.Aluminum);
  });
  it("keeps particle impulses inside world rows", () => {
    const s = new Simulation(10, 10);
    s.put(20, E.Sand);
    impulse(s, 29, 4, true);
    expect(s.cells[20]).toBe(E.Sand);
  });
  it("powers heaters only with charge", () => {
    const s = pair(E.Heater, E.Water);
    run(s);
    expect(s.fields.temperature[311]).toBe(20);
    s.fields.charge[310] = 200;
    run(s);
    expect(s.fields.temperature[311]).toBeGreaterThan(20);
    expect(s.fields.charge[310]).toBeLessThan(200);
  });
  it("powers coolers to chill surrounding liquids", () => {
    const s = pair(E.Cooler, E.Water);
    s.fields.charge[310] = 200;
    run(s);
    expect(s.fields.temperature[311]).toBeLessThan(0);
  });
  it("exhausts batteries and blocks solar generation under a roof", () => {
    const s = pair(E.Battery, 0);
    s.fields.vitality[310] = 0;
    run(s);
    expect(s.fields.charge[310]).toBe(0);
    const sun = pair(E.SolarCell, 0);
    run(sun);
    expect(sun.fields.charge[310]).toBeGreaterThan(0);
    sun.put(280, E.Stone);
    sun.fields.charge[310] = 0;
    run(sun);
    expect(sun.fields.charge[310]).toBe(0);
  });
  it("uses powered electrodes to split water into combustible gases", () => {
    const s = pair(E.Electrode, E.Water);
    s.fields.charge[310] = 200;
    run(s);
    expect(s.cells[311]).toBe(E.Hydrogen);
    expect(s.cells.includes(E.Oxygen)).toBe(true);
    expect(s.fields.charge[310]).toBe(0);
  });
  it("arcs across air to conductors and consumes charge", () => {
    const s = pair(E.TeslaCoil, 0);
    s.put(314, E.Copper);
    s.fields.charge[310] = 220;
    let n = 0;
    s.random = () => (n++ === 0 ? 0.99 : 0.5);
    run(s);
    expect(s.fields.charge[314]).toBe(220);
    expect(s.cells.includes(E.Spark)).toBe(true);
    expect(s.fields.charge[310]).toBeLessThan(220);
  });
  it("makes finite cloud rain, with no emission once reserve is gone", () => {
    const s = pair(E.Cloud, 0);
    s.random = () => 0;
    run(s);
    expect(s.cells.includes(E.Water)).toBe(true);
    expect(s.fields.vitality[310]).toBe(92);
    s.fields.vitality[310] = 0;
    const count = s.cells.filter((v) => v === E.Water).length;
    run(s);
    expect(s.cells.filter((v) => v === E.Water).length).toBe(count);
  });
  it("splits colony reserves rather than creating unlimited replicators", () => {
    const s = pair(E.Mold, E.Wood);
    s.random = () => 0;
    run(s);
    expect(s.cells[311]).toBe(E.Mold);
    expect(s.fields.vitality[310] + s.fields.vitality[311]).toBe(100);
    s.put(312, E.Wood);
    s.fields.vitality[311] = 8;
    run(s, 311);
    expect(s.cells[312]).toBe(E.Wood);
  });
  it("requires charge for metal-eating nanites", () => {
    const s = pair(E.Nanite, E.Copper);
    s.random = () => 0;
    run(s);
    expect(s.cells[311]).toBe(E.Copper);
    s.fields.charge[310] = 200;
    run(s);
    expect(s.cells[311]).toBe(E.Nanite);
  });
  it("extracts salt into crystal growth and respects coral salinity", () => {
    const s = pair(E.SaltCrystal, E.Water);
    s.random = () => 0;
    s.fields.salinity[311] = 40;
    run(s);
    expect(s.fields.salinity[311]).toBe(20);
    expect(s.cells.filter((v) => v === E.SaltCrystal).length).toBe(2);
    const c = pair(E.Coral, E.Water);
    c.random = () => 0;
    c.fields.fertility[311] = 50;
    run(c);
    expect(c.cells[311]).toBe(E.Water);
    c.fields.salinity[311] = 35;
    run(c);
    expect(c.cells[311]).toBe(E.Coral);
  });
  it("propagates fantasy ice but allows strong heat to stop it", () => {
    const s = pair(E.IceNine, E.Water);
    dynamicContact(s, 310, 311);
    expect(s.cells[311]).toBe(E.IceNine);
    s.fields.vitality[310] = 0;
    s.fields.temperature[310] = 200;
    stepEnvironment(s);
    expect(s.cells[310]).not.toBe(E.IceNine);
  });
  it("annihilates matter but respects neutronium containment", () => {
    const s = pair(E.Antimatter, E.Sand);
    dynamicContact(s, 310, 311);
    expect(s.cells[310]).not.toBe(E.Antimatter);
    expect(s.effects.length).toBeGreaterThan(0);
    const wall = pair(E.Antimatter, E.Neutronium);
    dynamicContact(wall, 310, 311);
    expect(wall.cells[311]).toBe(E.Neutronium);
    expect(wall.cells[310]).toBe(E.Antimatter);
  });
  it("limits dramatic work in a single tick", () => {
    const s = pair(E.Sodium, E.Water);
    s.effectBudget = 0;
    dynamicContact(s, 310, 311);
    expect(s.cells[310]).toBe(E.Sodium);
  });
  it("restores older version 2 saves with absent new fields", () => {
    const s = pair(E.Water, E.Stone),
      save = s.serialize();
    delete (save.fields as any).pressure;
    delete (save.fields as any).radiation;
    const restored = new Simulation(30, 24);
    restored.restore(save);
    expect(restored.cells).toEqual(s.cells);
    expect(restored.fields.radiation.every((v) => v === 0)).toBe(true);
  });
  it("round-trips pressure and radiation and deterministically continues a chaotic mixture", () => {
    const s = new Simulation(50, 35, 59);
    for (let i = 0; i < frontierElements.length; i++) {
      const e = frontierElements[i];
      s.set((i % 40) + 5, Math.floor(i / 40) * 5 + 5, e.id);
    }
    s.fields.pressure[255] = 42;
    s.fields.radiation[255] = 61;
    const restored = new Simulation(50, 35);
    restored.restore(JSON.parse(JSON.stringify(s.serialize())));
    for (let n = 0; n < 150; n++) {
      s.step();
      restored.step();
    }
    expect(restored.serialize()).toEqual(s.serialize());
    expect([...s.cells].every((v) => v === 0 || byId.has(v))).toBe(true);
    // Persisted values must remain valid after reactions, not just at initial placement.
    const third = new Simulation(50, 35);
    expect(() => third.restore(s.serialize())).not.toThrow();
  });
  it("keeps a dense full-size effects scene bounded and saveable", () => {
    const s = new Simulation();
    const ids = [
      E.StormCloud,
      E.Uranium,
      E.Mutagen,
      E.Nanite,
      E.Mold,
      E.Firework,
      E.Nitro,
      E.Water,
      E.TeslaCoil,
      E.Battery,
      E.AcidCloud,
      E.GravityWell,
    ];
    for (let y = 35; y < 75; y++)
      for (let x = 80; x < 200; x++) s.set(x, y, ids[(x + y) % ids.length]);
    for (let n = 0; n < 240; n++) s.step();
    expect(s.effects.length).toBeLessThanOrEqual(48);
    const restored = new Simulation();
    expect(() => restored.restore(s.serialize())).not.toThrow();
  }, 15000);
});
