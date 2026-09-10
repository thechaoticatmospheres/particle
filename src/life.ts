import { E, byId } from "./elements";
import { habitats, type Species, material } from "./materials";
import type { Simulation } from "./simulation";

export interface Creature {
  id: number;
  species: Species;
  x: number;
  y: number;
  vx: number;
  vy: number;
  health: number;
  hunger: number;
  thirst: number;
  oxygen: number;
  age: number;
  direction: number;
  status: string;
  cooldown: number;
}
export interface PlantColony {
  id: number;
  x: number;
  y: number;
  height: number;
  age: number;
  health: number;
  maxHeight: number;
  parts: number[];
  seedCooldown: number;
}
export const creatureStates = [
  "Wandering",
  "Seeking fresh water",
  "Foraging",
  "Drinking",
  "Eating",
  "Fleeing danger",
  "Swimming",
  "Resting",
  "Wrong salinity",
  "Too hot",
  "Too cold",
  "Polluted habitat",
  "Out of water",
  "Suffocating",
  "Hungry",
  "Dehydrated",
  "Growing",
] as const;

export function isHabitable(s: Simulation, index: number, species: Species) {
  if (index < 0 || index >= s.cells.length || !material[s.cells[index]].aqueous)
    return false;
  const f = s.fields,
    t = habitats[species];
  return (
    f.salinity[index] >= t.minSalt &&
    f.salinity[index] <= t.maxSalt &&
    f.temperature[index] >= t.minTemp &&
    f.temperature[index] <= t.maxTemp &&
    f.pollution[index] <= t.maxPollution &&
    f.acidity[index] <= t.maxAcidity &&
    f.charge[index] < 40
  );
}
export function spawnCreature(
  s: Simulation,
  species: Species,
  x: number,
  y: number,
): Creature | null {
  x = Math.round(x);
  y = Math.round(y);
  if (
    s.creatures.length >= 120 ||
    x < 2 ||
    x >= s.width - 2 ||
    y < 7 ||
    y >= s.height - 1
  )
    return null;
  if (species !== "human" && !material[Math.max(0, s.get(x, y))].aqueous)
    return null;
  if (species === "human" && !bodyClear(s, x, y)) return null;
  const creature: Creature = {
    id: s.nextEntityId++,
    species,
    x,
    y,
    vx: 0,
    vy: 0,
    health: 100,
    hunger: 85,
    thirst: 85,
    oxygen: 100,
    age: 0,
    direction: s.random() < 0.5 ? -1 : 1,
    status: species === "human" ? "Wandering" : "Swimming",
    cooldown: 0,
  };
  s.creatures.push(creature);
  return creature;
}
export function germinate(s: Simulation, i: number) {
  if (s.plants.length >= 180) return false;
  const x = i % s.width,
    y = Math.floor(i / s.width),
    root = i + s.width;
  if (y >= s.height - 1 || !material[s.cells[root]].soil) return false;
  const f = s.fields;
  if (
    f.moisture[root] < 28 ||
    f.salinity[root] > 10 ||
    f.acidity[root] > 12 ||
    f.pollution[root] > 35 ||
    f.temperature[i] < 4 ||
    f.temperature[i] > 45
  )
    return false;
  if (s.plants.some((p) => Math.abs(p.x - x) < 4 && Math.abs(p.y - y) < 4))
    return false;
  s.put(i, E.Plant);
  s.onDiscover(E.Plant);
  s.plants.push({
    id: s.nextEntityId++,
    x,
    y,
    height: 1,
    age: 0,
    health: 100,
    maxHeight: 14 + Math.floor(s.random() * 10),
    parts: [i],
    seedCooldown: 600,
  });
  s.note("germinated");
  return true;
}

