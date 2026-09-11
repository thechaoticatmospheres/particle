import { E, byId } from "./elements";
import { material } from "./materials";
import type { Simulation } from "./simulation";
const clamp = (n: number) => Math.max(0, Math.min(100, n));
const temp = (n: number) => Math.max(-100, Math.min(2000, Math.round(n)));

/** Bounded impulses move real particles, carrying all their conditions with them. */
export function impulse(
  s: Simulation,
  i: number,
  radius: number,
  inward = false,
  magnetic = false,
) {
  const x = i % s.width,
    y = Math.floor(i / s.width);
  const shifted = new Set<number>();
  for (let dy = -radius; dy <= radius; dy++)
    for (let dx = -radius; dx <= radius; dx++) {
      if ((!dx && !dy) || dx * dx + dy * dy > radius * radius) continue;
      const id = s.get(x + dx, y + dy);
      if (id <= 0) continue;
      const j = (y + dy) * s.width + x + dx;
      if (shifted.has(j)) continue;
      if (
        byId.get(id)!.state === "solid" ||
        (magnetic && material[id].electrical < 0.4)
      )
        continue;
      const sign = inward ? -1 : 1,
        tx = x + dx + Math.sign(dx) * sign,
        ty = y + dy + Math.sign(dy) * sign;
      // Move by one cell, never tunnel through an occupied wall or wrap a row.
      if (s.get(tx, ty) === 0) {
        const destination = ty * s.width + tx;
        s.swap(j, destination);
        shifted.add(destination);
      }
    }
  s.pulse(x, y, radius, magnetic ? "#cc9aff" : inward ? "#a88ce8" : "#8fe3f5");
}

export function dynamicContact(s: Simulation, a: number, b: number) {
  const id = s.cells[a],
    other = s.cells[b],
    t = material[id],
    u = material[other],
    d = t.dynamics,
    f = s.fields;
  if (!id || !other) return;
  // Radioactive solutes travel with water and wet absorbent matter.
  if (
    f.radiation[a] > f.radiation[b] &&
    !u.dynamics?.shield &&
    (u.aqueous || u.absorbency)
  ) {
    const amount = Math.min(
      4,
      Math.floor((f.radiation[a] - f.radiation[b]) / 4),
    );
    f.radiation[a] -= amount;
    f.radiation[b] += amount;
  }
  if (!d) return;
  if (
    d.annihilate &&
    !u.dynamics?.annihilate &&
    !u.dynamics?.shield &&
    s.effectBudget > 0
  ) {
    s.effectBudget--;
    s.put(a, 0);
    s.put(b, 0);
    s.explode(a % s.width, Math.floor(a / s.width), 13);
    return;
  }
  if (d.waterReaction && u.aqueous && s.effectBudget > 0) {
    const r = d.waterReaction;
    s.effectBudget--;
    if (r.burst) {
      const x = a % s.width,
        y = Math.floor(a / s.width);
      let cluster = 0;
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++)
          if (s.get(x + dx, y + dy) === id) cluster++;
      s.explode(x, y, r.burst + Math.min(5, Math.floor(cluster / 3)));
      s.note("water-reactive");
    }
    s.put(a, r.residue ?? 0);
    s.put(b, r.gas);
    f.temperature[b] = temp(r.heat);
    f.pressure[b] = 65;
    if (s.cells[a]) f.temperature[a] = temp(r.heat);
    s.pulse(a % s.width, Math.floor(a / s.width), r.burst ?? 4, "#e0edb0");
    return;
  }
  const reaction = d.contacts?.find((r) => r.target === other);
  if (reaction && s.effectBudget > 0) {
    s.effectBudget--;
    s.put(b, reaction.product);
    if (reaction.self !== undefined) s.put(a, reaction.self);
    if (reaction.heat !== undefined) {
      f.temperature[b] = temp(reaction.heat);
      if (s.cells[a]) f.temperature[a] = temp(reaction.heat);
    }
    if (reaction.burst) {
      f.pressure[b] = 90;
      impulse(s, b, reaction.burst);
    }
    return;
  }
  if (d.cure && f.vitality[a] > 0) {
    if ([E.Virus, E.Mutagen, E.Mold].includes(other as 186)) {
      s.put(b, E.Compost);
      f.vitality[a] = Math.max(0, f.vitality[a] - 10);
    } else if (f.radiation[b] > 0) {
      const amount = Math.min(8, f.radiation[b], f.vitality[a]);
      f.radiation[b] -= amount;
      f.vitality[a] -= amount;
    }
  }
  if (
    d.mutate &&
    u.organic &&
    !u.dynamics?.mutate &&
    s.random() < 0.08 &&
    f.vitality[a] >= 20
  ) {
    f.vitality[a] -= 20;
    s.put(
      b,
      [E.FireBloom, E.FrostBloom, E.Carnivore, E.GlowMoss][
        Math.floor(s.random() * 4)
      ],
    );
    s.pulse(b % s.width, Math.floor(b / s.width), 4, "#b6f588");
  }
}

