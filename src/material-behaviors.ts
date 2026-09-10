import { E } from "./elements";
import { material } from "./materials";
import type { Simulation } from "./simulation";

/** Optional capabilities for new families, independent of discovery recipes. */
export function extendedContact(s: Simulation, a: number, b: number) {
  const id = s.cells[a],
    other = s.cells[b],
    t = material[id],
    u = material[other],
    f = s.fields;
  if (!id || !other) return;
  if (t.filter && u.aqueous) {
    const amount = Math.min(3, f.pollution[b], 100 - f.pollution[a]);
    f.pollution[b] -= amount;
    f.pollution[a] += amount;
  }
  if (t.neutralizer && f.acidity[b] && f.fertility[a]) {
    const amount = Math.min(5, f.acidity[b], f.fertility[a]);
    f.acidity[b] -= amount;
    f.fertility[a] -= amount;
  }
  if (t.polluting && u.aqueous)
    f.pollution[b] = Math.min(100, f.pollution[b] + t.polluting);
  if (t.waterProduct && u.aqueous) {
    s.transform(a, t.waterProduct, {
      temperature: 20,
      pollution: t.waterPollution ?? 0,
      moisture: 100,
    });
    return;
  }
  if (t.suppressant && (other === E.Fire || f.burning[b])) {
    if (other === E.Fire) s.put(b, E.Smoke);
    else {
      f.burning[b] = 0;
      f.temperature[b] = Math.min(f.temperature[b], 80);
    }
    s.put(a, 0);
    return;
  }
  if (
    t.oxidizer &&
    u.fuel &&
    f.moisture[b] <= 25 &&
    f.temperature[b] >= u.ignition * 0.7
  ) {
    f.temperature[b] = Math.max(f.temperature[b], u.ignition + 10);
    s.put(a, 0);
    return;
  }
  if (
    t.rustRate &&
    (u.aqueous || f.moisture[b] > 50) &&
    s.random() < t.rustRate * 0.08
  ) {
    f.corrosion[a] = Math.min(
      100,
      f.corrosion[a] + 1 + (f.salinity[b] > 8 ? 2 : 0),
    );
    if (f.corrosion[a] >= 85) s.transform(a, E.Rust);
  }
}

export function extendedStep(s: Simulation, i: number): boolean {
  const id = s.cells[i],
    t = material[id],
    f = s.fields,
    temp = f.temperature[i];
  const transition =
    t.heatTransition && temp >= t.heatTransition.at
      ? t.heatTransition
      : t.coldTransition && temp <= t.coldTransition.at
        ? t.coldTransition
        : null;
  if (transition) {
    s.transform(i, transition.to, { burning: 0 });
    return true;
  }
  const growth = t.growth;
  if (growth && s.tick % 60 === 0) {
    if (f.moisture[i] < 15) f.vitality[i] = Math.max(0, f.vitality[i] - 4);
    if (f.vitality[i] === 0) {
      s.transform(i, E.Compost);
      return true;
    }
    if (
      temp < 4 ||
      temp > 45 ||
      f.acidity[i] > 10 ||
      f.pollution[i] > 25 ||
      s.random() > 0.12
    )
      return false;
    const substrate = s.neighbors(i).find((j) => {
      const u = material[s.cells[j]];
      return (
        (growth.substrate === "water"
          ? u.aqueous
          : u.soil && f.moisture[j] >= 30) &&
        f.fertility[j] >= 8 &&
        f.salinity[j] >= growth.minSalt &&
        f.salinity[j] <= growth.maxSalt &&
        f.acidity[j] < 10 &&
        f.pollution[j] < 25
      );
    });
    if (substrate === undefined) return false;
    const target =
      growth.substrate === "water" ? substrate : s.emptyNeighbor(i);
    if (target < 0) return false;
    const nutrients = f.fertility[substrate] - 4,
      salt = f.salinity[substrate];
    f.fertility[substrate] = nutrients;
    f.moisture[i] = Math.min(100, f.moisture[i] + 5);
    s.put(target, id);
    f.salinity[target] = growth.substrate === "water" ? salt : 0;
    f.fertility[target] = growth.substrate === "water" ? nutrients : 0;
    f.moisture[target] = 65;
  }
  return false;
}
