import { E, byId } from "./elements";
import { material } from "./materials";
import type { Simulation } from "./simulation";

const clamp = (v: number) => Math.max(0, Math.min(100, v));

/** Every phase change goes through this path so solutes stay behind during distillation. */
export function evaporate(s: Simulation, i: number) {
  const f = s.fields,
    salt = f.salinity[i],
    pollution = f.pollution[i];
  if (salt || pollution) {
    const target = s.emptyNeighbor(i);
    if (target < 0) return false;
    s.put(target, E.Steam);
    f.temperature[target] = 115;
    s.put(i, salt ? E.Salt : E.Ash);
    f.salinity[i] = salt;
    f.pollution[i] = pollution;
    f.temperature[i] = 100;
  } else {
    s.put(i, E.Steam);
    f.temperature[i] = 115;
  }
  s.onDiscover(E.Steam);
  return true;
}

export function ignite(s: Simulation, i: number) {
  const f = s.fields,
    id = s.cells[i],
    traits = material[id];
  if (!traits.fuel || f.moisture[i] > 25 || f.burning[i]) return false;
  if (id === E.Gunpowder) {
    s.explode(i % s.width, Math.floor(i / s.width));
    return true;
  }
  if (
    !s
      .neighbors(i)
      .some(
        (j) =>
          !s.cells[j] ||
          ["gas", "energy"].includes(byId.get(s.cells[j])!.state),
      )
  )
    return false;
  f.burning[i] = traits.fuel;
  f.temperature[i] = Math.max(300, f.temperature[i]);
  return true;
}

function diffuse(s: Simulation, i: number, j: number) {
  const f = s.fields,
    a = s.cells[i],
    b = s.cells[j],
    ta = material[a],
    tb = material[b];
  if (!a || !b) return;
  // An equal-and-opposite transfer prevents heat and dissolved salt from appearing from nowhere.
  const heat = Math.trunc(
    (f.temperature[i] - f.temperature[j]) *
      Math.min(ta.conductivity, tb.conductivity) *
      0.28,
  );
  f.temperature[i] -= heat;
  f.temperature[j] += heat;
  if (ta.aqueous && tb.aqueous) {
    for (const key of [
      "salinity",
      "pollution",
      "acidity",
      "fertility",
    ] as const) {
      const transfer = Math.trunc((f[key][i] - f[key][j]) * 0.25);
      f[key][i] -= transfer;
      f[key][j] += transfer;
    }
  }
  if (ta.absorbency && tb.absorbency) {
    const transfer = Math.trunc((f.moisture[i] - f.moisture[j]) * 0.12);
    f.moisture[i] -= transfer;
    f.moisture[j] += transfer;
    if (f.moisture[i] > 15 && f.moisture[j] > 15) {
      for (const key of ["salinity", "pollution", "acidity"] as const) {
        const transfer = Math.trunc((f[key][i] - f[key][j]) * 0.12);
        f[key][i] -= transfer;
        f[key][j] += transfer;
      }
    }
  }
}

