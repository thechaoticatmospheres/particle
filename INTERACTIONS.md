# Implemented interactions — ecology refinement

Materials retain their identity while properties change. “Salty water,” “wet wood,” “rusted metal,” and “charged water” are modified materials, not extra element IDs. Multiple properties coexist and move with their particle. Rates and thresholds are tuned for play rather than scientific accuracy.

## Shared properties

| Property    | Effects                                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Temperature | Conducts between neighbors; controls freezing, melting, boiling, mineral transformations, ignition, and habitat safety               |
| Salinity    | Dissolves, diffuses, moves into wet soil, affects density and freezing, increases conduction/rust, and controls organism suitability |
| Moisture    | Finite absorption into porous materials, soil hydration, slower wet powders, growth support, ignition resistance, and drying         |
| Fertility   | Nutrient storage and transport, plant growth rate, aquatic food, and acid buffering                                                  |
| Pollution   | Moves through water/wet porous material and harms plants, fish, and humans                                                           |
| Acidity     | Dilutes, infiltrates, corrodes susceptible solids, consumes soil nutrients through buffering, and damages habitats                   |
| Charge      | Decaying electrical pulses through conductive materials; can ignite dry fuels and harm creatures                                     |
| Corrosion   | Accumulates from acid or wet metal exposure; advanced rust changes metal into a falling powder                                       |
| Burning     | Fuel burns in place for a finite duration, emits fire/smoke, and leaves residue                                                      |
| Vitality    | Visible plant stress and damage                                                                                                      |
| Age         | Internal plant state; organism and colony ages are separately serialized                                                             |

Heat and aqueous solute diffusion use equal-and-opposite transfers. All fields swap with moving particles. New paint initializes defaults, and erasing clears the underlying fields.

## Water, salt, and soil

- Salt dissolves into water or other aqueous materials, up to salinity 100. Excess salt stays solid.
- Salt diffuses between touching aqueous particles, so fresh water dilutes brine. Salt mass is conserved during dissolution, diffusion, absorption, and distillation.
- Brine is slightly denser than otherwise identical fresh water.
- Absorbent materials take up a finite amount of water, including its dissolved salt, pollution, acidity, and nutrients.
- Moisture spreads between porous materials; salt, acidity, and pollution can spread through sufficiently wet porous material.
- Wet sand, ash, seeds, and gunpowder fall more slowly.
- Soil at 92% moisture becomes Mud. Mud below 45% moisture becomes Soil while retaining its properties.
- Exposed absorbent materials dry slowly. Heat accelerates drying.
- Ash dissolves into water as nutrients and a small amount of contamination.
- Ash touching soil or mud enriches it and is consumed.
- Oil gradually pollutes adjacent water. Smoke touching water is absorbed as pollution.

## Heat and phase changes

- Heat conducts through touching particles according to material conductivity. Metal conducts strongly; glass conducts weakly.
- Exposed material temperatures drift toward the ambient 20°C baseline.
- Water boils at 100°C, with a small salinity-dependent increase in the threshold.
- Boiling brine leaves Salt and produces fresh Steam in a neighboring empty cell. If no space is available for steam, the transformation waits.
- Boiling polluted water leaves contaminated residue; steam carries neither salt nor pollution.
- Cooling Steam condenses into fresh Water. Steam contacting cold Ice or Snow deposits Snow.
- Fresh Water freezes below zero. Salt lowers its freezing point.
- Ice and Snow melt when warm enough, retaining any dissolved salt.
- Salt contacting moderately cold Ice or Snow lowers its melting threshold, producing cold brine.
- Water extinguishes Fire and produces Steam. Water also extinguishes burning fuel and cools it.
- Water quenches Lava into Obsidian and heats the water.
- Lava cools into Stone below 650°C.
- Stone above 1,000°C becomes Lava.
- Sand above 600°C becomes Glass.
- Salt above 700°C becomes Crystal.
- Very hot Metal can emit Sparks from exposed surfaces.

## Fire, electricity, and destruction

