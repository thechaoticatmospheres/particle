# UI and ecology verification

## Automated checks

Run `npm test` for the simulation and ecology suites. They cover particle movement, dissolution/saturation, salt conservation, modifier transport, phase changes, burning, wet fuels, soil hydration, nutrients, pollution, acidity, corrosion, electrical conduction, plant lifecycles, human needs, fish habitats, mortality, and atomic save validation.

Final result: **131 tests passed**. The production build passed TypeScript validation and Vite compilation. The combination and progression suites cover the four exact starters, all 203 items reachable through the actual combiner, recipe hints, life unlocks, old-save isolation, chained modifier inheritance, multiple products, terrain-preserving blob placement, and canvas boundary mapping.

Expansion tests cover all 200 stable material IDs, existing progression preservation, phase changes, finite filtering and neutralization, nutrient dissolution, absorption, rust, conductivity, pollution, soap foam, oxygen/fire suppression, hydrogen explosions, wet-fuel protection, aquatic growth salinity requirements, and deterministic save continuation with every material present.

The suites also verify version 1 save migration, exact deterministic continuation after restoring version 2, compressed save size, and a 1,000-tick full-size living-world run. `npm run build` checks TypeScript and produces a Vite production build.

## Browser verification

### Right-click combining

- Right-clicked Water and then Fire: each added once, and the second input produced Steam automatically.
- Right-clicked the Steam result to start another combination. Right-clicking locked Wood did not add it or change the current input. No context menu appeared over palette items; selection remained Sand.

### 200 materials and shared effects

- Existing 15 discoveries were preserved in a 203-item palette. Played the new paths to Sodium, Cloud, Storm Cloud, and Uranium through normal combiner controls.
- Dropped a large Storm Cloud: it emitted rain and electrical discharges. Dropped Sodium above the lake: contact produced visible fire and pressure bursts.
- Placed Uranium while paused; the inspector reported radiation 50 and reserve 100%. The Radiation overlay highlighted the blob.
- Saved the mixed world, reloaded the app, and loaded it successfully. Discovery progress persisted.
- Checked the new Pressure overlay at 390 × 844: palette and combiner remained accessible, with no horizontal overflow. Desktop screenshots also verified the expanded inspector. No browser application errors were logged.
- Automated checks include every discovery path, chemical reactions, shielded radiation, radioactivity transport, powered machinery, pressure confinement, finite colony/emitter reserves, impulse bounds, old-save migration, and deterministic mixed-world continuation. A full-size world with 4,800 mixed effect particles completed 240 ticks and remained saveable; the existing 1,000-tick ecology test also passed. These are regression checks, not a guarantee for every device or extreme combination.

### Material expansion

- The existing browser retained 13 discoveries and showed the expanded 87-item palette.
- Clicking locked Clay showed Mud + Sand without granting it. Combining those materials unlocked Clay; dragging Clay and Fire into the combiner immediately unlocked Brick.
- Dragged the Brick result into the paused world and inspected the placed blob: Brick, 20°C, with zero salt, pollution, and acidity.
- Reviewed the expanded palette screenshot: the playfield and combiner remain visible while the longer material list scrolls.

### Four-element progression

- Fresh browser load showed exactly Sand, Water, Stone, and Fire available (4 / 27), with no creatures in the starting terrain. Existing legacy unlock storage did not grant the old palette.
- Clicking locked Human displayed its Mud + Plant recipe and did not select or spawn it.
- Dragging Water and Fire into Combine unlocked Steam (5 / 27); reloading preserved that discovery.
- Played the combination chain through Soil, Mud, Seed, Plant, Human, Freshwater fish, Salt, and Saltwater fish. All unlocked successfully, with no browser errors.
- GitHub Pages workflow runs tests and builds before deployment; production asset URLs are relative to the repository path.

### Minimal UI and direct manipulation

- Checked desktop at 1440 × 900 and phone layout at 390 × 844. Life appears first in All; phone layout places the palette below the proportioned canvas. No horizontal page overflow.
- Dragged Water and Salt into Combine: the second drop immediately produced Salty water. Dragged that result into the canvas and inspected salinity 35.
- Selected Water and painted a continuous stroke. Undo removed that stroke. Dragged Human from the same palette and confirmed it spawned.
- Used C on focused palette items to combine them, selected the result, painted it, and confirmed salinity 35.
- At phone width, dragged a Sand blob into the world and inspected it; dropped Water and Oil into Combine to produce Polluted water automatically.
- Browser console reported no application errors. Narrow-screen input checks used mouse automation, not physical touch hardware.

### Existing ecology pass

- The Living lab contains two freshwater fish, two saltwater fish, and two humans. The population view reported healthy creatures in their appropriate pools.
- Seeds rooted, grew into plants, and at least one reached the mature/reseeding stage during the playtest.
- The salinity overlay visibly distinguishes freshwater from saline water.
- Salt + Water in the lab prepares a salty-water brush with salinity 35.
- Painted modified water, saved, cleared, and loaded the world. The inspector reported salinity 35 afterward, and the living entities returned.
- Inspected desktop layout at 1440 × 1000 and a narrow browser layout; life controls, overlays, and the population dialog remained accessible.
- No application errors appeared in the browser console during these checks.

## Scope

This is a local, single-player sandbox with simplified chemistry and survival. Humans have basic individual movement and needs; this pass does not implement civilization building, detailed pathfinding, or fish reproduction. Real touch hardware and broad cross-browser performance have not been benchmarked.
