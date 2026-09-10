import { E } from "./ids";
import type { Element, Matter, Category } from "./elements";
import type { MaterialTraits } from "./materials";

interface Entry {
  id: number;
  name: string;
  base: number;
  color: string;
  state: Matter;
  density: number;
  pair: [number, number];
  description: string;
  traits?: Partial<MaterialTraits>;
  lifetime?: number;
}
const heat = (at: number, to: number) => ({ heatTransition: { at, to } });
const cold = (at: number, to: number) => ({ coldTransition: { at, to } });
const rock = { acidResistance: 0.8, blastResistance: 0.5 };
const entries: Entry[] = [
  {
    id: E.Gravel,
    name: "Gravel",
    base: E.Sand,
    color: "#9b9386",
    state: "powder",
    density: 7,
    pair: [E.Stone, E.Stone],
    description:
      "Heavy grains. Sink through liquids and melt under intense heat.",
    traits: { ...rock, ...heat(1000, E.Lava) },
  },
  {
    id: E.Clay,
    name: "Clay",
    base: E.Soil,
    color: "#b68069",
    state: "powder",
    density: 6,
    pair: [E.Mud, E.Sand],
    description:
      "Absorbs water and holds nutrients. Fire hardens it into brick.",
    traits: { defaultMoisture: 25, ...heat(450, E.Brick) },
  },
  {
    id: E.Brick,
    name: "Brick",
    base: E.Stone,
    color: "#ba604c",
    state: "solid",
    density: 9,
    pair: [E.Clay, E.Fire],
    description:
      "Heat-resistant masonry. Insulates heat and blocks flowing particles.",
    traits: {
      conductivity: 0.07,
      acidResistance: 0.85,
      blastResistance: 0.65,
      ...heat(1100, E.Lava),
    },
  },
  {
    id: E.Ceramic,
    name: "Ceramic",
    base: E.Glass,
    color: "#d7c8b5",
    state: "solid",
    density: 9,
    pair: [E.Clay, E.Lava],
    description:
      "Acid-resistant and electrically insulating. Melts only under extreme heat.",
    traits: { conductivity: 0.04, ...heat(1400, E.Lava) },
  },
  {
    id: E.Basalt,
    name: "Basalt",
    base: E.Stone,
    color: "#565e67",
    state: "solid",
    density: 10,
    pair: [E.Obsidian, E.Stone],
    description:
      "Dense volcanic rock. Resists blasts; becomes lava when heated.",
    traits: { ...rock, blastResistance: 0.9, ...heat(1050, E.Lava) },
  },
  {
    id: E.Pumice,
    name: "Pumice",
    base: E.Sand,
    color: "#bab39e",
    state: "powder",
    density: 1,
    pair: [E.Lava, E.Steam],
    description:
      "Light volcanic grains. Absorb water and stay above denser liquids.",
    traits: { absorbency: 80, ...heat(950, E.Lava) },
  },
  {
    id: E.Limestone,
    name: "Limestone",
    base: E.Stone,
    color: "#c9c3a5",
    state: "solid",
    density: 8,
    pair: [E.Stone, E.Salt],
    description:
      "Soft mineral rock. Buffers acid with a finite mineral reserve.",
    traits: {
      neutralizer: true,
      defaultFertility: 80,
      acidResistance: 0.35,
      ...heat(850, E.Lye),
    },
  },
  {
    id: E.Marble,
    name: "Marble",
    base: E.Stone,
    color: "#e0d4cf",
    state: "solid",
    density: 9,
    pair: [E.Limestone, E.Lava],
    description: "Conducts heat slowly. Acid gradually eats through it.",
    traits: {
      conductivity: 0.08,
      acidResistance: 0.45,
      blastResistance: 0.65,
      ...heat(1100, E.Lava),
    },
  },
  {
    id: E.Chalk,
    name: "Chalk",
    base: E.Sand,
    color: "#eeead8",
    state: "powder",
    density: 4,
    pair: [E.Limestone, E.Sand],
    description:
      "Absorbent mineral dust. Neutralizes acid until its reserve runs out.",
    traits: {
      absorbency: 50,
      neutralizer: true,
      defaultFertility: 50,
      ...heat(700, E.Lye),
    },
  },
  {
    id: E.Quartz,
    name: "Quartz",
    base: E.Crystal,
    color: "#c9e1dc",
    state: "solid",
    density: 9,
    pair: [E.Crystal, E.Sand],
    description:
      "Acid-resistant crystal and electrical insulator. Extreme heat makes glass.",
    traits: { ...heat(1200, E.Glass) },
  },
  {
    id: E.Amethyst,
    name: "Amethyst",
    base: E.Crystal,
    color: "#ac78d7",
    state: "solid",
    density: 9,
    pair: [E.Quartz, E.Crystal],
    description: "Durable violet crystal. Heat strips its color into quartz.",
    traits: { conductivity: 0.12, ...heat(550, E.Quartz) },
  },
  {
    id: E.Ruby,
    name: "Ruby",
    base: E.Crystal,
    color: "#d25571",
    state: "solid",
    density: 10,
    pair: [E.Crystal, E.Fire],
    description: "Hard red gemstone. Resists acid, heat, and explosions.",
    traits: { conductivity: 0.25, blastResistance: 1, ...heat(1500, E.Glass) },
  },
  {
    id: E.Sapphire,
    name: "Sapphire",
    base: E.Crystal,
    color: "#628ed7",
    state: "solid",
    density: 10,
    pair: [E.Crystal, E.Ice],
    description:
      "Hard blue gemstone. Conducts heat but insulates electrical pulses.",
    traits: { conductivity: 0.35, blastResistance: 1, ...heat(1500, E.Glass) },
  },
  {
    id: E.Diamond,
    name: "Diamond",
    base: E.Crystal,
    color: "#daf7ee",
    state: "solid",
    density: 10,
    pair: [E.Coal, E.Crystal],
    description:
      "Excellent heat conductor. Resists blasts and acids; extreme heat burns it.",
    traits: {
      conductivity: 1,
      blastResistance: 1,
      ignition: 1000,
      fuel: 250,
      burnProduct: E.CarbonDioxide,
    },
  },
  {
    id: E.Coal,
    name: "Coal",
    base: E.Sand,
    color: "#42414b",
    state: "powder",
    density: 6,
    pair: [E.Wood, E.Stone],
    description:
      "Dense, long-burning fuel. Leaves ash and pollutes neighboring water.",
    traits: { ignition: 300, fuel: 500, polluting: 2, ...heat(1400, E.Ash) },
  },
  {
    id: E.Charcoal,
    name: "Charcoal",
    base: E.Sand,
    color: "#66616b",
    state: "powder",
    density: 3,
    pair: [E.Wood, E.Lava],
    description:
      "Traps water pollution until saturated. Burns slowly when dry.",
    traits: { absorbency: 70, filter: true, ignition: 260, fuel: 300 },
  },
  {
    id: E.Peat,
    name: "Peat",
    base: E.Soil,
    color: "#78614d",
    state: "powder",
    density: 4,
    pair: [E.Soil, E.Plant],
    description: "Moist organic soil. Supports roots and burns when dry.",
    traits: {
      organic: true,
      ignition: 210,
      fuel: 200,
      defaultMoisture: 65,
      defaultFertility: 80,
    },
  },
  {
    id: E.Compost,
    name: "Compost",
    base: E.Soil,
    color: "#806646",
    state: "powder",
    density: 5,
    pair: [E.Plant, E.Ash],
    description: "Rich growing substrate. Absorbs water and buffers acid.",
    traits: {
      organic: true,
      defaultFertility: 100,
      defaultMoisture: 60,
      ignition: 240,
      fuel: 80,
    },
  },
  {
    id: E.Fertilizer,
    name: "Fertilizer",
    base: E.Ash,
    color: "#b2c98a",
    state: "powder",
    density: 5,
    pair: [E.Compost, E.Salt],
    description:
      "Dissolves into nutrients. Enriches water and soil to support life.",
    traits: { defaultFertility: 100 },
  },
  {
    id: E.Moss,
    name: "Moss",
    base: E.Plant,
    color: "#85a95b",
    state: "solid",
    density: 3,
    pair: [E.Plant, E.Peat],
    description:
      "Spreads beside damp, nutrient-rich soil. Salt and drought harm it.",
    traits: {
      growth: { substrate: "soil", minSalt: 0, maxSalt: 12 },
      defaultMoisture: 60,
    },
  },
  {
    id: E.Algae,
    name: "Algae",
    base: E.Plant,
    color: "#67b26f",
    state: "solid",
    density: 2,
    pair: [E.Plant, E.Steam],
    description: "Spreads into nutrient-rich fresh water, consuming nutrients.",
    traits: { growth: { substrate: "water", minSalt: 0, maxSalt: 12 } },
  },
  {
    id: E.Kelp,
    name: "Kelp",
    base: E.Plant,
    color: "#629579",
    state: "solid",
    density: 2,
    pair: [E.Algae, E.Salt],
    description:
      "Aquatic growth adapted to salty water. Needs dissolved nutrients.",
    traits: {
      growth: { substrate: "water", minSalt: 12, maxSalt: 70 },
      saltTolerance: 70,
    },
  },
  {
    id: E.Fungus,
    name: "Fungus",
    base: E.Plant,
    color: "#c29ab6",
    state: "solid",
    density: 3,
    pair: [E.Compost, E.Seed],
    description: "Spreads on damp fertile substrate. Burns easily when dried.",
    traits: {
      growth: { substrate: "soil", minSalt: 0, maxSalt: 8 },
      ignition: 140,
      fuel: 45,
    },
  },
  {
    id: E.Pollen,
    name: "Pollen",
    base: E.Ash,
    color: "#e9ca66",
    state: "powder",
    density: 1,
    pair: [E.Plant, E.Sand],
    description: "Light nutrient dust. Dissolves into water and catches fire.",
    traits: { organic: true, ignition: 120, fuel: 20, defaultFertility: 60 },
  },
  {
    id: E.Cotton,
    name: "Cotton",
    base: E.Wood,
    color: "#e5e0cf",
    state: "powder",
    density: 1,
    pair: [E.Plant, E.Snow],
    description:
      "Highly absorbent fibers. Wet cotton resists fire; dry fibers burn fast.",
    traits: { absorbency: 100, ignition: 130, fuel: 40, defaultMoisture: 5 },
  },
  {
    id: E.Paper,
    name: "Paper",
    base: E.Wood,
    color: "#ded1a9",
    state: "solid",
    density: 2,
    pair: [E.Wood, E.Cotton],
    description: "Thin, absorbent building material. Burns rapidly when dry.",
    traits: { absorbency: 90, ignition: 150, fuel: 35, defaultMoisture: 5 },
  },
  {
    id: E.Sawdust,
    name: "Sawdust",
    base: E.Wood,
    color: "#c49a61",
    state: "powder",
    density: 2,
    pair: [E.Wood, E.Sand],
    description: "Light wood grains. Soak up water and burn into ash.",
    traits: { absorbency: 80, ignition: 150, fuel: 65, defaultMoisture: 5 },
  },
  {
    id: E.Cork,
    name: "Cork",
    base: E.Wood,
    color: "#ad8558",
    state: "powder",
    density: 1,
    pair: [E.Wood, E.Plant],
    description:
      "Light, insulating grains that stay above water. Burns when heated.",
    traits: { absorbency: 10, conductivity: 0.02, ignition: 280, fuel: 130 },
  },
  {
    id: E.Sponge,
    name: "Sponge",
    base: E.Wood,
    color: "#d5bc73",
    state: "solid",
    density: 2,
    pair: [E.Plant, E.Pumice],
    description:
      "Absorbs a large, finite supply of water and its dissolved substances.",
    traits: { absorbency: 100, defaultMoisture: 0, ignition: 170, fuel: 60 },
  },
  {
    id: E.Rubber,
    name: "Rubber",
    base: E.Oil,
    color: "#757085",
    state: "solid",
    density: 4,
    pair: [E.Oil, E.Plant],
    description:
      "Electrical insulator. Burns with smoke; strong heat softens it into tar.",
    traits: {
      ignition: 320,
      fuel: 220,
      burnProduct: E.Smoke,
      ...heat(280, E.Tar),
    },
  },
  {
    id: E.Resin,
    name: "Resin",
    base: E.Oil,
    color: "#d29a49",
    state: "liquid",
    density: 3,
    pair: [E.Wood, E.Oil],
    description:
      "Slow-flowing plant resin. Flammable and hardens into amber when cool.",
    traits: { viscosity: 5, ignition: 200, fuel: 150, ...cold(5, E.Amber) },
  },
  {
    id: E.Amber,
    name: "Amber",
    base: E.Wood,
    color: "#d1a04d",
    state: "solid",
    density: 5,
    pair: [E.Resin, E.Crystal],
    description: "Hardened resin. Melts back into resin under heat.",
    traits: { absorbency: 0, ignition: 300, fuel: 160, ...heat(160, E.Resin) },
  },
  {
    id: E.Wax,
    name: "Wax",
    base: E.Oil,
    color: "#ead5a0",
    state: "solid",
    density: 3,
    pair: [E.Oil, E.Ice],
    description: "Melts at 60°C. Molten wax solidifies again as it cools.",
    traits: { ignition: 250, fuel: 200, ...heat(60, E.MoltenWax) },
  },
  {
    id: E.MoltenWax,
    name: "Molten wax",
    base: E.Oil,
    color: "#f1c679",
    state: "liquid",
    density: 2,
    pair: [E.Wax, E.Fire],
    description:
      "Warm, flowing wax. Cools into a solid and burns if overheated.",
    traits: {
      viscosity: 3,
      defaultTemperature: 85,
      ignition: 250,
      fuel: 200,
      ...cold(45, E.Wax),
    },
  },
  {
    id: E.Tar,
    name: "Tar",
    base: E.Oil,
    color: "#514855",
    state: "liquid",
    density: 4,
    pair: [E.Oil, E.Coal],
    description: "Very thick fuel. Flows slowly and contaminates water.",
    traits: { viscosity: 8, ignition: 280, fuel: 350, polluting: 4 },
  },
  {
    id: E.Plastic,
    name: "Plastic",
    base: E.Oil,
    color: "#ac8db2",
    state: "solid",
    density: 3,
    pair: [E.Oil, E.Lava],
    description:
      "Waterproof electrical insulator. Softens into tar under heat.",
    traits: {
      acidResistance: 0.85,
      ignition: 350,
      fuel: 250,
      polluting: 1,
      burnProduct: E.Smoke,
      ...heat(220, E.Tar),
    },
  },
  {
    id: E.Copper,
    name: "Copper",
    base: E.Metal,
    color: "#c8845f",
    state: "solid",
    density: 10,
    pair: [E.Metal, E.Clay],
    description:
      "Strong conductor of heat and electricity. Slowly corrodes in wet conditions.",
    traits: {
      electrical: 1,
      conductivity: 0.95,
      rustRate: 0.25,
      ...heat(1080, E.MoltenMetal),
    },
  },
  {
    id: E.Iron,
    name: "Iron",
    base: E.Metal,
    color: "#999ca6",
    state: "solid",
    density: 10,
    pair: [E.Metal, E.Stone],
    description: "Conductive metal. Water and salt turn it into crumbly rust.",
    traits: { rustRate: 1, acidResistance: 0.45, ...heat(1450, E.MoltenMetal) },
  },
  {
    id: E.Steel,
    name: "Steel",
    base: E.Metal,
    color: "#839bab",
    state: "solid",
    density: 10,
    pair: [E.Iron, E.Coal],
    description:
      "Durable alloy. Conducts electricity and rusts more slowly than iron.",
    traits: {
      conductivity: 0.65,
      rustRate: 0.15,
      acidResistance: 0.8,
      ...heat(1400, E.MoltenMetal),
    },
  },
  {
    id: E.Gold,
    name: "Gold",
    base: E.Metal,
    color: "#e2bc5e",
    state: "solid",
    density: 15,
    pair: [E.Metal, E.Crystal],
    description: "Dense, acid-resistant conductor. Melts under intense heat.",
    traits: {
      acidResistance: 1,
      conductivity: 0.9,
      ...heat(1060, E.MoltenMetal),
    },
  },
  {
    id: E.Silver,
    name: "Silver",
    base: E.Metal,
    color: "#d6dfe6",
    state: "solid",
    density: 12,
    pair: [E.Metal, E.Ice],
    description: "Excellent heat and electrical conductor. Melts below copper.",
    traits: {
      conductivity: 1,
      electrical: 1.2,
      acidResistance: 0.7,
      ...heat(960, E.MoltenMetal),
    },
  },
  {
    id: E.Tin,
    name: "Tin",
    base: E.Metal,
    color: "#b4c5c1",
    state: "solid",
    density: 9,
    pair: [E.Metal, E.Sand],
    description:
      "Low-melting conductive metal. Blends with copper to discover bronze.",
    traits: { conductivity: 0.5, electrical: 0.6, ...heat(230, E.MoltenMetal) },
  },
  {
    id: E.Bronze,
    name: "Bronze",
    base: E.Metal,
    color: "#ab864f",
    state: "solid",
    density: 10,
    pair: [E.Copper, E.Tin],
    description:
      "Copper-tin alloy. Conducts electricity and resists corrosion.",
    traits: {
      conductivity: 0.55,
      electrical: 0.7,
      acidResistance: 0.85,
      ...heat(950, E.MoltenMetal),
    },
  },
  {
    id: E.Brass,
    name: "Brass",
    base: E.Metal,
    color: "#cfb36d",
    state: "solid",
    density: 10,
    pair: [E.Copper, E.Metal],
    description:
      "Conductive yellow alloy. Holds up to water and melts under high heat.",
    traits: {
      conductivity: 0.65,
      electrical: 0.8,
      acidResistance: 0.8,
      ...heat(900, E.MoltenMetal),
    },
  },
  {
    id: E.Rust,
    name: "Rust",
    base: E.Sand,
    color: "#b36543",
    state: "powder",
    density: 6,
    pair: [E.Iron, E.Water],
    description:
      "Heavy, nonconductive corrosion residue. Falls away from rusted metal.",
    traits: { absorbency: 40, acidResistance: 0.15 },
  },
  {
    id: E.Mercury,
    name: "Mercury",
    base: E.Metal,
    color: "#aab9c4",
    state: "liquid",
    density: 14,
    pair: [E.Metal, E.Acid],
    description: "Dense liquid conductor. Sinks through water and pollutes it.",
    traits: {
      polluting: 8,
      blastResistance: 0,
      electrical: 0.8,
      conductivity: 0.5,
    },
  },
  {
    id: E.MoltenMetal,
    name: "Molten metal",
    base: E.Metal,
    color: "#f4b471",
    state: "liquid",
    density: 10,
    pair: [E.Metal, E.Lava],
    description:
      "Hot conductive liquid. Solidifies into generic metal below 200°C.",
    traits: {
      defaultTemperature: 1500,
      viscosity: 2,
      blastResistance: 0,
      ...cold(200, E.Metal),
    },
  },
  {
    id: E.Sulfur,
    name: "Sulfur",
    base: E.Sand,
    color: "#ddda62",
    state: "powder",
    density: 4,
    pair: [E.Lava, E.Acid],
    description:
      "Combustible mineral dust. Burning sulfur releases smoke and pollutes water.",
    traits: { ignition: 180, fuel: 90, burnProduct: E.Smoke, polluting: 3 },
  },
  {
    id: E.Lye,
    name: "Lye",
    base: E.Sand,
    color: "#d8e6d1",
    state: "powder",
    density: 4,
    pair: [E.Ash, E.Limestone],
    description:
      "Finite acid-neutralizing powder. Dissolves into water as contamination.",
    traits: {
      neutralizer: true,
      defaultFertility: 100,
      waterProduct: E.Water,
      waterPollution: 35,
    },
  },
  {
    id: E.Soap,
    name: "Soap",
    base: E.Wax,
    color: "#afcdd0",
    state: "solid",
    density: 3,
    pair: [E.Lye, E.Oil],
    description:
      "Foams on contact with water. Foam rises and eventually becomes water.",
    traits: { waterProduct: E.Foam, waterPollution: 8 },
  },
  {
    id: E.Foam,
    name: "Foam",
    base: E.Steam,
    color: "#d6ece4",
    state: "gas",
    density: 0,
    pair: [E.Soap, E.Water],
    description:
      "Short-lived bubbles. Rise through air and collapse into water.",
    lifetime: 80,
    traits: { defaultTemperature: 20, expiresTo: E.Water },
  },
  {
    id: E.Slime,
    name: "Slime",
    base: E.Water,
    color: "#91b871",
    state: "liquid",
    density: 4,
    pair: [E.Algae, E.Mud],
    description:
      "Thick contaminated liquid. Carries salt and nutrients but is unsafe for fish.",
    traits: { viscosity: 7, defaultPollution: 45, defaultFertility: 40 },
  },
  {
    id: E.Honey,
    name: "Honey",
    base: E.Oil,
    color: "#dca850",
    state: "liquid",
    density: 4,
    pair: [E.Pollen, E.Water],
    description:
      "Slow-flowing nutrient liquid. Dissolves into water; heat leaves sugar.",
    traits: {
      viscosity: 7,
      soluble: "nutrients",
      defaultFertility: 90,
      ignition: 300,
      ...heat(150, E.Sugar),
    },
  },
  {
    id: E.Sugar,
    name: "Sugar",
    base: E.Ash,
    color: "#eee4ca",
    state: "powder",
    density: 4,
    pair: [E.Honey, E.Sand],
    description:
      "Nutrient crystals. Dissolve into water and char under high heat.",
    traits: {
      defaultFertility: 80,
      ignition: 220,
      fuel: 55,
      ...heat(190, E.Charcoal),
    },
  },
  {
    id: E.Alcohol,
    name: "Alcohol",
    base: E.Oil,
    color: "#accfc8",
    state: "liquid",
    density: 2,
    pair: [E.Sugar, E.Water],
    description:
      "Low-density flammable liquid. Vaporizes when warm and contaminates water.",
    traits: {
      ignition: 170,
      fuel: 100,
      polluting: 3,
      ...heat(78, E.AlcoholVapor),
    },
  },
  {
    id: E.AlcoholVapor,
    name: "Alcohol vapor",
    base: E.Smoke,
    color: "#c5d3df",
    state: "gas",
    density: 0,
    pair: [E.Alcohol, E.Fire],
    description: "Flammable vapor. Cools back into alcohol below 65°C.",
    traits: {
      defaultTemperature: 90,
      ignition: 150,
      fuel: 35,
      ...cold(65, E.Alcohol),
    },
  },
  {
    id: E.Hydrogen,
    name: "Hydrogen",
    base: E.Smoke,
    color: "#cdaaca",
    state: "gas",
    density: 0,
    pair: [E.Steam, E.Spark],
    description: "Light flammable gas. Ignition produces a small blast.",
    traits: { defaultTemperature: 20, ignition: 120, fuel: 20, explosive: 7 },
  },
  {
    id: E.Oxygen,
    name: "Oxygen",
    base: E.Smoke,
    color: "#abcbe1",
    state: "gas",
    density: 0,
    pair: [E.Plant, E.Spark],
    description:
      "Supports combustion. Helps adjacent hot, dry fuel catch fire.",
    traits: { defaultTemperature: 20, oxidizer: true },
  },
  {
    id: E.CarbonDioxide,
    name: "Carbon dioxide",
    base: E.Smoke,
    color: "#91a2b4",
    state: "gas",
    density: 0,
    pair: [E.Coal, E.Fire],
    description:
      "Nonflammable gas. Suppresses nearby flames; deep cold makes dry ice.",
    traits: {
      defaultTemperature: 20,
      suppressant: true,
      ...cold(-78, E.DryIce),
    },
  },
  {
    id: E.DryIce,
    name: "Dry ice",
    base: E.Ice,
    color: "#bacce5",
    state: "powder",
    density: 5,
    pair: [E.CarbonDioxide, E.Ice],
    description:
      "Very cold solid. Sublimates directly into carbon dioxide as it warms.",
    traits: { defaultTemperature: -100, ...heat(-70, E.CarbonDioxide) },
  },
];