- Wood, Plant, Seed, and Oil have ignition temperatures and finite fuel supplies.
- Fire, Lava, Spark, and burning particles heat nearby fuels.
- Fuels above their ignition point can burn if sufficiently dry and exposed to air/gas.
- Wet fuels resist ignition. They must dry before burning normally.
- Burning material stays in place while emitting Fire or Smoke.
- Burned organic material becomes nutrient-rich Ash; burned Oil becomes Smoke.
- Dry Gunpowder explodes from ignition by heat or a strong electrical pulse.
- Damp Gunpowder is inert; drying restores its ability to explode.
- Explosions replace nearby cells with Fire or empty space and damage nearby creatures.
- Metal and Obsidian survive blasts. They do not shield other cells from the radial effect.
- Sparks energize contacting conductive materials.
- Electrical pulses propagate through Metal, water, and sufficiently wet materials. Salinity strengthens water conduction.
- Pulses decay without a source. They can ignite dry fuels and shock humans or fish.
- Smoke, Fire, and Spark expire; rising gas/energy particles exit through the top boundary.

## Corrosion and buffering

- Acid mixes into water as an acidity modifier.
- Acid gradually corrodes susceptible solid and powder materials, spending strength as it reacts. It does not erase gases or fire.
- Sufficient corrosion dissolves the target and adds contamination to the attacking liquid.
- Glass, Crystal, and Obsidian resist acid.
- Water rusts Metal. Salty wet exposure accelerates rusting.
- Metal at 85% corrosion crumbles and falls while retaining its rust modifier.
- Ash neutralizes acidity and supplies nutrients.
- Fertile soil buffers acidity by consuming fertility, both on contact and after infiltration.
- Sufficiently diluted/neutralized Acid becomes Water while retaining its other properties.

## Plants

- Seed on soil or mud germinates when root moisture is at least 28%, root salinity at most 10, acidity at most 12, pollution at most 35, and the seed is between 4°C and 45°C.
- Painting Plant onto suitable soil can establish a rooted colony too.
- Colonies grow upward, add foliage, form wood, and consume moisture/nutrients from the root cell.
- Fertile soil accelerates growth. Growth stops when root conditions become unsuitable or the growing tip is obstructed.
- Healthy mature plants periodically release new falling Seeds.
- Drought, root removal, salinity, acidity, pollution, severe heat, and burning reduce plant health.
- Dead foliage becomes nutrient-rich Ash, which falls and can fertilize soil or dissolve into water.
- Humans can forage safe Plant and Seed particles, affecting the landscape.

## Humans and fish

| Species              | Salinity | Temperature | Maximum pollution | Maximum acidity |
| -------------------- | -------: | ----------: | ----------------: | --------------: |
| Human drinking water |      0–7 |      0–45°C |                18 |               8 |
| Freshwater fish      |      0–9 |      4–35°C |                25 |              10 |
| Saltwater fish       |    12–70 |      6–38°C |                25 |              10 |

Water with charge 40 or above fails the shared habitat-safety check. These are game-scale tolerance values.

- Humans fall onto terrain, walk, climb small obstacles, and turn away from nearby dangerous material.
- Hungry humans seek nearby edible plants/seeds. Thirsty humans seek safe freshwater and refuse salty or polluted drinking water.
- Human hunger and thirst decline over time. Well-fed, hydrated humans slowly recover health.
- Humans in water swim upward for air. Submersion and smoke reduce oxygen; suffocation harms them.
- Heat, severe cold, corrosive liquids, shocks, polluted water, starvation, and dehydration affect human survival.
- Fish move through connected water and prefer neighboring cells closer to their habitat requirements.
- Wrong salinity, unsafe temperature, pollution, acidity, shocks, and being out of water harm fish.
- Fish consume dissolved nutrients as food and occasionally add waste to water.
- Dead creatures are removed. Underwater deaths add pollution and nutrients; deaths in open air leave Ash.
- The inspector shows creature health, behavior, hunger, hydration/oxygen for humans, and fish salinity tolerance.

## Lab versus live world

The combiner provides **13 physical material previews**, **13 additional discovery recipes**, and **20 modifier previews**. A modifier preview prepares a brush with the resulting properties. For example, Salt + Water prepares Water with salinity 35; it does not invent a Saltwater material ID.

Only Sand, Water, Stone, and Fire start unlocked. Every other material and all three life forms require a combiner recipe. The additional abstract recipes in `src/crafting.ts` include Steam + Smoke → Acid and Ash + Salt → Gunpowder. These do not change live contact rules: physical reactions run through the environmental systems and require appropriate conditions, and never unlock the palette automatically. See the in-game Discoveries journal for every unlock recipe.
