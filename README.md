# Particle — living sandbox

A single-player particle sandbox built with **Phaser 3, TypeScript, and Vite**. Start with **Sand, Water, Stone, and Fire** and unlock **196 more materials**, humans, freshwater fish, and saltwater fish through the combiner.

## Discovery progression

Only four items are initially available. The other 199 items can be discovered through the combiner, and materials created by world reactions also unlock; the complete graph is verified by tests against the actual combiner. Examples:

- Stone + Sand → Soil; Soil + Water → Mud; Soil + Mud → Seed.
- Seed + Water → Plant; Plant + Plant → Wood.
- Plant + Water → Freshwater fish; Freshwater fish + Salt → Saltwater fish.
- Mud + Plant → Human.

Click a locked item or open Discoveries for its recipe. Natural world reactions unlock the materials they create, including heat transformations, burning, growth, and chemical products. Painting, terrain generation, and loading existing particles do not grant discoveries by themselves. Existing version 3 discoveries are preserved; the 116 new materials start locked. Older legacy saves can restore their world but cannot grant old starter unlocks. The Living lab preset becomes available after unlocking all 203 items.

## Hosting

GitHub Pages deployment is configured in `.github/workflows/pages.yml`. Every push to `main` runs tests, builds the game, and publishes `dist`. In repository **Settings → Pages**, select **GitHub Actions** as the source. Vite uses relative asset paths so the game works under a repository URL as well as localhost. Deployment uses GitHub's built-in token; no custom secrets are needed.

## Run

```sh
npm install
npm run dev
npm test
npm run build
```

Open the local URL from Vite. `npm run preview` serves the production build.

## Try the ecology pass

1. After discovering all 203 items, choose **World → Living lab**. The left aquarium contains freshwater fish; the right contains saltwater fish. Seeds and humans occupy the ground between them.
2. Select the **Salinity** overlay to see the difference. Use **Inspect (I)** on particles and creatures to read their conditions and needs.
3. Drop **Salt** into water. It dissolves and spreads as a property of Water. Saltwater fish need salinity 12–70; freshwater fish need 0–9; humans drink safe water at 0–7.
4. Drop **Seed** or **Plant** onto moist **Soil** or watered **Sand**. Inspect a plant to see what it needs. Seedlings grow into branching, woody plants and eventually release seeds. Try fresh water, fertilizer, salt, or fire near their roots.
5. Unlocked **Human**, **Freshwater fish**, and **Saltwater fish** appear in the default **All** palette alongside materials. Select and click once per creature, or drag one into the world. Fish must be placed in water.
6. Drag **Salt** and **Water** into **Combine**. The second drop immediately produces **Salty water**. Drag the result to place a blob, click it to paint, or combine it again. Existing modifiers carry forward when the resulting base material stays the same. Selecting a base material resets its properties.

The **Field guide** explains the environmental systems and lists all 20 modifier experiments. See [INTERACTIONS.md](INTERACTIONS.md) for the complete mechanics.

Click **Hint** beside Combine for a new recipe using ingredients you already own. It prioritizes the locked ingredient and cycles through suggestions without unlocking anything automatically.

## Controls

- Click/drag: paint. Right-click the world or **E**: erase particles and creatures. **B**: brush. **I**: inspect.
- Drag palette items into the canvas to place a circular blob using the brush size (minimum radius 5). Drag two items into Combine for an automatic result. Right-click a palette item or combination result to add it to Combine immediately. Focus a palette item and press **C** for a keyboard alternative. **Escape** cancels a drag; dropping outside a target does nothing.
- Click the lock icon beside a combiner ingredient to keep it in place. While locked, right-click other palette items to try them immediately. Left-click always selects your brush; click Locked to release the ingredient. Clear resets both inputs and the pin.
- Scroll or **[ / ]**: brush size. Toolbar: round/square brush, undo, pause, single tick, speed, clear, and fullscreen.
- **Space**: pause/resume. Painting, adding life, and inspecting still work while paused.
- Overlay selector: natural colors, temperature, salinity, moisture, pollution, fertility, or electricity.
- Population counter: inspect living creatures, current behavior, health, rooted plants, and deaths.
- Save/load: one complete local world, including modifiers and living entities. Undo restores the last world edit. A new world keeps unlocked element discoveries.

## Material library

The library contains **200 materials** plus three life forms. The original 24 and first 60 additions are joined by 116 discoveries covering reactive chemicals, machinery, radiation, weather, consuming colonies, and fantasy matter. See `src/expansion.ts` and `src/frontier.ts` for the definitions and discovery pairs.

There are **4 starter materials** and **199 unlockable palette items**, including life. The combiner has 13 physical material previews, 189 additional discovery recipes, and 20 modifier previews. Discovery recipes are abstract game rules, separate from live physical reactions. For example, combining Ash + Salt unlocks Gunpowder, while ash and salt touching in the world still behave as nutrients and dissolved minerals.

New discovery chains include Mud + Sand → Clay, Clay + Fire → Brick; Wood + Stone → Coal, Metal + Stone → Iron, Iron + Coal → Steel; and Plant + Steam → Algae, Algae + Salt → Kelp. Every new item remains reachable from the four starters.

Physical capabilities include wax melting and solidifying, clay firing, metal melting, alcohol evaporation and condensation, dry ice sublimation, charcoal filtering pollution with finite capacity, soap foaming, fertilizer dissolving into nutrients, iron rusting faster near salty water, mercury polluting water, oxygen supporting ignition, and carbon dioxide suppressing fire. Moss and fungus spread near moist fertile soil; algae and kelp require nutrient-bearing water within their salinity range. Existing heat, moisture, combustion, acidity, electricity, and habitat systems apply through shared traits.

