import { describe, it, expect } from "vitest";
import { Simulation } from "./simulation";
import { E } from "./elements";
import { contact, evaporate, ignite, stepEnvironment } from "./environment";
import { germinate, isHabitable, stepLife } from "./life";
import { modifierNames, pack, unpack } from "./modifiers";
import { material } from "./materials";

function pair(a: number, b: number) {
  const s = new Simulation(30, 30, 987);
  s.put(310, a);
  s.put(311, b);
  return s;
}
function run(s: Simulation, ticks: number) {
  for (let n = 0; n < ticks; n++) s.step();
}
function patch() {
  const s = new Simulation(60, 50, 93);
  for (let x = 0; x < 60; x++)
    for (let y = 35; y < 50; y++) s.set(x, y, E.Soil);
  for (let i = 35 * 60; i < s.cells.length; i++) {
    s.fields.moisture[i] = 80;
    s.fields.fertility[i] = 90;
  }
  s.set(30, 34, E.Seed);
  return s;
}
function pool(salt = 0) {
  const s = new Simulation(60, 45, 71);
  for (let x = 0; x < 60; x++)
    for (let y = 0; y < 45; y++) {
      s.set(
        x,
        y,
        x === 0 || x === 59 || y === 0 || y === 44 ? E.Glass : E.Water,
      );
      if (s.get(x, y) === E.Water) {
        s.fields.salinity[y * 60 + x] = salt;
        s.fields.fertility[y * 60 + x] = 20;
      }
    }
  return s;
}

describe("dissolution and transported modifiers", () => {
  it("dissolves salt into water without losing salt mass", () => {
    const s = pair(E.Water, E.Salt);
    contact(s, 310, 311);
    expect(s.cells[311]).toBe(0);
    expect(s.fields.salinity[310]).toBe(32);
    expect(s.fields.salinity.reduce((a, b) => a + b, 0)).toBe(32);
  });
  it("respects saturation and leaves excess solid salt", () => {
    const s = pair(E.Water, E.Salt);
    s.fields.salinity[310] = 90;
    contact(s, 310, 311);
    expect(s.fields.salinity[310]).toBe(100);
    expect(s.fields.salinity[311]).toBe(22);
    expect(s.cells[311]).toBe(E.Salt);
  });
  it("dilutes salty water by diffusion while conserving dissolved mass", () => {
    const s = pair(E.Water, E.Water);
    s.fields.salinity[310] = 80;
    contact(s, 310, 311);
    expect(s.fields.salinity[310]).toBeLessThan(80);
    expect(s.fields.salinity[311]).toBeGreaterThan(0);
    expect(s.fields.salinity[310] + s.fields.salinity[311]).toBe(80);
  });
  it("moves salinity, pollution, heat, and acidity with a falling water particle", () => {
    const s = new Simulation(10, 20);
    s.set(5, 2, E.Water);
    s.fields.assign(25, {
      salinity: 35,
      pollution: 20,
      acidity: 8,
      temperature: 60,
    });
    s.step();
    const i = s.cells.indexOf(E.Water);
    expect(i).toBeGreaterThan(25);
    expect(s.fields.salinity[i]).toBe(35);
    expect(s.fields.pollution[i]).toBe(20);
    expect(s.fields.temperature[i]).toBe(60);
    expect(s.fields.salinity[25]).toBe(0);
  });
  it("brine wets and salinizes soil while conserving salt", () => {
    const s = pair(E.Water, E.Soil);
    s.fields.salinity[310] = 40;
    s.fields.moisture[311] = 0;
    contact(s, 310, 311);
    expect(s.fields.moisture[311]).toBeGreaterThan(0);
    expect(s.fields.salinity[311]).toBeGreaterThan(0);
    expect(s.fields.salinity[310] + s.fields.salinity[311]).toBe(40);
  });
  it("steam is fresh and salt stays behind during boiling", () => {
    const s = pair(E.Water, 0);
    s.fields.assign(310, { salinity: 32, pollution: 10, temperature: 120 });
    expect(evaporate(s, 310)).toBe(true);
    expect(s.cells[310]).toBe(E.Salt);
    expect(s.fields.salinity[310]).toBe(32);
    const steam = s.cells.indexOf(E.Steam);
    expect(steam).toBeGreaterThanOrEqual(0);
    expect(s.fields.salinity[steam]).toBe(0);
    expect(s.fields.pollution[steam]).toBe(0);
  });
  it("defers brine boiling when no cell can hold the steam", () => {
    const s = pair(E.Water, E.Glass);
    for (const j of s.neighbors(310)) s.put(j, E.Glass);
    s.fields.salinity[310] = 32;
    expect(evaporate(s, 310)).toBe(false);
    expect(s.cells[310]).toBe(E.Water);
    expect(s.fields.salinity[310]).toBe(32);
  });
  it("erasing removes hidden modifier residue", () => {
    const s = pair(E.Water, 0);
    s.fields.assign(310, { salinity: 55, pollution: 40, charge: 100 });
    s.paint(10, 10, 0, 2);
    for (const key of modifierNames) expect(s.fields[key][310]).toBe(0);
  });
});