function growPlants(s: Simulation) {
  const f = s.fields,
    w = s.width;
  for (const p of s.plants) {
    p.age += 15;
    const root = (p.y + 1) * w + p.x;
    const rooted = material[s.cells[root]].soil;
    const stem = s.cells[p.y * w + p.x];
    const healthy =
      rooted &&
      (stem === E.Plant || stem === E.Wood) &&
      !f.burning[p.y * w + p.x] &&
      f.temperature[p.y * w + p.x] < 70 &&
      f.moisture[root] >= 20 &&
      f.salinity[root] <= 10 &&
      f.pollution[root] < 35 &&
      f.acidity[root] < 12 &&
      f.temperature[root] > 2 &&
      f.temperature[root] < 48;
    if (f.burning[p.y * w + p.x] || f.temperature[p.y * w + p.x] > 100)
      p.health -= 8;
    else if (!healthy)
      p.health -= f.salinity[root] > 10 || f.acidity[root] > 12 ? 4 : 1;
    else p.health = Math.min(100, p.health + 1);
    if (p.health <= 0) {
      for (const i of p.parts)
        if (s.cells[i] === E.Plant)
          s.transform(i, E.Ash, { fertility: 80, moisture: 15 });
      s.note("plant-died");
      continue;
    }
    for (const i of p.parts)
      if (s.cells[i] === E.Plant) {
        f.vitality[i] = p.health;
        f.moisture[i] = f.moisture[root];
      }
    if (!healthy) continue;
    if (p.age % 60 === 0) f.moisture[root] = Math.max(0, f.moisture[root] - 1);
    const interval = f.fertility[root] > 45 ? 30 : 75;
    if (p.age % interval !== 0 || p.height >= p.maxHeight) continue;
    const topY = p.y - p.height;
    if (topY < 3) continue;
    const top = topY * w + p.x;
    if (s.cells[top] !== 0 && s.cells[top] !== E.Plant) continue;
    s.put(top, p.height > 3 ? E.Wood : E.Plant);
    p.parts.push(top);
    if (p.height === 4) {
      for (let y = p.y - 3; y <= p.y; y++) {
        const i = y * w + p.x;
        if (s.cells[i] === E.Plant) s.transform(i, E.Wood);
      }
    }
    const radius = p.height > 7 ? 4 : 2;
    for (let dy = -2; dy <= 1; dy++)
      for (let dx = -radius; dx <= radius; dx++) {
        if ((dx * dx) / (radius * radius) + (dy * dy) / 5 > 1) continue;
        const px = p.x + dx,
          py = topY + dy;
        if (s.get(px, py) !== 0) continue;
        const i = py * w + px;
        s.put(i, E.Plant);
        f.moisture[i] = f.moisture[root];
        p.parts.push(i);
      }
    p.height++;
    f.moisture[root] = Math.max(0, f.moisture[root] - 2);
    f.fertility[root] = Math.max(0, f.fertility[root] - 1);
    s.note("growing");
  }
  s.plants = s.plants.filter((p) => p.health > 0);
  for (const p of s.plants) {
    if (p.height < p.maxHeight || p.health < 75) continue;
    p.seedCooldown -= 15;
    if (p.seedCooldown <= 0) {
      p.seedCooldown = 900;
      const dx = s.random() < 0.5 ? -7 : 7,
        x = p.x + dx,
        y = p.y - p.height + 2;
      if (s.get(x, y) === 0) {
        s.set(x, y, E.Seed);
        s.note("reseeding");
      }
    }
  }
}
const solid = (id: number) =>
  id < 0 ||
  (id > 0 &&
    id !== E.Plant &&
    ["solid", "powder"].includes(byId.get(id)!.state));
