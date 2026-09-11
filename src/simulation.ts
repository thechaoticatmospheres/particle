import { E, byId, recipes, type Recipe } from "./elements";
import {
  Modifiers,
  modifierNames,
  pack,
  unpack,
  type ModifierName,
  type ModifierValues,
} from "./modifiers";
import { material, habitats, type Species } from "./materials";
import { contact, stepEnvironment } from "./environment";
import {
  stepLife,
  spawnCreature,
  validateLife,
  type Creature,
  type PlantColony,
} from "./life";
export interface WorldSave {
  version: 2;
  width: number;
  height: number;
  cells: number[];
  life: number[];
  tick: number;
  rng: number;
  fields: Record<ModifierName, number[]>;
  creatures: Creature[];
  plants: PlantColony[];
  nextEntityId: number;
  deaths: number;
  milestones: string[];
}
/** Renderer-independent cellular simulation. One cell is one particle. */
export class Simulation {
  cells: Uint8Array;
  life: Uint16Array;
  moved: Uint32Array;
  tick = 0;
  rng: number;
  fields: Modifiers;
  creatures: Creature[] = [];
  plants: PlantColony[] = [];
  nextEntityId = 1;
  deaths = 0;
  effects: {
    x: number;
    y: number;
    radius: number;
    color: string;
    ttl: number;
    kind: "ring" | "arc";
  }[] = [];
  effectBudget = 32;
  milestones = new Set<string>();
  onModifier: (key: string) => void = () => {};
  onDiscover: (id: number, recipe?: Recipe) => void = () => {};
  private reactions = new Map<number, Recipe>();
  constructor(
    public width = 540,
    public height = 220,
    seed = 72831,
  ) {
    this.cells = new Uint8Array(width * height);
    this.life = new Uint16Array(this.cells.length);
    this.moved = new Uint32Array(this.cells.length);
    this.fields = new Modifiers(this.cells.length);
    this.rng = seed;
    for (const r of recipes) {
      this.reactions.set(r.a * 256 + r.b, r);
      this.reactions.set(r.b * 256 + r.a, r);
    }
  }
  random() {
    this.rng ^= this.rng << 13;
    this.rng ^= this.rng >>> 17;
    this.rng ^= this.rng << 5;
    return (this.rng >>> 0) / 4294967296;
  }
  get(x: number, y: number) {
    return x < 0 || x >= this.width || y < 0 || y >= this.height
      ? -1
      : this.cells[y * this.width + x];
  }
  set(x: number, y: number, id: number) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height)
      this.put(y * this.width + x, id);
  }
  put(i: number, id: number) {
    this.cells[i] = id;
    this.life[i] = byId.get(id)?.lifetime ?? 0;
    this.moved[i] = this.tick;
    this.fields.reset(i, id);
  }
  transform(i: number, id: number, overrides: ModifierValues = {}) {
    if (!id) {
      this.put(i, 0);
      return;
    }
    const before = this.fields.read(i);
    this.put(i, id);
    this.fields.assign(i, {
      temperature: before.temperature,
      salinity: before.salinity,
      moisture: before.moisture,
      fertility: before.fertility,
      pollution: before.pollution,
      acidity: before.acidity,
      pressure: before.pressure,
      radiation: before.radiation,
      ...overrides,
    });
  }
  neighbors(i: number) {
    const w = this.width,
      x = i % w;
    const result: number[] = [];
    if (i >= w) result.push(i - w);
    if (x < w - 1) result.push(i + 1);
    if (i + w < this.cells.length) result.push(i + w);
    if (x > 0) result.push(i - 1);
    return result;
  }
  emptyNeighbor(i: number) {
    return this.neighbors(i).find((j) => this.cells[j] === 0) ?? -1;
  }
  note(key: string) {
    if (this.milestones.has(key)) return;
    this.milestones.add(key);
    this.onModifier(key);
  }
  spawn(species: Species, x: number, y: number) {
    return spawnCreature(this, species, x, y);
  }
  clear() {
    this.effects = [];
    this.cells.fill(0);
    this.life.fill(0);
    this.moved.fill(0);
    this.tick = 0;
    this.fields.clear();
    this.creatures = [];
    this.plants = [];
    this.nextEntityId = 1;
    this.deaths = 0;
  }
  paint(
    x: number,
    y: number,
    id: number,
    radius: number,
    replace = false,
    properties: ModifierValues = {},
  ) {
    if (id === 0)
      this.creatures = this.creatures.filter(
        (c) => Math.hypot(c.x - x, c.y - y) > radius + 2,
      );
    for (let dy = -radius; dy <= radius; dy++)
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > radius * radius) continue;
        const cx = Math.round(x + dx),
          cy = Math.round(y + dy),
          v = this.get(cx, cy);
        if (v < 0) continue;
        this.deposit(cx, cy, id, properties, replace);
      }
  }
  /** Inject into fluids as well as air, without overwriting solid terrain. */
  deposit(
    x: number,
    y: number,
    id: number,
    properties: ModifierValues = {},
    replace = false,
  ) {
    const previous = this.get(x, y);
    if (previous < 0) return false;
    const state = byId.get(previous)?.state;
    if (
      id !== 0 &&
      !replace &&
      previous !== 0 &&
      (previous === id ||
        (state !== "liquid" && state !== "gas" && state !== "energy"))
    )
      return false;
    const i = y * this.width + x;
    // Preserve displaced fluid when there is an adjacent opening.
    if (previous && id && !replace) {
      const empty = this.emptyNeighbor(i);
      if (empty >= 0) this.swap(i, empty);
    }
    this.put(i, id);
    if (id) this.fields.assign(i, properties);
    return true;
  }
  swap(i: number, j: number) {
    this.fields.swap(i, j);
    const c = this.cells[i],
      l = this.life[i];
    this.cells[i] = this.cells[j];
    this.life[i] = this.life[j];
    this.cells[j] = c;
    this.life[j] = l;
    this.moved[i] = this.moved[j] = this.tick;
  }
  private move(i: number, x: number, y: number) {
    const v = this.get(x, y);
    if (v < 0) return false;
    const id = this.cells[i];
    const other = byId.get(v),
      self = byId.get(id)!;
    if (
      v === 0 ||
      (other &&
        (other.state === "liquid" || other.state === "gas") &&
        self.density +
          (material[id].aqueous ? this.fields.salinity[i] / 100 : 0) >
          other.density +
            (material[v].aqueous
              ? this.fields.salinity[y * this.width + x] / 100
              : 0) &&
        y > Math.floor(i / this.width))
    ) {
      this.swap(i, y * this.width + x);
      return true;
    }
    return false;
  }
  react(i: number, j: number, force = false) {
    const a = this.cells[i],
      b = this.cells[j],
      r = this.reactions.get(a * 256 + b);
    if (!r || (!force && this.random() > r.chance)) return false;
    const p = a === r.a ? r.products : [r.products[1] ?? 0, r.products[0]];
    this.put(i, p[0]);
    this.put(j, p[1] ?? 0);
    for (const id of r.products) if (id) this.onDiscover(id, r);
    return true;
  }
  pulse(
    x: number,
    y: number,
    radius: number,
    color: string,
    kind: "ring" | "arc" = "ring",
  ) {
    if (this.effects.length < 48)
      this.effects.push({ x, y, radius, color, kind, ttl: 18 });
  }
  explode(x: number, y: number, radius = 12) {
    this.pulse(x, y, radius, "#ffad58");
    for (const c of this.creatures) {
      const distance = Math.hypot(c.x - x, c.y - y);
      if (distance < radius)
        c.health = Math.max(0, c.health - 100 * (1 - distance / radius));
    }
    this.note("explosion");
    for (let dy = -radius; dy <= radius; dy++)
      for (let dx = -radius; dx <= radius; dx++)
        if (dx * dx + dy * dy < radius * radius) {
          const v = this.get(x + dx, y + dy);
          if (v < 0) continue;
          const power = 1 - Math.hypot(dx, dy) / radius,
            i = (y + dy) * this.width + x + dx,
            t = material[v];
          if (v) {
            this.fields.temperature[i] = Math.min(
              2000,
              this.fields.temperature[i] + Math.round(600 * power),
            );
            this.fields.pressure[i] = Math.min(
              100,
              this.fields.pressure[i] + Math.round(90 * power),
            );
          }
          if (t.blastResistance >= power) continue;
          if (
            v &&
            (t.explosive || v === E.Gunpowder) &&
            dx * dx + dy * dy > 4
          ) {
            // Prime nearby charges for the next tick rather than silently deleting them.
            this.fields.temperature[i] = Math.max(
              this.fields.temperature[i],
              t.ignition + 80,
            );
            continue;
          }
          if (t.aqueous) {
            this.put(i, E.Steam);
            this.fields.temperature[i] = 140;
            this.fields.pressure[i] = 75;
          } else if (
            v &&
            byId.get(v)?.state === "solid" &&
            this.random() < 0.45
          ) {
            this.put(i, E.Gravel);
            this.fields.temperature[i] = 180;
          } else this.set(x + dx, y + dy, this.random() < 0.55 ? E.Fire : 0);
        }
  }
  step() {
    this.tick++;
    this.effectBudget = 32;
    this.effects = this.effects.filter((e) => --e.ttl > 0);
    if (this.tick % 4 === 0) stepEnvironment(this);
    const w = this.width,
      h = this.height;
    for (let y = h - 1; y >= 0; y--) {
      const reverse = (this.tick + y) % 2 === 0;
      for (let k = 0; k < w; k++) {
        const x = reverse ? w - 1 - k : k,
          i = y * w + x,
          id = this.cells[i];
        if (!id || this.moved[i] === this.tick) continue;
        const e = byId.get(id)!;
        if (
          id === E.Fire ||
          id === E.Lava ||
          id === E.Spark ||
          material[id].dynamics?.waterReaction
        ) {
          for (const j of this.neighbors(i)) {
            if (this.cells[j]) contact(this, i, j);
            if (this.cells[i] !== id) break;
          }
          if (this.cells[i] !== id) continue;
        }
        if (e.lifetime && this.life[i] > 0 && --this.life[i] === 0) {
          if (id === E.Steam && this.fields.temperature[i] >= 95)
            this.life[i] = 60;
          else {
            this.transform(
              i,
              id === E.Steam ? E.Water : (material[id].expiresTo ?? 0),
              id === E.Steam
                ? { moisture: 100, salinity: 0, pollution: 0, acidity: 0 }
                : {},
            );
            continue;
          }
        }
        const dir = this.random() < 0.5 ? -1 : 1;
        const unrootedPlant = id === E.Plant && this.fields.age[i] !== 65535;
        if (
          unrootedPlant &&
          (material[this.get(x, y + 1)]?.soil ||
            material[this.get(x, y + 1)]?.rootable)
        )
          continue;
        if (
          e.state === "solid" &&
          !unrootedPlant &&
          !(id === E.Metal && this.fields.corrosion[i] >= 85)
        )
          continue;
        if (e.state === "gas" || e.state === "energy") {
          if (y === 0) {
            this.put(i, 0);
            continue;
          }
          if (this.random() < 0.4 && this.move(i, x + dir, y - 1)) continue;
          if (this.move(i, x, y - 1)) continue;
          this.move(i, x + dir, y);
          continue;
        }
        if (
          (id === E.Lava && this.tick % 3 !== 0) ||
          (id === E.Mud && this.tick % 4 !== 0) ||
          this.tick % (material[id].viscosity ?? 1) !== 0
        )
          continue;
        if (
          e.state === "powder" &&
          this.fields.moisture[i] > 25 &&
          this.tick % 3 !== 0
        )
          continue;
        if (
          this.move(i, x, y + 1) ||
          this.move(i, x + dir, y + 1) ||
          this.move(i, x - dir, y + 1)
        )
          continue;
        if (e.state === "liquid") {
          if (this.move(i, x + dir, y)) continue;
          this.move(i, x - dir, y);
        }
      }
    }
    stepLife(this);
  }
  generate(seed = this.rng) {
    this.clear();
    this.rng = seed || 72831;
    const w = this.width,
      h = this.height;
    const surface = (x: number) =>
      Math.floor(
        h * 0.73 +
          Math.sin(x * 0.025) * 7 +
          Math.sin(x * 0.057) * 3 -
          28 * Math.exp(-(((x - w * 0.23) / (w * 0.13)) ** 2)) +
          21 * Math.exp(-(((x - w * 0.59) / (w * 0.13)) ** 2)),
      );
    for (let x = 0; x < w; x++) {
      const top = surface(x);
      const underwater = x > w * 0.42 && x < w * 0.78 && top >= h * 0.74;
      for (let y = top; y < h; y++) {
        let id: number = y < top + 5 && !underwater ? E.Soil : E.Stone;
        if (y > top + 8 && this.random() < 0.13) id = E.Soil;
        this.set(x, y, id);
      }
      if (x > w * 0.42 && x < w * 0.78)
        for (let y = Math.floor(h * 0.74); y < top; y++)
          this.set(x, y, E.Water);
      if (top < h * 0.73)
        for (let y = top - 2; y < top; y++) this.set(x, y, E.Plant);
    }
    const tree = (x: number, y: number, size: number) => {
      for (let dy = 0; dy < size; dy++)
        for (let dx = -1; dx <= 1; dx++) this.set(x + dx, y - dy, E.Wood);
      for (let dy = -size - 8; dy < -size + 6; dy++)
        for (let dx = -10; dx <= 10; dx++)
          if (
            (dx * dx) / 110 + (dy + size + 2) ** 2 / 57 < 1 &&
            this.random() > 0.06
          )
            this.set(x + dx, y + dy, E.Plant);
    };
    for (const px of [0.1, 0.19, 0.28, 0.85, 0.93]) {
      const x = Math.floor(w * px);
      tree(x, surface(x) - 2, 12 + Math.floor(this.random() * 9));
    }
    // Suspended mineral islands invite the player to break, flood, or transform them.
    const island = (cx: number, cy: number, rx: number, depth: number) => {
      for (let dx = -rx; dx <= rx; dx++) {
        const taper = 1 - Math.abs(dx) / rx;
        const top = cy + Math.floor(Math.sin(dx * 0.18) * 2);
        for (let dy = 0; dy < depth * taper; dy++)
          this.set(cx + dx, top + dy, dy < 3 ? E.Soil : E.Stone);
        if (taper > 0.08) this.set(cx + dx, top - 1, E.Plant);
      }
    };
    island(Math.floor(w * 0.22), Math.floor(h * 0.36), 37, 22);
    tree(Math.floor(w * 0.2), Math.floor(h * 0.35), 13);
    island(Math.floor(w * 0.72), Math.floor(h * 0.46), 29, 18);
    tree(Math.floor(w * 0.75), Math.floor(h * 0.45), 14);
    // A small contained pool on the upper island.
    const cx = Math.floor(w * 0.22),
      cy = Math.floor(h * 0.36);
    for (let x = cx + 7; x <= cx + 22; x++)
      for (let y = cy - 1; y <= cy + 4; y++)
        this.set(
          x,
          y,
          x === cx + 7 || x === cx + 22 || y === cy + 4 ? E.Stone : E.Water,
        );
    for (const percent of [0.34, 0.39, 0.8]) {
      const x = Math.floor(w * percent),
        y = surface(x);
      for (let dx = -2; dx <= 2; dx++)
        for (let dy = -4; dy < 0; dy++) this.set(x + dx, y + dy, 0);
      this.set(x, y - 1, E.Seed);
      for (let dx = -3; dx <= 3; dx++)
        for (let dy = 0; dy < 4; dy++) {
          const i = (y + dy) * w + x + dx;
          this.fields.moisture[i] = 80;
          this.fields.fertility[i] = 85;
        }
    }
    this.spawn(
      "human",
      Math.floor(w * 0.13),
      surface(Math.floor(w * 0.13)) - 2,
    );
    this.spawn(
      "human",
      Math.floor(w * 0.81),
      surface(Math.floor(w * 0.81)) - 2,
    );
    for (const px of [0.56, 0.59, 0.63]) {
      const x = Math.floor(w * px),
        y = Math.floor(h * 0.76);
      if (this.get(x, y) === E.Water) {
        this.fields.fertility[y * w + x] = 50;
        this.spawn("freshwater", x, y);
      }
    }
    for (let i = 0; i < this.cells.length; i++)
      if (this.cells[i] === E.Plant) this.fields.age[i] = 65535;
  }
  ecologyLab() {
    this.clear();
    const w = this.width,
      h = this.height,
      ground = Math.floor(h * 0.7),
      waterline = ground - 18;
    for (let x = 0; x < w; x++)
      for (let y = ground; y < h; y++)
        this.set(x, y, y < ground + 7 ? E.Soil : E.Stone);
    for (const [left, right, salt] of [
      [0.07, 0.37, 0],
      [0.63, 0.93, 35],
    ]) {
      const x1 = Math.floor(w * left),
        x2 = Math.floor(w * right);
      for (let x = x1; x < x2; x++)
        for (let y = waterline; y < ground + 20; y++) {
          if (x === x1 || x === x2 - 1 || y === ground + 19) {
            this.set(x, y, E.Glass);
            continue;
          }
          this.set(x, y, E.Water);
          const i = y * w + x;
          this.fields.salinity[i] = salt;
          this.fields.fertility[i] = 35;
        }
      this.spawn(
        salt ? "saltwater" : "freshwater",
        Math.floor((x1 + x2) / 2),
        ground,
      );
      this.spawn(
        salt ? "saltwater" : "freshwater",
        Math.floor((x1 + x2) / 2) + 12,
        ground + 5,
      );
    }
    for (const percent of [0.43, 0.48, 0.55]) {
      const x = Math.floor(w * percent);
      this.set(x, ground - 1, E.Seed);
      for (let dx = -3; dx <= 3; dx++)
        for (let dy = 0; dy < 4; dy++) {
          const i = (ground + dy) * w + x + dx;
          this.fields.moisture[i] = 85;
          this.fields.fertility[i] = 85;
        }
    }
    this.spawn("human", Math.floor(w * 0.51), ground - 1);
    this.spawn("human", Math.floor(w * 0.58), ground - 1);
  }
  serialize(): WorldSave {
    return {
      version: 2,
      width: this.width,
      height: this.height,
      cells: pack(this.cells),
      life: pack(this.life),
      tick: this.tick,
      rng: this.rng,
      fields: Object.fromEntries(
        modifierNames.map((key) => [key, pack(this.fields[key])]),
      ) as Record<ModifierName, number[]>,
      creatures: structuredClone(this.creatures),
      plants: structuredClone(this.plants),
      nextEntityId: this.nextEntityId,
      deaths: this.deaths,
      milestones: [...this.milestones],
    };
  }
  restore(raw: unknown) {
    const s = raw as WorldSave;
    const size = this.cells.length;
    if (
      !s ||
      ![1, 2].includes(s.version) ||
      s.width !== this.width ||
      s.height !== this.height ||
      !Number.isSafeInteger(s.tick) ||
      s.tick < 0 ||
      !Number.isInteger(s.rng) ||
      s.rng < -2147483648 ||
      s.rng > 2147483647
    )
      throw new Error("Invalid world save");
    const legacy = Number(s.version) === 1;
    const cells = legacy ? s.cells : unpack(s.cells, size, 0, 255);
    const life = legacy ? s.life : unpack(s.life, size, 0, 65535);
    if (
      !Array.isArray(cells) ||
      cells.length !== size ||
      !cells.every((v) => Number.isInteger(v) && (v === 0 || byId.has(v))) ||
      !Array.isArray(life) ||
      life.length !== size ||
      !life.every((v) => Number.isInteger(v) && v >= 0 && v <= 65535)
    )
      throw new Error("Invalid world particles");
    const fields = new Modifiers(size);
    if (legacy) {
      for (let i = 0; i < size; i++) fields.reset(i, cells[i]);
    } else {
      if (!s.fields) throw new Error("Missing modifiers");
      for (const key of modifierNames) {
        // New condition fields are optional only for older version 2 saves.
        if (
          (key === "pressure" || key === "radiation") &&
          s.fields[key] === undefined
        )
          continue;
        const max = ["age", "burning", "salinity"].includes(key)
          ? 65535
          : key === "temperature"
            ? 2000
            : key === "charge"
              ? 255
              : 100;
        fields[key].set(
          unpack(s.fields[key], size, key === "temperature" ? -100 : 0, max),
        );
      }
    }
    const living = legacy
      ? { creatures: [] as Creature[], plants: [] as PlantColony[] }
      : validateLife(s.creatures, s.plants, this.width, this.height);
    const nextId = legacy ? 1 : s.nextEntityId,
      deaths = legacy ? 0 : s.deaths,
      milestones = legacy ? [] : s.milestones;
    if (
      !Number.isSafeInteger(nextId) ||
      nextId < 1 ||
      [...living.creatures, ...living.plants].some((e) => e.id >= nextId) ||
      !Number.isSafeInteger(deaths) ||
      deaths < 0 ||
      !Array.isArray(milestones) ||
      milestones.length > 100 ||
      !milestones.every(
        (v) => typeof v === "string" && /^[a-z-]{1,40}$/.test(v),
      )
    )
      throw new Error("Invalid world history");
    // Validation completes before any live state changes.
    this.cells.set(cells);
    this.life.set(life);
    this.fields = fields;
    this.tick = s.tick;
    this.rng = s.rng;
    this.moved.fill(0);
    this.creatures = living.creatures;
    this.plants = living.plants;
    // Anchor older saved canopies before the first movement tick.
    for (const p of this.plants)
      for (const i of p.parts)
        if (this.cells[i] === E.Plant) this.fields.age[i] = 65535;
    this.nextEntityId = nextId;
    this.deaths = deaths;
    this.milestones = new Set(milestones);
  }
}