function category(entry: Entry): Category {
  if (entry.state === "gas") return "Gases";
  if (entry.state === "liquid") return "Liquids";
  if (entry.traits?.explosive || entry.id === E.Coal || entry.id === E.Sulfur)
    return "Energy";
  return entry.state === "powder" ||
    entry.base === E.Plant ||
    entry.base === E.Wood ||
    entry.base === E.Soil
    ? "Nature"
    : "Solids";
}
export const expandedElements: Element[] = entries.map((e) => ({
  id: e.id,
  name: e.name,
  color: e.color,
  state: e.state,
  density: e.density,
  category: category(e),
  description: e.description,
  lifetime: e.lifetime,
  icon:
    e.state === "gas"
      ? "steam"
      : e.state === "liquid"
        ? "water"
        : e.base === E.Plant
          ? "plant"
          : e.base === E.Wood
            ? "wood"
            : e.base === E.Metal
              ? "metal"
              : e.base === E.Crystal
                ? "crystal"
                : e.state === "powder"
                  ? "sand"
                  : "stone",
}));
export const expandedTraits = entries.map((e) => ({
  id: e.id,
  base: e.base,
  traits: e.traits ?? {},
}));
export const expandedRecipes = entries.map((e) => ({
  a: e.pair[0],
  b: e.pair[1],
  products: [e.id],
  note: `Discovered ${e.name.toLowerCase()}.`,
}));
