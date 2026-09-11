import { byId, E, elements, recipes, starters } from "./elements";
import { habitats, type Species } from "./materials";
import type { PaletteItem } from "./combiner";
import { expandedRecipes } from "./expansion";
import { frontierRecipes } from "./frontier";

export type ItemKey = number | Species;
export const itemKey = (item: PaletteItem): ItemKey =>
  item.kind === "material" ? item.id : item.species;
export const itemFromKey = (key: ItemKey): PaletteItem =>
  typeof key === "number"
    ? { kind: "material", id: key }
    : { kind: "life", species: key };
export const keyLabel = (key: ItemKey) =>
  typeof key === "number" ? byId.get(key)!.name : habitats[key].label;
export const validKey = (key: unknown): key is ItemKey =>
  typeof key === "number"
    ? byId.has(key)
    : typeof key === "string" && Object.hasOwn(habitats, key);
export const allItems: PaletteItem[] = [
  ...(Object.keys(habitats) as Species[]).map((species) => ({
    kind: "life" as const,
    species,
  })),
  ...elements.map((e) => ({ kind: "material" as const, id: e.id })),
];
export interface CraftRecipe {
  a: ItemKey;
  b: ItemKey;
  products: ItemKey[];
  note: string;
}
/** Abstract discovery recipes do not change the physical contact rules. */
export const discoveryRecipes: CraftRecipe[] = [
  ...expandedRecipes,
  ...frontierRecipes,
  {
    a: E.Stone,
    b: E.Sand,
    products: [E.Soil],
    note: "Weathered rock forms soil.",
  },
  { a: E.Stone, b: E.Fire, products: [E.Lava], note: "Heat melts rock." },
  {
    a: E.Water,
    b: E.Water,
    products: [E.Ice],
    note: "Combine water with itself to discover its frozen form.",
  },
  {
    a: E.Stone,
    b: E.Lava,
    products: [E.Metal],
    note: "Refine metal from molten rock.",
  },
  {
    a: E.Sand,
    b: E.Water,
    products: [E.Salt],
    note: "Discover the dissolved minerals in water.",
  },
  {
    a: E.Soil,
    b: E.Mud,
    products: [E.Seed],
    note: "Fertile ground gives rise to a seed.",
  },
  {
    a: E.Plant,
    b: E.Plant,
    products: [E.Wood],
    note: "Growing plants form wood.",
  },
  {
    a: E.Plant,
    b: E.Stone,
    products: [E.Oil],
    note: "Buried organic matter becomes oil.",
  },
  {
    a: E.Steam,
    b: E.Smoke,
    products: [E.Acid],
    note: "Discover a corrosive liquid.",
  },
  {
    a: E.Ash,
    b: E.Salt,
    products: [E.Gunpowder],
    note: "A sandbox recipe for an explosive powder.",
  },
  {
    a: E.Plant,
    b: E.Water,
    products: ["freshwater"],
    note: "Aquatic life begins in fresh water.",
  },
  {
    a: "freshwater",
    b: E.Salt,
    products: ["saltwater"],
    note: "Discover fish adapted to salt water.",
  },
  {
    a: E.Mud,
    b: E.Plant,
    products: ["human"],
    note: "Earth and life give rise to humans.",
  },
];
export const combinationRecipes: CraftRecipe[] = [
  ...recipes.map((r) => ({ ...r, products: r.products.filter(Boolean) })),
  ...discoveryRecipes,
];
export const discoveryRecipeFor = (a: ItemKey, b: ItemKey) =>
  discoveryRecipes.find(
    (r) => (r.a === a && r.b === b) || (r.a === b && r.b === a),
  );
export const recipeForUnlock = (key: ItemKey) =>
  combinationRecipes.find((r) => r.products.includes(key));

export const PROGRESS_KEY = "particle-progress-v3";
export const PROGRESS_VERSION = 3;
export function restoreProgress(raw: unknown): Set<ItemKey> {
  const unlocked = new Set<ItemKey>(starters);
  if (!raw || typeof raw !== "object") return unlocked;
  const data = raw as { version?: unknown; unlocked?: unknown };
  if (data.version === PROGRESS_VERSION && Array.isArray(data.unlocked))
    data.unlocked.filter(validKey).forEach((key) => unlocked.add(key));
  return unlocked;
}
