import { E, starters } from "./elements";
import type { Simulation } from "./simulation";

export function generateStartingWorld(sim: Simulation, seed = 72831) {
  sim.generate(seed);
  sim.creatures = [];
  sim.plants = [];
  for (let i = 0; i < sim.cells.length; i++) {
    if (sim.cells[i] === E.Soil) sim.put(i, E.Sand);
    else if (sim.cells[i] && !starters.includes(sim.cells[i]))
      sim.put(i, E.Empty);
  }
  sim.milestones.clear();
}
