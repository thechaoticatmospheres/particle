import { E, byId } from "./elements";
import { generateStartingWorld } from "./starting-world";
import type { Simulation } from "./simulation";
import type { ItemKey } from "./crafting";

export const worldTemplates = [
  {
    id: "original",
    name: "First world",
    description: "The familiar hills, lake, and floating islands.",
  },
  {
    id: "empty",
    name: "Blank canvas",
    description: "Open space for experiments from scratch.",
  },
  {
    id: "canyon",
    name: "Canyon river",
    description: "High sandstone cliffs around a deep central river.",
  },
  {
    id: "reservoirs",
    name: "Reservoirs",
    description: "Three elevated pools. Break the walls and flood the valley.",
  },
  {
    id: "cavern",
    name: "Underground lake",
    description: "A stone cavern, hanging pillars, and a pool below.",
  },
  {
    id: "random",
    name: "Discovery chaos",
    description:
      "A shuffled patch of every discovered material. Starts paused—press Play to let them react.",
  },
] as const;
export type WorldTemplate = (typeof worldTemplates)[number]["id"];

export function generateTemplate(
  s: Simulation,
  template: WorldTemplate,
  unlocked: Set<ItemKey>,
  seed = 72831,
) {
  if (template === "original") {
    generateStartingWorld(s, seed);
    return;
  }
  s.clear();
  s.rng = seed || 72831;
  if (template === "empty") return;
  const w = s.width,
    h = s.height;
  if (template === "random") {
    const ids = [...unlocked].filter(
      (id): id is number => typeof id === "number" && id > 0 && byId.has(id),
    );
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(s.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    const cols = Math.max(1, Math.ceil(Math.sqrt((ids.length * w) / h))),
      rows = Math.ceil(ids.length / cols);
    ids.forEach((id, n) => {
      const x = Math.floor((((n % cols) + 0.5) * w) / cols),
        y = Math.floor(((Math.floor(n / cols) + 0.5) * h) / rows);
      const radius = Math.max(
        1,
        Math.min(7, Math.floor(Math.min(w / cols, h / rows) / 4)),
      );
      for (let dy = -radius; dy <= radius; dy++)
        for (let dx = -radius; dx <= radius; dx++)
          if (dx * dx + dy * dy <= radius * radius) s.set(x + dx, y + dy, id);
    });
    return;
  }
  for (let x = 0; x < w; x++)
    for (let y = 0; y < h; y++) {
      const nx = x / w,
        ny = y / h;
      let id: number = 0;
      if (template === "canyon") {
        const surface =
          0.85 -
          0.52 * Math.pow(Math.abs(nx - 0.5) * 2, 0.6) +
          Math.sin(nx * 30) * 0.025;
        if (ny > surface) id = ny < surface + 0.035 ? E.Sand : E.Stone;
        else if (ny > 0.69) id = E.Water;
      } else if (template === "reservoirs") {
        if (ny > 0.9) id = ny < 0.94 ? E.Sand : E.Stone;
        for (let n = 0; n < 3; n++) {
          const left = 0.08 + n * 0.3,
            right = left + 0.22,
            bottom = 0.38 + n * 0.13;
          if (
            nx >= left &&
            nx <= right &&
            ny > bottom - 0.15 &&
            ny < bottom + 0.025
          )
            id =
              nx < left + 0.012 || nx > right - 0.012 || ny > bottom
                ? E.Stone
                : E.Water;
        }
      } else {
        const roof =
          0.14 +
          0.05 * Math.sin(nx * 19) +
          0.1 * Math.pow(Math.max(0, Math.sin(nx * 45)), 8);
        const floor = 0.86 + Math.sin(nx * 18) * 0.04;
        if (nx < 0.025 || nx > 0.975 || ny < roof || ny > floor) id = E.Stone;
        else if (ny > 0.73) id = E.Water;
        else if (ny > floor - 0.025) id = E.Sand;
      }
      if (id) s.set(x, y, id);
    }
}