describe("heat, phases, and fuel", () => {
  it("salt melts moderately cold ice into brine", () => {
    const s = pair(E.Salt, E.Ice);
    s.fields.temperature[310] = -5;
    s.fields.temperature[311] = -5;
    contact(s, 310, 311);
    stepEnvironment(s);
    expect(s.cells[311]).toBe(E.Water);
    expect(s.fields.salinity[311]).toBe(32);
  });
  it("conducts heat between touching materials", () => {
    const s = pair(E.Metal, E.Metal);
    s.fields.temperature[310] = 200;
    s.fields.temperature[311] = 20;
    contact(s, 310, 311);
    expect(s.fields.temperature[310]).toBeLessThan(200);
    expect(s.fields.temperature[311]).toBeGreaterThan(20);
    expect(s.fields.temperature[310] + s.fields.temperature[311]).toBe(220);
  });
  it("freezes fresh water sooner than equally cold salty water", () => {
    const fresh = pair(E.Water, E.Glass),
      salt = pair(E.Water, E.Glass);
    for (const s of [fresh, salt]) {
      s.fields.temperature[310] = -4;
      s.fields.temperature[311] = -4;
    }
    salt.fields.salinity[310] = 35;
    stepEnvironment(fresh);
    stepEnvironment(salt);
    expect(fresh.cells[310]).toBe(E.Ice);
    expect(salt.cells[310]).toBe(E.Water);
  });
  it("melting ice preserves dissolved salt", () => {
    const s = pair(E.Ice, 0);
    s.fields.assign(310, { temperature: 12, salinity: 15 });
    stepEnvironment(s);
    expect(s.cells[310]).toBe(E.Water);
    expect(s.fields.salinity[310]).toBe(15);
  });
  it("cold surfaces capture steam as snow", () => {
    const s = pair(E.Steam, E.Ice);
    s.fields.temperature[310] = 50;
    contact(s, 310, 311);
    expect(s.cells[310]).toBe(E.Snow);
  });
  it("quenches lava into obsidian", () => {
    const s = pair(E.Lava, E.Water);
    contact(s, 310, 311);
    expect(s.cells[310]).toBe(E.Obsidian);
  });
  it("cooled lava becomes stone without water", () => {
    const s = pair(E.Lava, 0);
    s.fields.temperature[310] = 600;
    stepEnvironment(s);
    expect(s.cells[310]).toBe(E.Stone);
  });
  it("heat melts sand into glass", () => {
    const s = pair(E.Sand, 0);
    s.fields.temperature[310] = 750;
    stepEnvironment(s);
    expect(s.cells[310]).toBe(E.Glass);
  });
  it("dry wood burns in place and returns ash", () => {
    const s = pair(E.Wood, 0);
    expect(ignite(s, 310)).toBe(true);
    expect(s.cells[310]).toBe(E.Wood);
    for (let n = 0; n < 60; n++) {
      s.tick += 4;
      stepEnvironment(s);
    }
    expect(s.cells[310]).toBe(E.Ash);
    expect(s.fields.fertility[310]).toBeGreaterThan(60);
  });
  it("wet wood resists ignition and water extinguishes burning wood", () => {
    const s = pair(E.Wood, E.Water);
    s.fields.moisture[310] = 60;
    expect(ignite(s, 310)).toBe(false);
    s.fields.moisture[310] = 0;
    expect(ignite(s, 310)).toBe(true);
    contact(s, 311, 310);
    expect(s.fields.burning[310]).toBe(0);
  });
  it("wet gunpowder cannot explode, but dry powder can", () => {
    const s = pair(E.Gunpowder, 0);
    s.fields.moisture[310] = 70;
    expect(ignite(s, 310)).toBe(false);
    expect(s.cells[310]).toBe(E.Gunpowder);
    s.fields.moisture[310] = 0;
    expect(ignite(s, 310)).toBe(true);
    expect(s.cells.includes(E.Gunpowder)).toBe(false);
    expect(s.cells.filter((id) => id === E.Fire).length).toBeGreaterThan(10);
  });
  it("water-saturated soil becomes mud and drying restores soil", () => {
    const s = pair(E.Soil, 0);
    s.fields.moisture[310] = 100;
    stepEnvironment(s);
    expect(s.cells[310]).toBe(E.Mud);
    s.fields.moisture[310] = 20;
    stepEnvironment(s);
    expect(s.cells[310]).toBe(E.Soil);
  });
});

