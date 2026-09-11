import { E } from "./elements";
import { material } from "./materials";

export const modifierNames = [
  "temperature",
  "salinity",
  "moisture",
  "fertility",
  "pollution",
  "acidity",
  "charge",
  "corrosion",
  "burning",
  "vitality",
  "age",
  "pressure",
  "radiation",
] as const;
export type ModifierName = (typeof modifierNames)[number];
export type ModifierValues = Partial<Record<ModifierName, number>>;
export class Modifiers {
  temperature: Int16Array;
  salinity: Uint16Array;
  moisture: Uint8Array;
  fertility: Uint8Array;
  pollution: Uint8Array;
  acidity: Uint8Array;
  charge: Uint8Array;
  corrosion: Uint8Array;
  burning: Uint16Array;
  vitality: Uint8Array;
  age: Uint16Array;
  pressure: Uint8Array;
  radiation: Uint8Array;
  constructor(size: number) {
    this.temperature = new Int16Array(size);
    this.salinity = new Uint16Array(size);
    this.moisture = new Uint8Array(size);
    this.fertility = new Uint8Array(size);
    this.pollution = new Uint8Array(size);
    this.acidity = new Uint8Array(size);
    this.charge = new Uint8Array(size);
    this.corrosion = new Uint8Array(size);
    this.burning = new Uint16Array(size);
    this.vitality = new Uint8Array(size);
    this.age = new Uint16Array(size);
    this.pressure = new Uint8Array(size);
    this.radiation = new Uint8Array(size);
  }
  reset(i: number, id: number) {
    for (const key of modifierNames) this[key][i] = 0;
    if (!id) return;
    const t = material[id];
    this.temperature[i] = t.defaultTemperature;
    this.moisture[i] = t.defaultMoisture;
    this.fertility[i] = t.defaultFertility;
    this.pollution[i] = t.defaultPollution ?? 0;
    this.acidity[i] = t.defaultAcidity ?? 0;
    this.pressure[i] = t.defaultPressure ?? 0;
    this.radiation[i] = t.defaultRadiation ?? 0;
    this.vitality[i] = 100;
    if (id === E.Salt) this.salinity[i] = 32;
    if (id === E.Acid) this.acidity[i] = 100;
    if (id === E.Spark) this.charge[i] = 255;
  }
  clear() {
    for (const key of modifierNames) this[key].fill(0);
  }
  swap(i: number, j: number) {
    for (const key of modifierNames) {
      const v = this[key][i];
      this[key][i] = this[key][j];
      this[key][j] = v;
    }
  }
  read(i: number): Record<ModifierName, number> {
    return Object.fromEntries(
      modifierNames.map((key) => [key, this[key][i]]),
    ) as Record<ModifierName, number>;
  }
  assign(i: number, values: ModifierValues) {
    for (const key of modifierNames)
      if (values[key] !== undefined) this[key][i] = values[key]!;
  }
}

/** Run-length packing keeps a complete modifier-rich world within localStorage limits. */
export function pack(values: ArrayLike<number>): number[] {
  const out: number[] = [];
  if (!values.length) return out;
  let value = values[0],
    count = 1;
  for (let i = 1; i < values.length; i++) {
    if (values[i] === value) count++;
    else {
      out.push(count, value);
      value = values[i];
      count = 1;
    }
  }
  out.push(count, value);
  return out;
}
export function unpack(
  raw: unknown,
  size: number,
  min: number,
  max: number,
): number[] {
  if (!Array.isArray(raw) || raw.length % 2 || raw.length > size * 2)
    throw new Error("Invalid packed field");
  const out: number[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    const count = raw[i],
      value = raw[i + 1];
    if (
      !Number.isInteger(count) ||
      count < 1 ||
      out.length + count > size ||
      !Number.isInteger(value) ||
      value < min ||
      value > max
    )
      throw new Error("Invalid packed value");
    for (let n = 0; n < count; n++) out.push(value);
  }
  if (out.length !== size) throw new Error("Incomplete packed field");
  return out;
}