function bodyClear(s: Simulation, x: number, y: number) {
  x = Math.round(x);
  y = Math.round(y);
  for (let dy = 0; dy < 6; dy++)
    for (let dx = -1; dx <= 1; dx++)
      if (solid(s.get(x + dx, y - dy))) return false;
  return true;
}
function waterNear(
  s: Simulation,
  x: number,
  y: number,
  radius: number,
  species: Species,
) {
  for (let distance = 0; distance <= radius; distance++)
    for (const side of [-1, 1]) {
      const px = Math.round(x + distance * side);
      if (px < 0 || px >= s.width) continue;
      for (let dy = -4; dy <= 5; dy++) {
        const py = Math.round(y + dy);
        if (py < 0 || py >= s.height) continue;
        const i = py * s.width + px;
        if (isHabitable(s, i, species)) return i;
      }
    }
  return -1;
}
function danger(s: Simulation, x: number, y: number) {
  const id = s.get(Math.round(x), Math.round(y));
  if (id < 0) return 0;
  const i = Math.round(y) * s.width + Math.round(x),
    f = s.fields;
  return id === E.Fire ||
    id === E.Lava ||
    f.burning[i] > 0 ||
    f.temperature[i] > 90 ||
    f.acidity[i] > 25 ||
    f.charge[i] > 70
    ? 1
    : 0;
}
function updateHuman(s: Simulation, c: Creature) {
  c.hunger = Math.max(0, c.hunger - 0.025);
  c.thirst = Math.max(0, c.thirst - 0.045);
  c.status = "Wandering";
  const x = Math.round(c.x),
    y = Math.round(c.y),
    head = Math.max(0, y - 5) * s.width + x,
    feet = y * s.width + x,
    f = s.fields;
  const inWater = material[s.cells[feet]].aqueous;
  const blockedAir =
    material[s.cells[head]].aqueous || s.cells[head] === E.Smoke;
  c.oxygen = Math.max(0, Math.min(100, c.oxygen + (blockedAir ? -2 : 4)));
  if (blockedAir) c.status = "Suffocating";
  let hurt = 0;
  for (const yy of [y, y - 3, y - 5, y + 1])
    if (yy >= 0 && yy < s.height) {
      const i = yy * s.width + x;
      hurt += danger(s, x, yy) * 5;
      if (s.cells[i] && f.temperature[i] < -10) hurt += 0.3;
      if (material[s.cells[i]].aqueous && f.pollution[i] > 40) hurt += 0.25;
    }
  if (!c.oxygen) hurt += 3;
  if (!c.thirst) {
    hurt += 0.35;
    c.status = "Dehydrated";
  }
  if (!c.hunger) {
    hurt += 0.2;
    c.status = "Hungry";
  }
  if (hurt) c.health = Math.max(0, c.health - hurt);
  else if (c.hunger > 50 && c.thirst > 50)
    c.health = Math.min(100, c.health + 0.05);
  const water = waterNear(s, c.x, c.y, c.thirst < 60 ? 45 : 5, "human");
  if (water >= 0 && c.thirst < 90) {
    const dx = (water % s.width) - c.x;
    if (Math.abs(dx) < 6) {
      c.thirst = Math.min(100, c.thirst + 3);
      c.status = "Drinking";
    } else if (c.thirst < 60) {
      c.direction = Math.sign(dx) || c.direction;
      c.status = "Seeking fresh water";
    }
  }
  if (c.hunger < 75) {
    let food = -1;
    for (let dx = -18; dx <= 18 && food < 0; dx++)
      for (let dy = -5; dy <= 1; dy++) {
        const px = x + dx,
          py = y + dy,
          id = s.get(px, py);
        if (id !== E.Plant && id !== E.Seed) continue;
        const i = py * s.width + px;
        if (f.pollution[i] < 20 && f.acidity[i] < 10 && f.salinity[i] < 10)
          food = i;
      }
    if (food >= 0) {
      const dx = (food % s.width) - c.x;
      if (Math.abs(dx) < 4) {
        s.put(food, 0);
        c.hunger = Math.min(100, c.hunger + 14);
        c.status = "Eating";
      } else if (c.status !== "Seeking fresh water") {
        c.direction = Math.sign(dx) || c.direction;
        c.status = "Foraging";
      }
    }
  }
  if (
    danger(s, x + c.direction * 4, y) ||
    danger(s, x + c.direction * 4, y - 3)
  ) {
    c.direction *= -1;
    c.status = "Fleeing danger";
  }
  if (c.status === "Wandering" && s.random() < 0.008) c.direction *= -1;
  const speed = c.status === "Fleeing danger" ? 0.8 : inWater ? 0.22 : 0.38;
  if (c.status !== "Drinking" && c.status !== "Eating") {
    const nextX = c.x + c.direction * speed;
    if (bodyClear(s, nextX, c.y)) c.x = nextX;
    else if (bodyClear(s, nextX, c.y - 1)) {
      c.x = nextX;
      c.y--;
    } else if (bodyClear(s, nextX, c.y - 2)) {
      c.x = nextX;
      c.y -= 2;
    } else c.direction *= -1;
  }
  // Gravity and swimming are collision-tested one cell at a time (no tunnelling).
  if (inWater) {
    c.status = blockedAir ? "Swimming" : c.status;
    c.vy = blockedAir ? -0.65 : 0.05;
  } else c.vy = Math.min(2.5, c.vy + 0.35);
  const dy = Math.sign(c.vy),
    steps = Math.ceil(Math.abs(c.vy));
  for (let n = 0; n < steps; n++) {
    const amount = Math.min(1, Math.abs(c.vy) - n) * dy;
    if (bodyClear(s, c.x, c.y + amount)) c.y += amount;
    else {
      if (c.vy > 2.2) c.health = Math.max(0, c.health - 0.1);
      c.vy = 0;
      break;
    }
  }
  c.x = Math.max(2, Math.min(s.width - 3, c.x));
  c.y = Math.max(6, Math.min(s.height - 2, c.y));
}
function updateFish(s: Simulation, c: Creature) {
  const f = s.fields,
    i = Math.round(c.y) * s.width + Math.round(c.x),
    id = s.cells[i],
    t = habitats[c.species];
  c.status = "Swimming";
  c.hunger = Math.max(0, c.hunger - 0.008);
  if (!material[id].aqueous) {
    c.health -= 3;
    c.status = "Out of water";
    c.y = Math.min(s.height - 2, c.y + 1);
    return;
  }
  if (f.salinity[i] < t.minSalt || f.salinity[i] > t.maxSalt) {
    c.health -= 0.8;
    c.status = "Wrong salinity";
  }
  if (f.temperature[i] > t.maxTemp) {
    c.health -= 1;
    c.status = "Too hot";
  }
  if (f.temperature[i] < t.minTemp) {
    c.health -= 0.5;
    c.status = "Too cold";
  }
  if (f.pollution[i] > t.maxPollution || f.acidity[i] > t.maxAcidity) {
    c.health -= 1;
    c.status = "Polluted habitat";
  }
  if (f.charge[i] > 50) c.health -= 5;
  if (c.status === "Swimming") c.health = Math.min(100, c.health + 0.12);
  if (!c.hunger) {
    c.health -= 0.2;
    c.status = "Hungry";
  }
  // Nutrients support aquatic food; fish gradually consume them and add waste.
  if (f.fertility[i] > 0 && c.hunger < 90) {
    f.fertility[i]--;
    c.hunger = Math.min(100, c.hunger + 2);
  }
  if (s.random() < 0.002) f.pollution[i] = Math.min(100, f.pollution[i] + 1);
  let best: { x: number; y: number; score: number } | null = null;
  for (const [dx, dy] of [
    [c.direction, 0],
    [c.direction, -1],
    [c.direction, 1],
    [-c.direction, 0],
    [0, -1],
    [0, 1],
  ]) {
    const x = Math.round(c.x + dx),
      y = Math.round(c.y + dy),
      v = s.get(x, y);
    if (v < 0 || !material[v].aqueous) continue;
    const target = y * s.width + x;
    const score =
      (isHabitable(s, target, c.species) ? 10 : 0) -
      Math.abs(f.salinity[target] - (t.minSalt + t.maxSalt) / 2) * 0.03 +
      s.random() * 2;
    if (!best || score > best.score) best = { x, y, score };
  }
  if (best) {
    c.direction = Math.sign(best.x - c.x) || c.direction;
    c.x = best.x;
    c.y = best.y;
  }
}
export function stepLife(s: Simulation) {
  if (s.tick % 15 === 0) {
    for (let i = 0; i < s.cells.length; i++)
      if (
        s.cells[i] === E.Seed ||
        (s.cells[i] === E.Plant &&
          s.fields.age[i] !== 65535 &&
          i + s.width < s.cells.length &&
          material[s.cells[i + s.width]].soil)
      )
        germinate(s, i);
    growPlants(s);
  }
  if (s.tick % 3 !== 0) return;
  for (const c of s.creatures) {
    if (c.health <= 0) continue;
    c.age += 3;
    if (c.species === "human") updateHuman(s, c);
    else updateFish(s, c);
  }
  for (const c of s.creatures)
    if (c.health <= 0) {
      const i = Math.round(c.y) * s.width + Math.round(c.x);
      if (material[s.cells[i]].aqueous) {
        s.fields.pollution[i] = Math.min(100, s.fields.pollution[i] + 20);
        s.fields.fertility[i] = Math.min(100, s.fields.fertility[i] + 15);
      } else if (!s.cells[i]) s.put(i, E.Ash);
      s.deaths++;
      s.note(c.species === "human" ? "human-died" : "fish-died");
    }
  s.creatures = s.creatures.filter((c) => c.health > 0);
}