describe("pollution, nutrients, corrosion, and electricity", () => {
  it("acidic water transfers acidity into depleted soil", () => {
    const s = pair(E.Water, E.Soil);
    s.fields.assign(310, { acidity: 80 });
    s.fields.assign(311, { fertility: 0, moisture: 0 });
    contact(s, 310, 311);
    expect(s.fields.acidity[311]).toBeGreaterThan(0);
    expect(s.fields.acidity[310]).toBeLessThan(80);
  });
  it("smoke pollutes water and is absorbed", () => {
    const s = pair(E.Water, E.Smoke);
    contact(s, 310, 311);
    expect(s.cells[311]).toBe(0);
    expect(s.fields.pollution[310]).toBeGreaterThan(0);
  });
  it("ash enriches soil and is consumed", () => {
    const s = pair(E.Ash, E.Soil);
    s.fields.fertility[311] = 10;
    contact(s, 310, 311);
    expect(s.cells[310]).toBe(0);
    expect(s.fields.fertility[311]).toBe(50);
  });
  it("ash neutralizes acid", () => {
    const s = pair(E.Acid, E.Ash);
    s.fields.acidity[310] = 25;
    contact(s, 310, 311);
    stepEnvironment(s);
    expect(s.fields.acidity[310]).toBe(0);
    expect(s.cells[310]).toBe(E.Water);
  });
  it("acid dilution spreads acidity without inventing more", () => {
    const s = pair(E.Acid, E.Water);
    contact(s, 310, 311);
    expect(s.fields.acidity[310]).toBeLessThan(100);
    expect(s.fields.acidity[311]).toBeGreaterThan(0);
    expect(s.fields.acidity[310] + s.fields.acidity[311]).toBe(100);
  });
  it("acid corrodes vulnerable solids while resistant glass survives", () => {
    const s = pair(E.Acid, E.Wood);
    for (let n = 0; n < 35; n++) contact(s, 310, 311);
    expect(s.cells[311]).toBe(0);
    const glass = pair(E.Acid, E.Glass);
    for (let n = 0; n < 100; n++) contact(glass, 310, 311);
    expect(glass.cells[311]).toBe(E.Glass);
    expect(glass.fields.corrosion[311]).toBe(0);
  });
  it("salt accelerates corrosion with the same random sequence", () => {
    const a = pair(E.Metal, E.Water),
      b = pair(E.Metal, E.Water);
    b.fields.salinity[311] = 35;
    for (let n = 0; n < 80; n++) {
      contact(a, 310, 311);
      contact(b, 310, 311);
    }
    expect(b.fields.corrosion[310]).toBeGreaterThan(a.fields.corrosion[310]);
  });
  it("sparks charge metal and charge dissipates without a source", () => {
    const s = pair(E.Spark, E.Metal);
    contact(s, 310, 311);
    expect(s.fields.charge[311]).toBeGreaterThan(100);
    s.put(310, 0);
    for (let n = 0; n < 25; n++) stepEnvironment(s);
    expect(s.fields.charge[311]).toBe(0);
  });
  it("salty water conducts a pulse farther than fresh water", () => {
    const a = pair(E.Water, E.Water),
      b = pair(E.Water, E.Water);
    for (const s of [a, b]) s.fields.charge[310] = 255;
    b.fields.salinity[310] = 35;
    b.fields.salinity[311] = 35;
    stepEnvironment(a);
    stepEnvironment(b);
    expect(b.fields.charge[311]).toBeGreaterThan(a.fields.charge[311]);
  });
  it("blast-resistant materials survive but living creatures are hurt", () => {
    const s = pair(E.Metal, E.Obsidian);
    const human = s.spawn("human", 10, 8)!;
    expect(human).not.toBeNull();
    s.explode(10, 10);
    expect(s.cells[310]).toBe(E.Metal);
    expect(s.cells[311]).toBe(E.Obsidian);
    expect(human.health).toBeLessThan(100);
  });
});

