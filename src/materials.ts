import { E, elements } from "./elements";
import { expandedTraits } from "./expansion";
import { frontierTraits } from "./frontier";

export interface Dynamics {
  waterReaction?: {
    gas: number;
    heat: number;
    burst?: number;
    residue?: number;
  };
  contacts?: {
    target: number;
    product: number;
    self?: number;
    heat?: number;
    burst?: number;
  }[];
  radiation?: number;
  shield?: boolean;
  source?: number;
  powered?: "heat" | "cold" | "arc" | "magnet" | "repel" | "electrolysis";
  force?: "pull" | "push" | "magnet" | "void";
  range?: number;
  thermal?: number;
  emit?: { id: number; chance: number; cost: number; charged?: boolean };
  colony?: {
    food: "organic" | "soil" | "water" | "metal" | "rust" | "pollution";
    product?: number;
    minSalt?: number;
    maxSalt?: number;
    charged?: boolean;
  };
  mutate?: boolean;
  cure?: boolean;
  annihilate?: boolean;
  pressureBurst?: number;
  glow?: boolean;
}

/** Capabilities, not pairwise recipes. New materials opt into shared systems here. */
export interface MaterialTraits {
  conductivity: number;
  electrical: number;
  absorbency: number;
  ignition: number;
  fuel: number;
  acidResistance: number;
  blastResistance: number;
  organic: boolean;
  soil: boolean;
  aqueous: boolean;
  soluble: "salt" | "nutrients" | null;
  defaultTemperature: number;
  defaultMoisture: number;
  defaultFertility: number;
  defaultPollution?: number;
  viscosity?: number;
  heatTransition?: { at: number; to: number; minMoisture?: number };
  coldTransition?: { at: number; to: number };
  burnProduct?: number;
  expiresTo?: number;
  rustRate?: number;
  polluting?: number;
  filter?: boolean;
  neutralizer?: boolean;
  waterProduct?: number;
  waterPollution?: number;
  explosive?: number;
  oxidizer?: boolean;
  suppressant?: boolean;
  saltTolerance?: number;
  growth?: { substrate: "soil" | "water"; minSalt: number; maxSalt: number };
  dynamics?: Dynamics;
  defaultAcidity?: number;
  defaultRadiation?: number;
  defaultPressure?: number;
}
const defaults: MaterialTraits = {
  conductivity: 0.1,
  electrical: 0,
  absorbency: 0,
  ignition: 2000,
  fuel: 0,
  acidResistance: 0.2,
  blastResistance: 0,
  organic: false,
  soil: false,
  aqueous: false,
  soluble: null,
  defaultTemperature: 20,
  defaultMoisture: 0,
  defaultFertility: 0,
};
const overrides: Record<number, Partial<MaterialTraits>> = {
  [E.Sand]: { absorbency: 30, acidResistance: 0.7 },
  [E.Water]: {
    conductivity: 0.3,
    electrical: 0.15,
    aqueous: true,
    defaultMoisture: 100,
    acidResistance: 1,
  },
  [E.Stone]: { conductivity: 0.14, acidResistance: 0.75, blastResistance: 0.3 },
  [E.Soil]: {
    absorbency: 100,
    soil: true,
    defaultMoisture: 42,
    defaultFertility: 65,
  },
  [E.Wood]: {
    absorbency: 65,
    ignition: 240,
    fuel: 180,
    organic: true,
    defaultMoisture: 15,
  },
  [E.Seed]: {
    absorbency: 50,
    ignition: 180,
    fuel: 35,
    organic: true,
    defaultMoisture: 10,
  },
  [E.Fire]: { conductivity: 0.5, defaultTemperature: 650 },
  [E.Lava]: { conductivity: 0.24, defaultTemperature: 1150, acidResistance: 1 },
  [E.Oil]: {
    conductivity: 0.09,
    ignition: 180,
    fuel: 120,
    acidResistance: 0.9,
  },
  [E.Ice]: {
    conductivity: 0.4,
    defaultTemperature: -25,
    defaultMoisture: 100,
    acidResistance: 1,
  },
  [E.Metal]: {
    conductivity: 0.85,
    electrical: 1,
    acidResistance: 0.55,
    blastResistance: 1,
  },
  [E.Salt]: { soluble: "salt", acidResistance: 0.6 },
  [E.Steam]: { conductivity: 0.25, defaultTemperature: 115 },
  [E.Glass]: { conductivity: 0.06, acidResistance: 1, blastResistance: 0.1 },
  [E.Mud]: {
    absorbency: 100,
    soil: true,
    defaultMoisture: 100,
    defaultFertility: 55,
  },
  [E.Plant]: {
    absorbency: 80,
    ignition: 160,
    fuel: 65,
    organic: true,
    defaultMoisture: 50,
  },
  [E.Ash]: { soluble: "nutrients", absorbency: 65, defaultFertility: 90 },
  [E.Smoke]: { conductivity: 0.08, defaultTemperature: 100 },
  [E.Obsidian]: { conductivity: 0.07, acidResistance: 1, blastResistance: 1 },
  [E.Snow]: {
    conductivity: 0.2,
    defaultTemperature: -15,
    defaultMoisture: 100,
    acidResistance: 1,
  },
  [E.Acid]: {
    conductivity: 0.25,
    electrical: 0.6,
    aqueous: true,
    defaultMoisture: 100,
    acidResistance: 1,
  },
  [E.Crystal]: { conductivity: 0.15, acidResistance: 1, blastResistance: 0.5 },
  [E.Gunpowder]: { absorbency: 75, ignition: 140, fuel: 60 },
  [E.Spark]: { conductivity: 0.5, defaultTemperature: 850, electrical: 1 },
};
export const material: MaterialTraits[] = Array.from({ length: 256 }, () => ({
  ...defaults,
}));
for (const element of elements)
  material[element.id] = { ...defaults, ...overrides[element.id] };
for (const entry of expandedTraits)
  material[entry.id] = { ...material[entry.base], ...entry.traits };
for (const entry of frontierTraits)
  material[entry.id] = { ...material[entry.base], ...entry.traits };
export const hasExtendedContact = material.map(
  (t) =>
    !!(
      t.filter ||
      t.neutralizer ||
      t.polluting ||
      t.waterProduct ||
      t.suppressant ||
      t.oxidizer ||
      t.rustRate
    ),
);
export const hasExtendedStep = material.map(
  (t) => !!(t.heatTransition || t.coldTransition || t.growth),
);

/** Species use the same tolerances; adding another aquatic species needs only data. */
export const habitats = {
  human: {
    label: "Human",
    minSalt: 0,
    maxSalt: 7,
    minTemp: 0,
    maxTemp: 45,
    maxPollution: 18,
    maxAcidity: 8,
    color: "#eac2a0",
  },
  freshwater: {
    label: "Freshwater fish",
    minSalt: 0,
    maxSalt: 9,
    minTemp: 4,
    maxTemp: 35,
    maxPollution: 25,
    maxAcidity: 10,
    color: "#85d4ca",
  },
  saltwater: {
    label: "Saltwater fish",
    minSalt: 12,
    maxSalt: 70,
    minTemp: 6,
    maxTemp: 38,
    maxPollution: 25,
    maxAcidity: 10,
    color: "#f2c77c",
  },
} as const;
export type Species = keyof typeof habitats;