export function stepDynamics(s: Simulation, i: number) {
  const id = s.cells[i],
    t = material[id],
    d = t.dynamics,
    f = s.fields,
    near = s.neighbors(i);
  if (f.radiation[i]) {
    if (s.tick % 60 === 0) f.radiation[i]--;
    if (t.organic && f.radiation[i] > 25)
      f.vitality[i] = Math.max(0, f.vitality[i] - 1);
    if (
      t.organic &&
      f.radiation[i] > 70 &&
      s.tick % 60 === 0 &&
      s.random() < 0.08 &&
      s.effectBudget > 0
    ) {
      s.effectBudget--;
      s.put(
        i,
        [E.GlowMoss, E.Carnivore, E.FireBloom, E.FrostBloom][
          Math.floor(s.random() * 4)
        ],
      );
      s.pulse(i % s.width, Math.floor(i / s.width), 5, "#b6f588");
      return;
    }
  }
  const state = byId.get(id)!.state;
  if (state === "gas" || d?.pressureBurst) {
    const sealed = near.length === 4 && near.every((j) => !!s.cells[j]);
    f.pressure[i] = clamp(
      f.pressure[i] +
        (sealed ? 3 + Math.max(0, Math.floor(f.temperature[i] / 200)) : -8),
    );
    if (id === E.Capacitor && f.charge[i] > 30)
      f.pressure[i] = clamp(f.pressure[i] + 12);
    if (f.pressure[i] >= 85 && s.effectBudget > 0) {
      s.effectBudget--;
      f.pressure[i] = 0;
      const radius = d?.pressureBurst ?? 4;
      if (id === E.Capacitor) for (const j of near) f.charge[j] = 255;
      // Break only weak immediate confinement, so a sealed vessel can actually vent.
      for (const j of near)
        if (
          material[s.cells[j]].blastResistance < 0.5 &&
          byId.get(s.cells[j])?.state === "solid"
        )
          s.put(j, E.Gravel);
      impulse(s, i, radius);
      s.note("pressure-burst");
    }
  }
  if (!d) return;
  if (d.source && f.vitality[i] > 0) {
    const sky =
      id !== E.SolarCell ||
      (() => {
        for (let j = i - s.width; j >= 0; j -= s.width)
          if (s.cells[j]) return false;
        return true;
      })();
    if (sky) {
      f.charge[i] = Math.max(f.charge[i], d.source);
      if (s.tick % 12 === 0 && id !== E.SolarCell) f.vitality[i]--;
    }
  }
  const powered = f.charge[i] > 45;
  if (
    d.thermal !== undefined &&
    (!d.powered ? f.vitality[i] > 0 : powered) &&
    (!t.fuel || f.burning[i] || t.defaultTemperature > 100)
  ) {
    const heat = d.thermal;
    f.temperature[i] = temp(
      f.temperature[i] +
        Math.sign(heat - f.temperature[i]) *
          Math.min(80, Math.abs(heat - f.temperature[i])),
    );
    for (const j of near)
      if (s.cells[j])
        f.temperature[j] = temp(
          f.temperature[j] +
            Math.sign(heat - f.temperature[j]) *
              Math.min(35, Math.abs(heat - f.temperature[j])),
        );
    if (d.powered) f.charge[i] = Math.max(0, f.charge[i] - 25);
    else if (!f.burning[i]) f.vitality[i] = Math.max(0, f.vitality[i] - 2);
  }
  if (id === E.ReactorFuel)
    f.temperature[i] = temp(f.temperature[i] + Math.floor(f.radiation[i] / 3));
  // Spatial staggering and an impulse budget prevent dense brushes creating unbounded work.
  if (s.tick % 12 !== (i % 3) * 4) return;
  if (d.radiation && s.effectBudget > 0) {
    s.effectBudget--;
    f.radiation[i] = clamp(f.radiation[i] + d.radiation);
    const x = i % s.width,
      y = Math.floor(i / s.width);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ])
      for (let r = 1; r <= 6; r++) {
        const v = s.get(x + dx * r, y + dy * r);
        if (v < 0 || material[v].dynamics?.shield) break;
        if (v) {
          const j = (y + dy * r) * s.width + x + dx * r;
          f.radiation[j] = clamp(
            f.radiation[j] + Math.max(1, d.radiation - r * 2),
          );
          f.pollution[j] = clamp(f.pollution[j] + 1);
        }
      }
  }
  if (
    (d.force ||
      (powered && (d.powered === "magnet" || d.powered === "repel"))) &&
    s.effectBudget > 0
  ) {
    s.effectBudget--;
    const force = d.force ?? (d.powered === "magnet" ? "magnet" : "push");
    if (force === "void") {
      const target = near.find(
        (j) =>
          s.cells[j] &&
          !material[s.cells[j]].dynamics?.shield &&
          s.cells[j] !== id,
      );
      if (target !== undefined && f.vitality[i] >= 10) {
        s.put(target, 0);
        f.vitality[i] -= 10;
        s.pulse(i % s.width, Math.floor(i / s.width), 3, "#b184d9");
      }
    } else impulse(s, i, d.range ?? 6, force !== "push", force === "magnet");
    if (d.powered) f.charge[i] = Math.max(0, f.charge[i] - 35);
  }
  if (powered && d.powered === "arc" && s.effectBudget > 0) {
    s.effectBudget--;
    const x = i % s.width,
      y = Math.floor(i / s.width),
      range = d.range ?? 8;
    const dx = Math.floor(s.random() * 3) - 1,
      dy = Math.floor(s.random() * 3) - 1;
    if (dx || dy)
      for (let r = 1; r <= range; r++) {
        const v = s.get(x + dx * r, y + dy * r);
        if (v < 0) break;
        const j = (y + dy * r) * s.width + x + dx * r;
        if (v) {
          if (material[v].electrical || material[v].aqueous) {
            f.charge[j] = 220;
            f.temperature[j] = temp(f.temperature[j] + 120);
          } else if (material[v].fuel) {
            f.temperature[j] = temp(material[v].ignition + 50);
          }
          break;
        }
        if (r % 2 === 0) s.put(j, E.Spark);
      }
    f.charge[i] = Math.max(0, f.charge[i] - 45);
    s.pulse(x, y, range, "#ead1ff", "arc");
  }
  if (powered && d.powered === "electrolysis" && f.vitality[i] >= 8) {
    const empty = s.emptyNeighbor(i);
    if (id === E.Replicator) {
      const target = near.find(
        (j) => s.cells[j] && s.cells[j] !== id && s.cells[j] !== E.Spark,
      );
      if (empty >= 0 && target !== undefined) {
        s.put(empty, s.cells[target]);
        f.vitality[empty] = Math.min(20, f.vitality[empty]);
        f.vitality[i] -= 8;
        f.charge[i] = 0;
      }
    } else {
      const water = near.find((j) => material[s.cells[j]].aqueous);
      if (empty >= 0 && water !== undefined) {
        s.put(water, E.Hydrogen);
        s.put(empty, E.Oxygen);
        f.vitality[i] -= 8;
        f.charge[i] = 0;
      }
    }
  }
  if (
    d.emit &&
    f.vitality[i] >= d.emit.cost &&
    (!d.emit.charged || powered) &&
    (!t.fuel ||
      f.burning[i] ||
      id === E.FireBloom ||
      id === E.Yeast ||
      id === E.Lotus ||
      id === E.Mycelium ||
      id === E.LavaSponge) &&
    s.random() < d.emit.chance
  ) {
    const target = s.emptyNeighbor(i);
    if (target >= 0) {
      s.put(target, d.emit.id);
      f.vitality[i] -= d.emit.cost;
    }
  }
  const c = d.colony;
  // Living colonies can recover by eating real nutrients; exhausted ground stops renewal.
  if (
    c &&
    (c.food === "soil" || c.food === "water") &&
    (s.tick - (i % 3) * 4) % 60 === 0 &&
    f.vitality[i] < 80
  ) {
    const source = near.find((j) => {
      const u = material[s.cells[j]];
      return (
        (c.food === "soil" ? u.soil && f.moisture[j] >= 20 : u.aqueous) &&
        f.fertility[j] >= 8 &&
        f.pollution[j] < 30 &&
        f.acidity[j] < 15 &&
        f.salinity[j] >= (c.minSalt ?? 0) &&
        f.salinity[j] <= (c.maxSalt ?? 15)
      );
    });
    if (source !== undefined) {
      f.fertility[source] -= 8;
      f.vitality[i] = Math.min(100, f.vitality[i] + 16);
      f.moisture[i] = Math.min(100, f.moisture[i] + 4);
    }
  }
  if (
    c &&
    (!c.charged || powered) &&
    f.vitality[i] >= 16 &&
    (id === E.FrostBloom || f.temperature[i] >= 0) &&
    f.temperature[i] < 80 &&
    f.acidity[i] < 20 &&
    s.random() < 0.3
  ) {
    const food = near.find((j) => {
      const other = s.cells[j],
        u = material[other];
      if (!other || other === id) return false;
      if (c.food === "soil")
        return u.soil && f.moisture[j] >= 20 && f.fertility[j] >= 8;
      if (c.food === "water")
        return (
          u.aqueous &&
          f.salinity[j] >= (c.minSalt ?? 0) &&
          f.salinity[j] <= (c.maxSalt ?? 100) &&
          f.pollution[j] < 30 &&
          (id === E.SaltCrystal ? f.salinity[j] >= 20 : f.fertility[j] >= 8)
        );
      return c.food === "organic"
        ? u.organic
        : c.food === "metal"
          ? u.electrical > 0.5
          : c.food === "rust"
            ? other === E.Rust
            : f.pollution[j] >= 20;
    });
    if (food !== undefined) {
      const external =
        c.food === "soil" || c.food === "pollution" || id === E.SaltCrystal;
      const target = external ? s.emptyNeighbor(i) : food;
      if (target >= 0) {
        if (c.food === "soil" || c.food === "water") {
          if (id === E.SaltCrystal) f.salinity[food] -= 20;
          else f.fertility[food] -= 8;
        }
        if (c.food === "pollution") f.pollution[food] -= 20;
        const reserve = Math.floor(f.vitality[i] / 2),
          salt = f.salinity[food];
        f.vitality[i] = reserve;
        s.put(target, c.product ?? id);
        f.vitality[target] = reserve;
        f.fertility[target] = 0;
        f.salinity[target] = salt;
        f.moisture[target] = 60;
        if (c.charged) f.charge[i] = Math.max(0, f.charge[i] - 40);
      }
    }
  }
}