describe("rooted plant lifecycle", () => {
  it("germinates on moist soil and grows a multi-cell woody plant", () => {
    const s = patch();
    run(s, 300);
    expect(s.plants.length).toBeGreaterThan(0);
    expect(s.plants[0].height).toBeGreaterThan(5);
    expect(s.cells.filter((id) => id === E.Wood).length).toBeGreaterThan(2);
    expect(s.cells.filter((id) => id === E.Plant).length).toBeGreaterThan(10);
  });
  it("does not germinate without soil or with saline/dry soil", () => {
    const s = patch(),
      root = 35 * 60 + 30;
    for (const mode of ["dry", "salt", "no-soil"]) {
      s.set(30, 34, E.Seed);
      s.fields.moisture[root] = mode === "dry" ? 0 : 80;
      s.fields.salinity[root] = mode === "salt" ? 30 : 0;
      if (mode === "no-soil") s.put(root, E.Stone);
      expect(germinate(s, 34 * 60 + 30)).toBe(false);
    }
  });
  it("nutrients accelerate growth under otherwise identical conditions", () => {
    const rich = patch(),
      poor = patch();
    for (let i = 0; i < poor.cells.length; i++)
      if (material[poor.cells[i]].soil) poor.fields.fertility[i] = 0;
    run(rich, 240);
    run(poor, 240);
    expect(rich.plants[0].height).toBeGreaterThan(poor.plants[0].height);
  });
  it("salty roots kill a plant and its leaves return nutrients", () => {
    const s = patch();
    run(s, 180);
    expect(s.plants.length).toBe(1);
    for (let i = 0; i < s.cells.length; i++)
      if (material[s.cells[i]].soil) s.fields.salinity[i] = 40;
    run(s, 500);
    expect(s.plants.length).toBe(0);
    expect(s.milestones.has("plant-died")).toBe(true);
  });
  it("mature plants release new seeds", () => {
    const s = patch();
    germinate(s, 34 * 60 + 30);
    const p = s.plants[0];
    p.height = p.maxHeight;
    p.seedCooldown = 15;
    s.tick = 15;
    stepLife(s);
    expect(s.cells.includes(E.Seed)).toBe(true);
    expect(s.milestones.has("reseeding")).toBe(true);
  });
});

describe("humans and species-specific habitats", () => {
  it("creatures with zero health cannot revive in safe surroundings", () => {
    const s = pool(),
      fish = s.spawn("freshwater", 20, 20)!;
    fish.health = 0;
    s.tick = 3;
    stepLife(s);
    expect(s.creatures).toHaveLength(0);
    expect(s.deaths).toBe(1);
  });
  it("uses different salinity tolerances for fresh and saltwater fish", () => {
    const fresh = pool(),
      salt = pool(35),
      i = 20 * 60 + 20;
    expect(isHabitable(fresh, i, "freshwater")).toBe(true);
    expect(isHabitable(fresh, i, "saltwater")).toBe(false);
    expect(isHabitable(salt, i, "saltwater")).toBe(true);
    expect(isHabitable(salt, i, "freshwater")).toBe(false);
  });
  it("fish survive suitable water and lose health in the wrong salinity", () => {
    const fresh = pool();
    const good = fresh.spawn("freshwater", 20, 20)!,
      bad = fresh.spawn("saltwater", 40, 20)!;
    run(fresh, 90);
    expect(good.health).toBeGreaterThan(95);
    expect(bad.health).toBeLessThan(85);
    expect(good.status).toBe("Swimming");
  });
  it("rejects fish placement on land", () => {
    const s = patch();
    expect(s.spawn("freshwater", 10, 20)).toBeNull();
  });
  it("humans fall onto terrain and walk", () => {
    const s = patch(),
      c = s.spawn("human", 10, 15)!;
    run(s, 150);
    expect(c.y).toBeGreaterThan(25);
    expect(c.y).toBeLessThan(35);
    expect(c.x).not.toBe(10);
    expect(c.health).toBeGreaterThan(95);
  });
  it("humans drink clean freshwater nearby but refuse brine", () => {
    for (const salt of [0, 35]) {
      const s = patch();
      const c = s.spawn("human", 12, 34)!;
      c.thirst = 30;
      s.set(15, 34, E.Water);
      s.fields.salinity[34 * 60 + 15] = salt;
      s.tick = 3;
      stepLife(s);
      expect(c.thirst > 30).toBe(salt === 0);
    }
  });
  it("humans forage nearby edible plants", () => {
    const s = patch();
    const c = s.spawn("human", 12, 34)!;
    c.hunger = 30;
    s.set(14, 32, E.Plant);
    s.tick = 3;
    stepLife(s);
    expect(c.hunger).toBeGreaterThan(30);
    expect(s.get(14, 32)).toBe(0);
  });
  it("hot, polluted, acidic, or charged water is unsafe for fish", () => {
    for (const props of [
      { temperature: 90 },
      { pollution: 70 },
      { acidity: 50 },
      { charge: 220 },
    ]) {
      const s = pool();
      s.fields.assign(20 * 60 + 20, props);
      expect(isHabitable(s, 20 * 60 + 20, "freshwater")).toBe(false);
    }
  });
  it("dead fish pollute water and increment deaths", () => {
    const s = pool(),
      c = s.spawn("freshwater", 20, 20)!;
    c.health = 0;
    s.fields.pollution[20 * 60 + 20] = 80;
    s.tick = 3;
    stepLife(s);
    expect(s.creatures).toHaveLength(0);
    expect(s.deaths).toBe(1);
  });
});