## Architecture and extension points

The 200-material pass adds pressure bursts, radioactive dose and shielding, powered machines, directed chemical reactions, finite emission reservoirs, consuming colonies, magnetic and gravity impulses, and mutation. These properties combine with the original temperature, salt, acidity, pollution, nutrient, and electrical systems. Try Sodium + Water in the world, or discover Cloud + Spark and drag a storm above a lake. The Field guide includes practical experiments.

Pressure and Radiation overlays reveal the new conditions. Inspect also shows remaining reserve. Clouds, batteries, emitters, antidotes, and replicating colonies have bounded supplies. Effects move and transform real particles; transient rings, arcs, and glow make their activity visible. Pressure is a local game-scale approximation rather than a fluid solver, and fantasy materials are intentionally exaggerated.

`src/frontier.ts` declares the 116 added materials. `src/dynamics.ts` implements shared systems; `Dynamics` in `src/materials.ts` defines their reusable parameters. Add contact transformations, powered responses, emission products, colony food requirements, or force parameters in data. Expensive spatial effects are staggered and limited per tick; visual effects are capped at 48. Pressure and radiation are stored and transported with particles; older version 2 saves initialize these new fields to zero.

| File                        | Responsibility                                                                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `src/ids.ts`                | Stable byte IDs for saved materials                                                                                                    |
| `src/elements.ts`           | Original descriptions, palette groups, physical recipes, and combined registry                                                         |
| `src/expansion.ts`          | Added material definitions, inherited capabilities, and discovery pairs                                                                |
| `src/material-behaviors.ts` | Optional filtering, neutralization, rusting, phase transitions, and growth                                                             |
| `src/materials.ts`          | Shared capabilities: absorbency, conductivity, fuel, ignition point, solubility, resistance, soil/water traits, and species tolerances |
| `src/modifiers.ts`          | Typed arrays for particle properties; initialization, transport, snapshots, and compact run-length storage                             |
| `src/environment.ts`        | Heat exchange, diffusion, absorption, dissolution, phases, combustion, corrosion, neutralization, and electrical propagation           |
| `src/life.ts`               | Rooted plant lifecycle, human needs and movement, fish habitat checks, death, and entity validation                                    |
| `src/simulation.ts`         | Seeded particle movement, terrain, world orchestration, shared state, and versioned persistence                                        |
| `src/experiments.ts`        | Modifier experiments and explanatory field notes                                                                                       |
| `src/scene.ts`              | Phaser rendering, life sprites, overlays, and mapping pointer input to world coordinates                                               |
| `src/main.ts`               | DOM interface, local saves, inspectors, lab brushes, and discovery progression                                                         |
| `src/ui.ts`                 | Compact palette, combiner, world menus, and canvas toolbar markup                                                                      |
| `src/palette-drag.ts`       | Shared pointer drag handling, preview, cancellation, and keyboard alternative                                                          |
| `src/combiner.ts`           | Reusable combination previews, modifier inheritance, and canvas drop mapping                                                           |
| `src/crafting.ts`           | Discovery graph, shared material/life keys, and versioned progression                                                                  |
| `src/starting-world.ts`     | Starting terrain restricted to the four base materials                                                                                 |

To add a material, assign a stable ID in `ids.ts`, then add its definition, parent material, capability overrides, and discovery pair in `expansion.ts`. For example, an absorbent organic fuel automatically gets wet, dries, resists ignition while wet, burns when sufficiently hot, and responds to corrosive environments. A new water-like liquid inherits diffusion, electrical conduction, absorption, and habitat checks through its `aqueous` trait. Optional transition and contact properties provide specialized behavior without expanding a switch for every material.

Species tolerance profiles live in `habitats`; the existing fish update uses the profile to evaluate temperature, salinity, pollution, and acidity. Humans share the water-safety check for drinking. The current plant form is a single rooted branching species; its growth rules are separate from particle rendering.

The grid is **540 × 220**, with 118,800 cells. The physics clock is 30 Hz; environment work runs every fourth tick, creature decisions every third tick, and growth checks every fifteenth tick. Inert, ambient-temperature minerals skip unnecessary environmental updates. Limits are 120 creatures and 180 rooted plant colonies.

The byte-based material registry supports up to 255 IDs. For larger registries, upgrade the cell array and reaction-key stride. For substantially larger worlds, move simulation to a Web Worker and introduce active chunks.

## Saves and scope

Version 2 saves include all particle modifiers, organisms, plants, timers, random state, and field-note history. Arrays are run-length packed to keep saves small. Version 1 worlds at the current grid dimensions migrate with default material properties. Malformed saves are validated before live state changes.

Saves and discoveries are browser-local. No accounts, cloud sync, or backend are used. Chemistry, metabolism, and time scales are intentionally simplified for play; salinity and acidity use game-scale values. Humans currently have individual survival behavior rather than villages or civilization systems. Fish do not reproduce in this pass.

Pixel art is generated locally. Lucide supplies UI icons. DM Sans and Manrope load from Google Fonts with local fallbacks. Verification evidence is in [QA.md](QA.md).

## World templates

Open **World → New world** to choose First world, Blank canvas, Canyon river, Reservoirs, Underground lake, or Discovery chaos. The three new landscapes use starter terrain. Discovery chaos shuffles a patch of every unlocked material (creatures are excluded) and starts paused. Press Play to start reactions. Discoveries persist, and Undo restores the previous world immediately after switching.
