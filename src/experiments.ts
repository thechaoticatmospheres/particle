import { E } from "./elements";
import type { ModifierValues } from "./modifiers";
export interface ModifierExperiment {
  a: number;
  b: number;
  output: number;
  label: string;
  properties: ModifierValues;
  description: string;
}
export const modifierExperiments: ModifierExperiment[] = [
  {
    a: E.Salt,
    b: E.Ice,
    output: E.Water,
    label: "Cold brine",
    properties: { salinity: 32, temperature: -5 },
    description:
      "Salt lowers the melting point of ice, producing cold salty water.",
  },
  {
    a: E.Salt,
    b: E.Snow,
    output: E.Water,
    label: "Cold brine",
    properties: { salinity: 32, temperature: -5 },
    description:
      "Salt melts snow into brine at temperatures where fresh water would freeze.",
  },
  {
    a: E.Salt,
    b: E.Water,
    output: E.Water,
    label: "Salty water",
    properties: { salinity: 35 },
    description:
      "Salt dissolves and diffuses. This water supports saltwater fish, but harms freshwater fish and thirsty humans.",
  },
  {
    a: E.Oil,
    b: E.Water,
    output: E.Water,
    label: "Polluted water",
    properties: { pollution: 55 },
    description:
      "Oil contaminates water and makes it unsafe for drinking and aquatic life.",
  },
  {
    a: E.Smoke,
    b: E.Water,
    output: E.Water,
    label: "Polluted water",
    properties: { pollution: 40 },
    description:
      "Water captures smoke particles. Pollution moves with the water.",
  },
  {
    a: E.Acid,
    b: E.Water,
    output: E.Water,
    label: "Acidic water",
    properties: { acidity: 40 },
    description:
      "Acid dilutes into water. It still corrodes materials and damages living things.",
  },
  {
    a: E.Water,
    b: E.Wood,
    output: E.Wood,
    label: "Wet wood",
    properties: { moisture: 65 },
    description:
      "Wet fuel resists ignition. Heat must dry it before it can burn.",
  },
  {
    a: E.Water,
    b: E.Gunpowder,
    output: E.Gunpowder,
    label: "Damp gunpowder",
    properties: { moisture: 70 },
    description:
      "Damp powder will not explode. Let it dry before trying fire or electricity.",
  },
  {
    a: E.Water,
    b: E.Sand,
    output: E.Sand,
    label: "Wet sand",
    properties: { moisture: 30 },
    description:
      "Water-soaked grains move more slowly and hold salt from the water they absorb.",
  },
  {
    a: E.Water,
    b: E.Ash,
    output: E.Water,
    label: "Nutrient-rich water",
    properties: { fertility: 60, pollution: 3 },
    description:
      "Dissolved nutrients feed aquatic life and enrich soil as it absorbs water.",
  },
  {
    a: E.Soil,
    b: E.Ash,
    output: E.Soil,
    label: "Fertilized soil",
    properties: { fertility: 100, moisture: 60 },
    description:
      "Ash returns nutrients to soil. Healthy plants grow faster in fertile ground.",
  },
  {
    a: E.Mud,
    b: E.Ash,
    output: E.Mud,
    label: "Fertilized mud",
    properties: { fertility: 100 },
    description:
      "Wet soil stores added nutrients. It becomes soil again as it dries.",
  },
  {
    a: E.Spark,
    b: E.Water,
    output: E.Water,
    label: "Charged water",
    properties: { charge: 255 },
    description:
      "Water carries a short electrical pulse. Salt increases conduction; exposed creatures can be shocked.",
  },
  {
    a: E.Spark,
    b: E.Metal,
    output: E.Metal,
    label: "Charged metal",
    properties: { charge: 255 },
    description:
      "Metal conducts a decaying pulse through connected conductive materials.",
  },
  {
    a: E.Water,
    b: E.Metal,
    output: E.Metal,
    label: "Rusted metal",
    properties: { corrosion: 65, moisture: 40 },
    description:
      "A preview of prolonged wet exposure. Salt speeds rusting; advanced corrosion makes metal crumble.",
  },
  {
    a: E.Ice,
    b: E.Water,
    output: E.Water,
    label: "Chilled water",
    properties: { temperature: 1 },
    description:
      "Ice pulls heat from water. Fresh water freezes below zero; dissolved salt lowers the threshold.",
  },
  {
    a: E.Fire,
    b: E.Soil,
    output: E.Soil,
    label: "Hot, dry soil",
    properties: { temperature: 110, moisture: 0 },
    description: "Heat drives moisture out of soil and stresses nearby roots.",
  },
  {
    a: E.Fire,
    b: E.Mud,
    output: E.Soil,
    label: "Dried soil",
    properties: { temperature: 70, moisture: 20 },
    description:
      "Heating mud dries it back into soil while retaining its nutrients and salt.",
  },
  {
    a: E.Acid,
    b: E.Ash,
    output: E.Water,
    label: "Neutralized water",
    properties: { acidity: 0, fertility: 15 },
    description:
      "Ash neutralizes acid until its nutrients are exhausted. Diluted acid becomes water.",
  },
  {
    a: E.Acid,
    b: E.Soil,
    output: E.Soil,
    label: "Depleted soil",
    properties: { fertility: 5, acidity: 5 },
    description:
      "Fertile soil buffers acid at the cost of its nutrient supply.",
  },
];
export const modifierExperimentFor = (a: number, b: number) =>
  modifierExperiments.find(
    (r) => (r.a === a && r.b === b) || (r.a === b && r.b === a),
  );
export const milestoneLabels: Record<string, string> = {
  salty: "Salt dissolved into water",
  fertile: "Nutrients returned to the ecosystem",
  wet: "Water extinguished burning fuel",
  polluted: "Water became polluted",
  neutralized: "Acid was neutralized",
  corroded: "A material dissolved through corrosion",
  rusted: "Metal began rusting",
  quenched: "Water quenched lava",
  frozen: "Water froze",
  melted: "Frozen water melted",
  cooled: "Lava cooled into stone",
  dried: "Mud dried into soil",
  germinated: "A seed took root",
  growing: "A plant grew new branches",
  reseeding: "A mature plant released a seed",
  "plant-died": "A plant returned nutrients to the soil",
  "human-died": "A human could not survive these conditions",
  "fish-died": "A fish could not survive these conditions",
  explosion: "A chain reaction erupted",
  "pressure-burst": "Compressed matter burst free",
  "water-reactive": "Reactive metal erupted in water",
};