describe("versioned ecology saves", () => {
  it("keeps a full living world stable and compact over 1,000 ticks", () => {
    const s = new Simulation();
    s.generate(72831);
    run(s, 1000);
    expect(s.plants.length).toBeGreaterThan(0);
    expect(s.creatures.some((c) => c.species === "human")).toBe(true);
    for (const c of s.creatures) {
      expect(Number.isFinite(c.x + c.y + c.health)).toBe(true);
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.x).toBeLessThan(s.width);
    }
    expect(JSON.stringify(s.serialize()).length * 2).toBeLessThan(4_000_000);
  }, 15000);
  it("round-trips all modifiers, creatures, plants, and deterministic continuation", () => {
    const s = patch();
    run(s, 60);
    s.spawn("human", 10, 25);
    s.fields.assign(30 * 60 + 20, {
      temperature: 145,
      salinity: 35,
      charge: 80,
      pollution: 50,
    });
    const restored = new Simulation(60, 50);
    restored.restore(JSON.parse(JSON.stringify(s.serialize())));
    expect(restored.serialize()).toEqual(s.serialize());
    run(s, 60);
    run(restored, 60);
    expect(restored.serialize()).toEqual(s.serialize());
  });
  it("migrates v1 worlds with sensible default material properties", () => {
    const s = new Simulation(10, 10);
    const cells = new Array(100).fill(0);
    cells[55] = E.Water;
    cells[65] = E.Soil;
    s.restore({
      version: 1,
      width: 10,
      height: 10,
      cells,
      life: new Array(100).fill(0),
      tick: 10,
      rng: 57,
    });
    expect(s.fields.moisture[55]).toBe(100);
    expect(s.fields.fertility[65]).toBe(65);
    expect(s.serialize().version).toBe(2);
  });
  it("rejects malformed modifier data before changing a live world", () => {
    const s = patch(),
      before = s.serialize(),
      bad = structuredClone(before);
    bad.fields.salinity = [99999999, 0];
    expect(() => s.restore(bad)).toThrow();
    expect(s.serialize()).toEqual(before);
  });
  it("rejects invalid creature data atomically", () => {
    const s = patch();
    s.spawn("human", 10, 20);
    const before = s.serialize(),
      bad = structuredClone(before);
    bad.creatures[0].x = NaN;
    expect(() => s.restore(bad)).toThrow();
    expect(s.serialize()).toEqual(before);
  });
  it("packs default worlds below the usual localStorage limit", () => {
    const s = new Simulation();
    s.generate(45);
    const bytes = JSON.stringify(s.serialize()).length * 2;
    expect(bytes).toBeLessThan(4_000_000);
  });
  it("validates run-length fields", () => {
    expect(unpack(pack([0, 0, 1, 1, 1, 5]), 6, 0, 100)).toEqual([
      0, 0, 1, 1, 1, 5,
    ]);
    expect(() => unpack([100, 0], 6, 0, 100)).toThrow();
    expect(() => unpack([1, -1, 5, 0], 6, 0, 100)).toThrow();
  });
});
