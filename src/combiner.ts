import { byId, recipeFor, starters } from "./elements";
import { modifierExperimentFor } from "./experiments";
import type { Species } from "./materials";
import type { ModifierValues } from "./modifiers";
import { discoveryRecipeFor, itemKey, itemFromKey } from "./crafting";

export type PaletteItem =
  | {
      kind: "material";
      id: number;
      label?: string;
      description?: string;
      properties?: ModifierValues;
    }
  | { kind: "life"; species: Species };
export interface Combination {
  results: PaletteItem[];
  message: string;
}

/** The combiner is a preview; the world still resolves reactions over time. */
export function combine(a: PaletteItem, b: PaletteItem): Combination {
  const discovery = discoveryRecipeFor(itemKey(a), itemKey(b));
  if (discovery)
    return {
      results: discovery.products.map(itemFromKey),
      message: `${discovery.note} Drag a result to place it, or click to select.`,
    };
  if (a.kind === "life" || b.kind === "life")
    return {
      results: [],
      message:
        "Life responds to its habitat. Place it in the world to interact.",
    };
  const experiment = modifierExperimentFor(a.id, b.id);
  if (experiment) {
    const carried = {
      ...(a.id === experiment.output ? a.properties : {}),
      ...(b.id === experiment.output ? b.properties : {}),
    };
    return {
      results: [
        {
          kind: "material",
          id: experiment.output,
          label: experiment.label,
          description: experiment.description,
          properties: { ...carried, ...experiment.properties },
        },
      ],
      message: "Drag the result into the world, or click it to paint.",
    };
  }
  const recipe = recipeFor(a.id, b.id);
  if (!recipe)
    return {
      results: [],
      message:
        "No reaction for this pair. Drop another element to start again.",
    };
  const ids = [...new Set(recipe.products.filter(Boolean))].sort(
    (x, y) => Number(starters.includes(x)) - Number(starters.includes(y)),
  );
  return {
    results: ids.map((id) => ({
      kind: "material",
      id,
      properties: {
        ...(a.id === id ? a.properties : {}),
        ...(b.id === id ? b.properties : {}),
      },
    })),
    message: `${ids.map((id) => byId.get(id)!.name).join(" + ")}. Drag a result to place it.`,
  };
}

export function worldPoint(
  x: number,
  y: number,
  bounds: { left: number; top: number; width: number; height: number },
  width: number,
  height: number,
) {
  if (
    bounds.width <= 0 ||
    bounds.height <= 0 ||
    x < bounds.left ||
    y < bounds.top ||
    x >= bounds.left + bounds.width ||
    y >= bounds.top + bounds.height
  )
    return null;
  return {
    x: Math.floor(((x - bounds.left) * width) / bounds.width),
    y: Math.floor(((y - bounds.top) * height) / bounds.height),
  };
}