/** Symmetric, trait-based contact rules. Called once per touching pair during the environmental pass. */
export function contact(s: Simulation, i: number, j: number) {
  diffuse(s, i, j);
  for (const [a, b] of [
    [i, j],
    [j, i],
  ]) {
    const f = s.fields,
      id = s.cells[a],
      other = s.cells[b],
      ta = material[id],
      tb = material[other];
    if (!id || !other) continue;
    if (id === E.Spark && tb.electrical > 0)
      f.charge[b] = Math.max(f.charge[b], 220);
    if (
      id === E.Steam &&
      (other === E.Ice || other === E.Snow) &&
      f.temperature[b] < 0
    ) {
      s.transform(a, E.Snow, { temperature: -5, moisture: 100, salinity: 0 });
      s.onDiscover(E.Snow);
      continue;
    }
    if (
      ta.soluble === "salt" &&
      (other === E.Ice || other === E.Snow) &&
      f.salinity[b] < 100 &&
      f.temperature[b] > -25
    ) {
      const mass = Math.min(f.salinity[a], 100 - f.salinity[b]);
      f.salinity[b] += mass;
      f.salinity[a] -= mass;
      if (!f.salinity[a]) s.put(a, 0);
      s.note("salty");
      continue;
    }
    if (ta.aqueous) {
      if (tb.soluble === "salt" && f.salinity[a] < 100) {
        const mass = Math.min(f.salinity[b], 100 - f.salinity[a]);
        f.salinity[a] += mass;
        f.salinity[b] -= mass;
        if (f.salinity[b] === 0) s.put(b, 0);
        s.note("salty");
        continue;
      }
      if (tb.soluble === "nutrients") {
        f.fertility[a] = clamp(f.fertility[a] + Math.ceil(f.fertility[b] / 2));
        f.pollution[a] = clamp(f.pollution[a] + 3);
        f.acidity[a] = Math.max(0, f.acidity[a] - 30);
        s.put(b, 0);
        s.note("fertile");
        continue;
      }
      // Water volume is represented by moisture; absorption has a finite supply.
      if (tb.absorbency && f.moisture[b] < tb.absorbency && f.moisture[a] > 0) {
        const amount = Math.min(
          4,
          tb.absorbency - f.moisture[b],
          f.moisture[a],
        );
        const salt = Math.min(
          f.salinity[a],
          Math.ceil((f.salinity[a] * amount) / Math.max(1, f.moisture[a])),
        );
        for (const key of ["pollution", "acidity", "fertility"] as const) {
          const transfer = Math.min(
            f[key][a],
            Math.ceil((f[key][a] * amount) / Math.max(1, f.moisture[a])),
            100 - f[key][b],
          );
          f[key][b] += transfer;
          f[key][a] -= transfer;
        }
        f.moisture[b] += amount;
        f.moisture[a] -= amount;
        f.salinity[b] += salt;
        f.salinity[a] -= salt;
        if (f.moisture[a] === 0) {
          const residue = f.salinity[a];
          s.put(a, residue ? E.Salt : 0);
          if (residue) f.salinity[a] = residue;
        }
      }
      if (other === E.Fire) {
        f.temperature[a] = Math.min(99, f.temperature[a] + 20);
        s.put(b, E.Steam);
        s.onDiscover(E.Steam);
        continue;
      }
      if (f.burning[b]) {
        f.burning[b] = 0;
        f.temperature[b] = Math.min(80, f.temperature[b]);
        s.note("wet");
      }
      if (other === E.Lava) {
        s.transform(b, E.Obsidian, { temperature: 180 });
        s.onDiscover(E.Obsidian);
        f.temperature[a] = 110;
        s.note("quenched");
      }
      if (other === E.Oil && s.random() < 0.1)
        f.pollution[a] = clamp(f.pollution[a] + 2);
      if (other === E.Smoke) {
        f.pollution[a] = clamp(f.pollution[a] + 10);
        s.put(b, 0);
        s.note("polluted");
      }
      if (f.acidity[a] > 8 && tb.soil && f.fertility[b] > 0) {
        const amount = Math.min(4, f.acidity[a], f.fertility[b]);
        f.acidity[a] -= amount;
        f.fertility[b] -= amount;
        s.note("neutralized");
      }
    }
    if (tb.soil && ta.soluble === "nutrients") {
      f.fertility[b] = clamp(f.fertility[b] + 40);
      f.acidity[b] = Math.max(0, f.acidity[b] - 30);
      s.put(a, 0);
      s.note("fertile");
      continue;
    }
    // Acid has finite strength and attacks solids/powders only, never erasing fire or gas.
    if (
      f.acidity[a] > 12 &&
      tb.acidResistance < 1 &&
      ["solid", "powder"].includes(byId.get(other)!.state)
    ) {
      const damage = Math.max(1, Math.round((1 - tb.acidResistance) * 9));
      f.corrosion[b] = clamp(f.corrosion[b] + damage);
      f.acidity[a] = Math.max(0, f.acidity[a] - 1);
      if (f.corrosion[b] >= 100) {
        s.put(b, 0);
        f.pollution[a] = clamp(f.pollution[a] + 8);
        s.note("corroded");
      }
    }
    if (
      id === E.Metal &&
      (tb.aqueous || f.moisture[b] > 50) &&
      s.random() < 0.08
    ) {
      f.corrosion[a] = clamp(f.corrosion[a] + 1 + (f.salinity[b] > 8 ? 2 : 0));
      s.note("rusted");
    }
    if (
      (id === E.Fire || id === E.Lava || id === E.Spark || f.burning[a]) &&
      tb.fuel
    ) {
      f.temperature[b] = Math.min(1600, f.temperature[b] + 25);
      if (
        other === E.Gunpowder ||
        (f.temperature[b] >= tb.ignition && s.random() < 0.25)
      )
        ignite(s, b);
    }
  }
}

