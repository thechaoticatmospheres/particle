import { E } from "./ids";
export { E } from "./ids";
import { expandedElements } from "./expansion";
import { frontierElements } from "./frontier";
export type Matter = "powder" | "liquid" | "solid" | "gas" | "energy";
export type Category = "Nature" | "Liquids" | "Solids" | "Energy" | "Gases";
export interface Element {
  id: number;
  name: string;
  color: string;
  icon: string;
  category: Category;
  state: Matter;
  density: number;
  description: string;
  starter?: boolean;
  lifetime?: number;
}
export const elements: Element[] = [
  {
    id: 1,
    starter: true,
    name: "Sand",
    color: "#e9cc81",
    icon: "sand",
    category: "Nature",
    state: "powder",
    density: 5,
    description: "Falls, piles up, and turns to glass in lava.",
  },
  {
    id: 2,
    starter: true,
    name: "Water",
    color: "#58adf6",
    icon: "water",
    category: "Liquids",
    state: "liquid",
    density: 3,
    description:
      "Carries heat, dissolved salt, pollutants, and electricity. Inspect it to check whether it is safe for life.",
  },
  {
    id: 3,
    starter: true,
    name: "Stone",
    color: "#8997ab",
    icon: "stone",
    category: "Solids",
    state: "solid",
    density: 10,
    description: "Solid terrain for walls, ground, and containers.",
  },
  {
    id: 4,
    name: "Soil",
    color: "#ac7957",
    icon: "soil",
    category: "Nature",
    state: "solid",
    density: 8,
    description:
      "Holds moisture, salt, and nutrients. Seeds root in damp soil; saturated soil becomes mud.",
  },
  {
    id: 5,
    name: "Wood",
    color: "#c89568",
    icon: "wood",
    category: "Nature",
    state: "solid",
    density: 8,
    description: "Absorbs water. Burns when dry and hot enough.",
  },
  {
    id: 6,
    name: "Seed",
    color: "#a9cf69",
    icon: "seed",
    category: "Nature",
    state: "powder",
    density: 4,
    description:
      "Place on moist soil to grow a sprout, then a branching plant. Roots need fresh water and nutrients.",
  },
  {
    id: 7,
    starter: true,
    name: "Fire",
    color: "#ff965b",
    icon: "fire",
    category: "Energy",
    state: "energy",
    density: 0,
    lifetime: 65,
    description:
      "Burns wood, plants, oil, and gunpowder. Water extinguishes it.",
  },
  {
    id: 8,
    name: "Lava",
    color: "#fa7056",
    icon: "lava",
    category: "Liquids",
    state: "liquid",
    density: 6,
    description: "Forms obsidian with water and glass with sand.",
  },
  {
    id: 9,
    name: "Oil",
    color: "#b997db",
    icon: "oil",
    category: "Liquids",
    state: "liquid",
    density: 2,
    description: "Floats on water, pollutes it, and catches fire.",
  },
  {
    id: 10,
    name: "Ice",
    color: "#a0e3eb",
    icon: "ice",
    category: "Solids",
    state: "solid",
    density: 8,
    description:
      "Cools neighboring materials. Heat and salt melt it; cold ice captures steam as snow.",
  },
  {
    id: 11,
    name: "Metal",
    color: "#bac6d0",
    icon: "metal",
    category: "Solids",
    state: "solid",
    density: 10,
    description:
      "Conducts heat and electricity. Water causes rust, salt speeds corrosion, and badly rusted metal crumbles.",
  },
  {
    id: 12,
    name: "Salt",
    color: "#ede5d3",
    icon: "salt",
    category: "Nature",
    state: "powder",
    density: 5,
    description:
      "Dissolves into water and changes its salinity. Salt spreads through water and wet soil, affecting fish, people, and roots.",
  },
  {
    id: 13,
    name: "Steam",
    color: "#c3dbe9",
    icon: "steam",
    category: "Gases",
    state: "gas",
    density: 0,
    lifetime: 230,
    description:
      "Water taking the scenic route. Rises, cools, and condenses back into water.",
  },
  {
    id: 14,
    name: "Glass",
    color: "#80d5bc",
    icon: "glass",
    category: "Solids",
    state: "solid",
    density: 10,
    description:
      "Sand, transformed by intense heat. A luminous building material.",
  },
  {
    id: 15,
    name: "Mud",
    color: "#86704e",
    icon: "soil",
    category: "Liquids",
    state: "liquid",
    density: 5,
    description:
      "Earth after the rain. Flows slowly and nourishes growing plants.",
  },
  {
    id: 16,
    name: "Plant",
    color: "#65c78b",
    icon: "plant",
    category: "Nature",
    state: "solid",
    density: 8,
    description:
      "Settles onto damp soil or watered sand, grows woody branches, and releases seeds at maturity. Drought, salt, acid, and pollution can kill it.",
  },
  {
    id: 17,
    name: "Ash",
    color: "#a69baa",
    icon: "sand",
    category: "Nature",
    state: "powder",
    density: 4,
    description:
      "Nutrient-rich remains. Fertilizes soil, enriches water, and neutralizes acid.",
  },
  {
    id: 18,
    name: "Smoke",
    color: "#788396",
    icon: "steam",
    category: "Gases",
    state: "gas",
    density: 0,
    lifetime: 160,
    description: "A trace of combustion. Drifts upward and slowly disappears.",
  },
  {
    id: 19,
    name: "Obsidian",
    color: "#73648d",
    icon: "stone",
    category: "Solids",
    state: "solid",
    density: 10,
    description: "Lava stopped in its tracks by water. Dark volcanic glass.",
  },
  {
    id: 20,
    name: "Snow",
    color: "#e6f5fc",
    icon: "snow",
    category: "Nature",
    state: "powder",
    density: 1,
    description: "Soft falling crystals. Melts when it touches fire or lava.",
  },
  {
    id: 21,
    name: "Acid",
    color: "#c4ea6a",
    icon: "acid",
    category: "Liquids",
    state: "liquid",
    density: 3,
    description:
      "Dilutes into acidic water, corrodes susceptible materials, and poisons habitats. Ash and fertile soil can neutralize it.",
  },
  {
    id: 22,
    name: "Crystal",
    color: "#d29ff2",
    icon: "crystal",
    category: "Solids",
    state: "solid",
    density: 10,
    description:
      "Salt transformed by lava. A little impossible geology for your world.",
  },
  {
    id: 23,
    name: "Gunpowder",
    color: "#b2a08b",
    icon: "sand",
    category: "Energy",
    state: "powder",
    density: 4,
    description:
      "Explodes when dry and ignited. Water makes it damp and inert; drying restores its sensitivity to heat and sparks.",
  },
  {
    id: 24,
    name: "Spark",
    color: "#f7df7d",
    icon: "spark",
    category: "Energy",
    state: "energy",
    density: 0,
    lifetime: 16,
    description: "A fleeting flash. Ignites oil, wood, plants, and gunpowder.",
  },
];
elements.push(...expandedElements);
elements.push(...frontierElements);
export const byId = new Map(elements.map((e) => [e.id, e]));
export interface Recipe {
  a: number;
  b: number;
  products: [number, number];
  chance: number;
  note: string;
}
export const recipes: Recipe[] = [
  {
    a: E.Fire,
    b: E.Water,
    products: [E.Steam, 0],
    chance: 0.8,
    note: "A change of state. A new possibility.",
  },
  {
    a: E.Lava,
    b: E.Sand,
    products: [E.Lava, E.Glass],
    chance: 0.3,
    note: "A little heat reveals something beautiful.",
  },
  {
    a: E.Soil,
    b: E.Water,
    products: [E.Mud, 0],
    chance: 0.018,
    note: "Good things begin in the dirt.",
  },
  {
    a: E.Seed,
    b: E.Water,
    products: [E.Plant, 0],
    chance: 0.7,
    note: "And just like that, life begins.",
  },
  {
    a: E.Wood,
    b: E.Fire,
    products: [E.Ash, E.Fire],
    chance: 0.035,
    note: "Every ending is a new ingredient.",
  },
  {
    a: E.Oil,
    b: E.Fire,
    products: [E.Fire, E.Smoke],
    chance: 0.5,
    note: "Where there is fire, there is smoke.",
  },
  {
    a: E.Lava,
    b: E.Water,
    products: [E.Obsidian, E.Steam],
    chance: 1,
    note: "A meeting of two powerful opposites.",
  },
  {
    a: E.Ice,
    b: E.Steam,
    products: [E.Ice, E.Snow],
    chance: 0.008,
    note: "A tiny winter in your little world.",
  },
  {
    a: E.Salt,
    b: E.Lava,
    products: [E.Crystal, E.Lava],
    chance: 0.4,
    note: "Hidden in the heat: a perfect crystal.",
  },
  {
    a: E.Metal,
    b: E.Fire,
    products: [E.Metal, E.Spark],
    chance: 0.12,
    note: "Even the strongest things have a spark.",
  },
  {
    a: E.Ice,
    b: E.Fire,
    products: [E.Water, 0],
    chance: 0.7,
    note: "The thaw begins.",
  },
  {
    a: E.Snow,
    b: E.Fire,
    products: [E.Water, 0],
    chance: 1,
    note: "The thaw begins.",
  },
  {
    a: E.Snow,
    b: E.Lava,
    products: [E.Water, E.Lava],
    chance: 1,
    note: "The thaw begins.",
  },
];
export const recipeFor = (a: number, b: number) =>
  recipes.find((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a));
export const starters = elements.filter((e) => e.starter).map((e) => e.id);