export function validateLife(
  creatures: unknown,
  plants: unknown,
  width: number,
  height: number,
) {
  if (
    !Array.isArray(creatures) ||
    creatures.length > 120 ||
    !Array.isArray(plants) ||
    plants.length > 180
  )
    throw new Error("Invalid life data");
  const ids = new Set<number>();
  for (const c of creatures) {
    if (
      !c ||
      !Object.hasOwn(habitats, c.species) ||
      !Number.isInteger(c.id) ||
      c.id < 1 ||
      ids.has(c.id) ||
      !creatureStates.includes(c.status) ||
      !Number.isFinite(c.x) ||
      c.x < 1 ||
      c.x > width - 2 ||
      !Number.isFinite(c.y) ||
      c.y < 1 ||
      c.y > height - 2 ||
      !Number.isFinite(c.vx) ||
      Math.abs(c.vx) > 10 ||
      !Number.isFinite(c.vy) ||
      Math.abs(c.vy) > 10 ||
      ![-1, 1].includes(c.direction)
    )
      throw new Error("Invalid creature");
    for (const key of ["health", "hunger", "thirst", "oxygen"])
      if (!Number.isFinite(c[key]) || c[key] < 0 || c[key] > 100)
        throw new Error("Invalid creature vital");
    for (const key of ["age", "cooldown"])
      if (!Number.isSafeInteger(c[key]) || c[key] < 0)
        throw new Error("Invalid creature timer");
    ids.add(c.id);
  }
  for (const p of plants) {
    if (
      !p ||
      !Number.isInteger(p.id) ||
      p.id < 1 ||
      ids.has(p.id) ||
      !Number.isInteger(p.x) ||
      p.x < 0 ||
      p.x >= width ||
      !Number.isInteger(p.y) ||
      p.y < 0 ||
      p.y >= height - 1 ||
      !Number.isInteger(p.height) ||
      p.height < 1 ||
      p.height > 32 ||
      !Number.isInteger(p.maxHeight) ||
      p.maxHeight < 1 ||
      p.maxHeight > 32 ||
      !Number.isFinite(p.health) ||
      p.health < 0 ||
      p.health > 100 ||
      !Number.isSafeInteger(p.age) ||
      p.age < 0 ||
      !Number.isInteger(p.seedCooldown) ||
      p.seedCooldown < 0 ||
      !Array.isArray(p.parts) ||
      p.parts.length > 2000 ||
      !p.parts.every(
        (i: unknown) =>
          Number.isInteger(i) && Number(i) >= 0 && Number(i) < width * height,
      )
    )
      throw new Error("Invalid plant");
    ids.add(p.id);
  }
  return {
    creatures: structuredClone(creatures) as Creature[],
    plants: structuredClone(plants) as PlantColony[],
  };
}