export function stepEnvironment(s: Simulation) {
  const f = s.fields,
    w = s.width,
    size = s.cells.length;
  // Snapshot charge keeps traversal order from creating instantaneous or self-sustaining circuits.
  const oldCharge = f.charge.slice();
  for (let i = 0; i < size; i++) {
    if (!s.cells[i]) continue;
    // Room-temperature, inert terrain dominates the world. Skip its environmental work
    // until a neighboring heat source, corrosive liquid, or electrical pulse wakes it.
    if (
      [E.Stone, E.Glass, E.Obsidian, E.Crystal].includes(s.cells[i] as 3) &&
      f.temperature[i] === 20 &&
      !f.corrosion[i] &&
      !f.charge[i] &&
      !f.acidity[i]
    ) {
      let active = false;
      for (const j of s.neighbors(i)) {
        if (
          s.cells[j] &&
          (f.temperature[j] !== 20 || f.acidity[j] > 0 || oldCharge[j] > 0)
        ) {
          active = true;
          break;
        }
      }
      if (!active) continue;
    }
    f.charge[i] = Math.max(0, oldCharge[i] - 14);
    const id = s.cells[i],
      t = material[id];
    if (i % w < w - 1) contact(s, i, i + 1);
    if (i + w < size) contact(s, i, i + w);
    if (!s.cells[i]) continue;
    for (const j of s.neighbors(i)) {
      const neighbor = s.cells[j];
      if (!neighbor) continue;
      const conductivity =
        t.electrical +
        (t.aqueous
          ? Math.min(0.8, f.salinity[i] / 80)
          : f.moisture[i] > 40
            ? 0.25
            : 0);
      const from =
        material[neighbor].electrical +
        (material[neighbor].aqueous
          ? Math.min(0.8, f.salinity[j] / 80)
          : f.moisture[j] > 40
            ? 0.25
            : 0);
      if (conductivity && from && oldCharge[j] > 25)
        f.charge[i] = Math.max(
          f.charge[i],
          Math.max(
            0,
            oldCharge[j] - Math.ceil(22 / Math.min(conductivity, from)),
          ),
        );
    }
    if (s.cells[i] === E.Spark) f.charge[i] = 255;
    const current = s.cells[i],
      traits = material[current],
      temp = f.temperature[i];
    if (traits.soil && f.acidity[i] && f.fertility[i]) {
      const neutral = Math.min(2, f.acidity[i], f.fertility[i]);
      f.acidity[i] -= neutral;
      f.fertility[i] -= neutral;
      s.note("neutralized");
    }
    const exposed = s.emptyNeighbor(i) >= 0;
    if (current === E.Fire) f.temperature[i] = 650;
    else if (f.burning[i]) {
      const ventilated = s
        .neighbors(i)
        .some(
          (j) =>
            !s.cells[j] ||
            ["gas", "energy"].includes(byId.get(s.cells[j])!.state),
        );
      if (f.moisture[i] > 25 || !ventilated) {
        f.burning[i] = 0;
      } else {
        f.burning[i] = Math.max(0, f.burning[i] - 4);
        f.temperature[i] = 480;
        const target = s.emptyNeighbor(i);
        if (target >= 0 && s.random() < 0.2)
          s.put(target, s.random() < 0.65 ? E.Fire : E.Smoke);
        if (!f.burning[i]) {
          s.transform(i, current === E.Oil ? E.Smoke : E.Ash, {
            temperature: 80,
            moisture: 0,
            fertility: current === E.Oil ? 0 : 80,
          });
          s.onDiscover(current === E.Oil ? E.Smoke : E.Ash);
          continue;
        }
      }
    } else if (exposed && temp !== 20) {
      const cooling = traits.aqueous
        ? 1
        : current === E.Steam
          ? 3
          : current === E.Lava
            ? 2
            : 1;
      f.temperature[i] +=
        Math.sign(20 - temp) * Math.min(Math.abs(20 - temp), cooling);
    }
    if (
      f.moisture[i] &&
      temp > 50 &&
      !traits.aqueous &&
      current !== E.Ice &&
      current !== E.Snow
    ) {
      f.moisture[i] = Math.max(0, f.moisture[i] - Math.ceil((temp - 40) / 40));
    }
    if (
      s.tick % 120 === 0 &&
      exposed &&
      traits.absorbency &&
      f.moisture[i] > 0 &&
      !traits.aqueous
    )
      f.moisture[i]--;
    if (
      traits.fuel &&
      !f.burning[i] &&
      (temp >= traits.ignition || f.charge[i] > 100)
    )
      ignite(s, i);
    if (s.cells[i] !== current) continue;
    if (traits.aqueous) {
      if (f.acidity[i] < 10 && current === E.Acid) s.transform(i, E.Water);
      if (temp >= 100 + Math.min(12, f.salinity[i] / 10)) {
        evaporate(s, i);
        continue;
      }
      if (temp <= -Math.min(35, f.salinity[i] * 0.35)) {
        s.transform(i, E.Ice);
        s.onDiscover(E.Ice);
        s.note("frozen");
        continue;
      }
    }
    if (
      (current === E.Ice || current === E.Snow) &&
      temp > 2 - Math.min(35, f.salinity[i] * 0.35)
    ) {
      s.transform(i, E.Water, { moisture: 100 });
      s.note("melted");
      continue;
    }
    if (current === E.Steam && temp < 95) {
      s.transform(i, temp < 0 ? E.Snow : E.Water, {
        moisture: 100,
        salinity: 0,
        pollution: 0,
        acidity: 0,
      });
      s.onDiscover(temp < 0 ? E.Snow : E.Water);
      continue;
    }
    if (current === E.Lava && temp < 650) {
      s.transform(i, E.Stone);
      s.note("cooled");
      continue;
    }
    if (current === E.Stone && temp > 1000) {
      s.transform(i, E.Lava);
      s.onDiscover(E.Lava);
      continue;
    }
    if (current === E.Sand && temp > 600) {
      s.transform(i, E.Glass);
      s.onDiscover(E.Glass);
      continue;
    }
    if (current === E.Salt && temp > 700) {
      s.transform(i, E.Crystal, { salinity: 0 });
      s.onDiscover(E.Crystal);
      continue;
    }
    if (current === E.Metal && temp > 450 && exposed && s.random() < 0.03) {
      const target = s.emptyNeighbor(i);
      if (target >= 0) {
        s.put(target, E.Spark);
        s.onDiscover(E.Spark);
      }
    }
    if (current === E.Soil && f.moisture[i] >= 92) {
      s.transform(i, E.Mud);
      s.onDiscover(E.Mud);
      continue;
    }
    if (current === E.Mud && f.moisture[i] < 45) {
      s.transform(i, E.Soil);
      s.note("dried");
      continue;
    }
    if (
      traits.organic &&
      (f.salinity[i] > 15 || f.pollution[i] > 40 || f.acidity[i] > 15)
    ) {
      f.vitality[i] = Math.max(0, f.vitality[i] - 2);
      if (f.vitality[i] === 0 && current !== E.Wood)
        s.transform(i, E.Soil, { fertility: 75, moisture: 35 });
    }
  }
}
