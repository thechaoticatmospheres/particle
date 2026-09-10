import "./style.css";
import { ui } from "./ui";
import { combine, worldPoint, type PaletteItem } from "./combiner";
import {
  allItems,
  itemKey,
  itemFromKey,
  keyLabel,
  recipeForUnlock,
  restoreProgress,
  PROGRESS_KEY,
  PROGRESS_VERSION,
  type ItemKey,
} from "./crafting";
import { generateStartingWorld } from "./starting-world";
import { enablePaletteDrag } from "./palette-drag";
import { elements, byId, starters, E } from "./elements";
import { Simulation, type WorldSave } from "./simulation";
import { bootWorld, type Controls, type Overlay } from "./scene";
import { icon, elementIcon, refreshIcons } from "./icons";
import { habitats, material, type Species } from "./materials";
import { modifierExperiments, milestoneLabels } from "./experiments";

function $(s: "#modal"): HTMLDialogElement;
function $<T extends HTMLElement = HTMLElement>(s: string): T;
function $(s: string) {
  return document.querySelector(s)!;
}
const sim = new Simulation();
generateStartingWorld(sim);
let unlocked = restoreProgress(null);
try {
  unlocked = restoreProgress(
    JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "null"),
  );
} catch {
  /* Invalid or legacy progress starts with exactly four elements. */
}
function persistProgress() {
  try {
    localStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify({ version: PROGRESS_VERSION, unlocked: [...unlocked] }),
    );
  } catch {
    /* Session progression still works without browser storage. */
  }
}
let category = "All",
  query = "",
  lab: PaletteItem[] = [],
  results: PaletteItem[] = [],
  muted = true,
  undo: WorldSave | null = null,
  toastTimer = 0;
const controls: Controls = {
  dragging: false,
  selected: E.Sand,
  brush: 5,
  tool: "paint",
  overlay: "natural",
  variant: {},
  shape: "circle",
  paused: false,
  speed: 1,
  grid: false,
  pointer: { x: 0, y: 0, active: false },
  onPaint: () => {
    undo = sim.serialize();
  },
  onInspect: inspect,
  onSpawn: (species, success) =>
    toast(
      success
        ? `${habitats[species].label} added. Inspect it to follow its needs.`
        : species === "human"
          ? "Place a human in open space above the ground. Maximum population: 120."
          : "Place fish inside water. Maximum population: 120.",
    ),
  onStats: (count, fps) => {
    $("#particle-count").textContent = count.toLocaleString();
    $("#fps").textContent = String(fps);
    if (document.querySelector("#population"))
      $("#population").textContent =
        `${sim.creatures.filter((c) => c.species === "human").length} humans · ${sim.creatures.filter((c) => c.species !== "human").length} fish · ${sim.plants.length} growing plants`;
  },
};

$("#app").innerHTML = ui;
$("#world-name").textContent = "First world";
$("#lab-message").textContent = "Start with four. Try Water + Fire.";
$("#journal-tab").setAttribute("aria-label", "Discoveries");

$("#overlay").addEventListener("change", (e) => {
  controls.overlay = (e.target as HTMLSelectElement).value as Overlay;
  const legends: Record<Overlay, string> = {
    natural: "",
    temperature: "Blue: frozen · Red: hot (200°C+)",
    salinity: "Dark: fresh · Purple: salty (70+)",
    moisture: "Dark: dry · Blue: saturated",
    pollution: "Dark: clean · Orange: polluted",
    fertility: "Dark: depleted · Green: nutrient-rich",
    charge: "Dark: no charge · Yellow: energized",
  };
  $("#overlay-legend").hidden = controls.overlay === "natural";
  $("#overlay-legend").textContent = legends[controls.overlay];
});
$("#field-guide").onclick = showFieldGuide;
$("#ecology-lab").onclick = () => {
  if (unlocked.size < allItems.length) {
    toast("Unlock all 27 items to open the Living lab preset.");
    return;
  }

  undo = sim.serialize();
  sim.ecologyLab();
  $("#world-name").textContent = "The living laboratory";
  pause(false);
  toast(
    "Left pool: fresh water. Right pool: salt water. Seeds and humans live between them.",
  );
};
$("#population").onclick = showPopulation;
sim.onModifier = (key) => {
  $("#environment-event").textContent = milestoneLabels[key] ?? key;
};

function inspect(x: number, y: number) {
  const panel = $("#inspection-panel");
  panel.hidden = false;
  const creature = sim.creatures.find(
    (c) =>
      Math.abs(c.x - x) < 5 &&
      Math.abs(c.y - y) < (c.species === "human" ? 9 : 4),
  );
  if (creature) {
    const c = creature;
    panel.innerHTML = `<strong>${habitats[c.species].label} #${c.id}</strong><span>${c.status}</span><span>Health <b>${Math.round(c.health)}%</b></span><span>Food <b>${Math.round(c.hunger)}%</b></span>${c.species === "human" ? `<span>Hydration <b>${Math.round(c.thirst)}%</b></span><span>Air <b>${Math.round(c.oxygen)}%</b></span>` : `<span>Salinity tolerance <b>${habitats[c.species].minSalt}–${habitats[c.species].maxSalt}</b></span>`}`;
    return;
  }
  const id = sim.get(x, y);
  if (id <= 0) {
    panel.innerHTML =
      "<strong>Open air</strong><span>Point at a material, root, human, or fish to inspect its conditions.</span>";
    return;
  }
  const i = y * sim.width + x,
    f = sim.fields;
  const tags = [
    f.salinity[i] > 9 ? "Salty" : material[id].aqueous ? "Fresh" : "",
    f.pollution[i] > 18 ? "Polluted" : "",
    f.acidity[i] > 8 ? "Acidic" : "",
    f.moisture[i] > 25 ? "Wet" : "",
    f.burning[i] ? "Burning" : "",
    f.corrosion[i] > 10 ? "Corroding" : "",
  ].filter(Boolean);
  panel.innerHTML = `<strong>${byId.get(id)!.name}${tags.length ? " · " + tags.join(", ") : ""}</strong><span>Temperature <b>${f.temperature[i]}°C</b></span><span>Salt <b>${f.salinity[i]}</b></span><span>Moisture <b>${f.moisture[i]}%</b></span><span>Nutrients <b>${f.fertility[i]}%</b></span><span>Pollution <b>${f.pollution[i]}%</b></span><span>Acidity <b>${f.acidity[i]}%</b></span><span>Charge <b>${f.charge[i]}</b></span>${f.corrosion[i] ? `<span>Corrosion <b>${f.corrosion[i]}%</b></span>` : ""}`;
}
function showPopulation() {
  dialog(
    `<span class="eyebrow">YOUR LIVING WORLD</span><h2>Life follows the conditions.</h2><p class="modal-intro">${sim.creatures.length} creatures · ${sim.plants.length} rooted plants · ${sim.deaths} deaths. Humans need food, clean fresh water, and air. Fish need water within their species’ salinity and temperature range.</p><div class="population-list">${sim.creatures.length ? sim.creatures.map((c) => `<div><strong>${habitats[c.species].label} #${c.id}</strong><span>${c.status}</span><span>${Math.round(c.health)}% health</span></div>`).join("") : "<p>No creatures yet. Choose humans or fish from the palette to add life.</p>"}</div><p class="modal-footnote">${sim.plants.filter((p) => p.height >= p.maxHeight).length} mature plants are able to reseed. Inspect individual creatures and roots to see what they need.</p>`,
  );
}
function showFieldGuide() {
  dialog(
    `<span class="eyebrow">THE ECOLOGY PASS</span><h2>Same material. New conditions.</h2><p class="modal-intro">Water can be salty, hot, polluted, acidic, or charged at the same time. These properties move with particles and affect the whole ecosystem. Use the overlay menu and Inspect (I) to see them.</p><div class="help-steps"><p><b>Water & salt</b>Salt dissolves and diffuses. Freshwater fish tolerate salinity 0–9; saltwater fish need 12–70. Humans drink clean water at 0–7. Boiling leaves salt and pollutants behind.</p><p><b>Living plants</b>Place seeds on damp soil (moisture 28%+). Nutrients accelerate growth. Roots draw water from the ground, mature plants reseed, and salt, acid, pollution, or drought can kill them.</p><p><b>Heat & fire</b>Heat conducts through neighboring particles. Water boils, freezes, and quenches lava. Wet wood and gunpowder must dry before burning. Fire needs exposed fuel; burned material returns nutrients as ash.</p><p><b>Electricity & corrosion</b>Sparks send short pulses through metal and water. Salt improves conduction and accelerates metal rust. Acid gradually corrodes susceptible materials; ash and fertile soil neutralize it.</p><p><b>People & habitats</b>Humans walk, climb small steps, forage, seek safe drinking water, and swim for air. Fish seek suitable water. Heat, cold, toxins, shocks, starvation, and suffocation affect survival.</p></div><h3>Experiment with modifiers</h3><div class="modifier-recipes">${modifierExperiments.map((r) => `<div><strong>${byId.get(r.a)!.name} + ${byId.get(r.b)!.name}</strong><span>${r.label}</span></div>`).join("")}</div><p class="modal-footnote">The lab previews an interaction and prepares a brush with the resulting properties. Real-world reactions take time and depend on concentration, temperature, and contact. Salinity is a game-scale concentration, not a scientific unit.</p>`,
  );
}
function itemLabel(item: PaletteItem) {
  return item.kind === "life"
    ? habitats[item.species].label
    : (item.label ?? byId.get(item.id)!.name);
}
function itemIcon(item: PaletteItem, size = 25) {
  if (item.kind === "life")
    return elementIcon(
      item.species === "human" ? "human" : "fish",
      habitats[item.species].color,
      size,
    );
  const e = byId.get(item.id)!;
  return elementIcon(e.icon, e.color, size);
}
function renderLibrary() {
  const focused = (document.activeElement as HTMLElement | null)?.dataset
    .palette;
  const items = [...allItems].sort(
    (a, b) =>
      Number(unlocked.has(itemKey(b))) - Number(unlocked.has(itemKey(a))),
  );
  const visible = items.filter((item) => {
    const matches =
      category === "All" ||
      (item.kind === "life"
        ? category === "Life"
        : category === "Life"
          ? item.id === E.Seed || item.id === E.Plant
          : byId.get(item.id)!.category === category);
    return matches && itemLabel(item).toLowerCase().includes(query);
  });
  $("#element-grid").innerHTML = visible
    .map((item) => {
      const locked = !unlocked.has(itemKey(item));
      const selected =
        item.kind === "life"
          ? controls.tool === item.species
          : controls.tool === "paint" &&
            controls.selected === item.id &&
            !Object.keys(controls.variant).length;
      const key = item.kind === "life" ? item.species : String(item.id);
      const label = itemLabel(item);
      return `<button class="element-card ${locked ? "locked" : ""} ${selected ? "selected" : ""}" data-palette="${key}" aria-label="${label}${locked ? ", undiscovered" : ""}" aria-pressed="${selected}" title="${locked ? "Combine elements to discover " + label : label + " — click to select, drag to place or combine. Keyboard: C to combine."}">${locked ? icon("lock-keyhole") : itemIcon(item)}<span>${label}</span></button>`;
    })
    .join("");
  $("#empty-search").hidden = visible.length > 0;
  $("#unlocked-count").textContent = `${unlocked.size} / ${allItems.length}`;
  $(".nav-count").textContent = String(unlocked.size);
  refreshIcons();
  if (focused)
    document
      .querySelector<HTMLElement>(
        `#element-grid [data-palette="${CSS.escape(focused)}"]`,
      )
      ?.focus({ preventScroll: true });
}
function selectItem(item: PaletteItem) {
  if (!unlocked.has(itemKey(item))) return;
  if (item.kind === "life") {
    controls.variant = {};
    setTool(item.species);
  } else {
    controls.selected = item.id;
    controls.variant = { ...item.properties };
    setTool("paint");
  }
  const description =
    item.kind === "material"
      ? (item.description ?? byId.get(item.id)!.description)
      : item.species === "human"
        ? "Place on land near food and clean water."
        : `Place in water. Salinity ${habitats[item.species].minSalt}–${habitats[item.species].maxSalt}.`;
  $("#selected-detail").innerHTML =
    `<div class="selected-title">${itemIcon(item, 22)}<strong>${itemLabel(item)}</strong></div><p>${description}</p>`;
  $("#interaction-hint").textContent =
    item.kind === "life"
      ? "Click the world to add life, or drag it from the palette."
      : "Click and drag to paint. Right-click to erase.";
  renderLibrary();
}
function selectElement(id: number) {
  selectItem({ kind: "material", id });
}
function addToLab(item: PaletteItem) {
  if (!unlocked.has(itemKey(item))) return;
  if (lab.length === 2) lab = [];
  lab.push(item);
  results = [];
  if (lab.length === 2) {
    const reaction = combine(lab[0], lab[1]);
    results = reaction.results;
    results.forEach((result) => {
      discover(itemKey(result));
    });
    $("#lab-message").textContent = reaction.message;
  } else $("#lab-message").textContent = "One more element to combine.";
  renderLab();
}
function palettePayload(node: HTMLElement): PaletteItem | null {
  const key = node.dataset.palette!;
  if (key.startsWith("result-")) return results[Number(key.slice(7))] ?? null;
  if (Object.hasOwn(habitats, key))
    return unlocked.has(key as Species)
      ? { kind: "life", species: key as Species }
      : null;
  const id = Number(key);
  return unlocked.has(id) ? { kind: "material", id } : null;
}
enablePaletteDrag({
  payload: palettePayload,
  select: selectItem,
  combine: addToLab,
  dragging: (value) => {
    controls.dragging = value;
    controls.pointer.active = false;
  },
  drop: (item, x, y) => {
    const r = $("#lab-drop").getBoundingClientRect();
    if (x >= r.left && x < r.right && y >= r.top && y < r.bottom) {
      addToLab(item);
      return;
    }
    const canvas = document.querySelector("#world canvas")!;
    const point = worldPoint(
      x,
      y,
      canvas.getBoundingClientRect(),
      sim.width,
      sim.height,
    );
    if (!point) return;
    undo = sim.serialize();
    if (item.kind === "life")
      controls.onSpawn(
        item.species,
        !!sim.spawn(item.species, point.x, point.y),
      );
    else
      sim.paint(
        point.x,
        point.y,
        item.id,
        Math.max(5, controls.brush),
        false,
        item.properties,
      );
  },
});
$("#element-grid").addEventListener("click", (e) => {
  const node = (e.target as HTMLElement).closest<HTMLElement>("[data-palette]");
  if (!node || !node.classList.contains("locked")) return;
  const raw = node.dataset.palette!;
  const key: ItemKey = Object.hasOwn(habitats, raw)
    ? (raw as Species)
    : Number(raw);
  const r = recipeForUnlock(key);
  toast(
    `${keyLabel(key)} is locked.${r ? " Combine " + keyLabel(r.a) + " + " + keyLabel(r.b) + "." : ""}`,
  );
});
$("#clear-lab").onclick = () => {
  lab = [];
  results = [];
  renderLab();
  $("#lab-message").textContent = "Drop two elements. See what happens.";
};

function setTool(tool: Controls["tool"]) {
  controls.tool = tool;
  $("#inspection-panel").hidden = tool !== "inspect";
  if (tool === "inspect")
    $("#inspection-panel").textContent =
      "Point at a particle or creature to inspect its conditions.";
  document.querySelectorAll<HTMLElement>("[data-tool]").forEach((b) => {
    b.classList.toggle("active", b.dataset.tool === tool);
    b.setAttribute("aria-pressed", String(b.dataset.tool === tool));
  });
  document
    .querySelectorAll<HTMLElement>("#element-grid [data-palette]")
    .forEach((b) => {
      const key = b.dataset.palette!;
      const selected = Object.hasOwn(habitats, key)
        ? key === tool
        : tool === "paint" &&
          Number(key) === controls.selected &&
          !Object.keys(controls.variant).length;
      b.classList.toggle("selected", selected);
      b.setAttribute("aria-pressed", String(selected));
    });
}
function renderLab() {
  document.querySelectorAll<HTMLElement>("[data-slot]").forEach((slot, i) => {
    slot.innerHTML = lab[i]
      ? `${itemIcon(lab[i], 22)}<span>${itemLabel(lab[i])}</span>`
      : "<span>Drop element</span>";
    slot.classList.toggle("filled", !!lab[i]);
  });
  $("#lab-result").innerHTML = results
    .map(
      (item, i) =>
        `<button class="result-chip" data-palette="result-${i}" aria-label="${itemLabel(item)} result" title="Click to paint. Drag to place or combine. C to combine.">${itemIcon(item, 22)}<span>${itemLabel(item)}</span>${icon("arrow-right")}</button>`,
    )
    .join("");
  refreshIcons();
}
function toast(message: string) {
  clearTimeout(toastTimer);
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  toastTimer = window.setTimeout(
    () => $("#toast").classList.remove("show"),
    4200,
  );
}
function discover(key: ItemKey) {
  if (unlocked.has(key)) return;
  unlocked.add(key);
  persistProgress();
  renderLibrary();
  toast(`Discovered ${keyLabel(key)}. Added to the palette.`);
  chime();
}
// Physical reactions can create particles; only the combiner unlocks the palette.
function chime() {
  if (muted) return;
  try {
    const ctx = new AudioContext();
    [523, 659, 784].forEach((frequency, i) => {
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = frequency;
      g.gain.setValueAtTime(0.04, ctx.currentTime + i * 0.09);
      g.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + i * 0.09 + 0.5,
      );
      o.start(ctx.currentTime + i * 0.09);
      o.stop(ctx.currentTime + i * 0.09 + 0.5);
    });
    setTimeout(() => void ctx.close(), 1000);
  } catch {
    /* Audio is optional. */
  }
}
function pause(value = !controls.paused) {
  controls.paused = value;
  $("#pause").innerHTML = icon(value ? "play" : "pause");
  $("#pause").setAttribute(
    "aria-label",
    value ? "Resume simulation" : "Pause simulation",
  );
  $("#paused-overlay").hidden = !value;
  $("#live-label").textContent = value ? "Paused" : "Running";
  refreshIcons();
}
function dialog(html: string) {
  $("#modal-content").innerHTML = html;
  $("#modal").querySelector("button")!.focus();
  $("#modal").setAttribute("data-was-paused", String(controls.paused));
  pause(true);
  $("#modal").showModal();
  refreshIcons();
}
function showJournal() {
  const entries = allItems.filter(
    (item) => item.kind === "life" || !starters.includes(item.id),
  );
  dialog(
    `<span class="eyebrow">DISCOVERIES</span><h2>${unlocked.size} / ${allItems.length} unlocked</h2><p class="modal-intro">Start with Sand, Water, Stone, and Fire. Combine two unlocked items to discover every other material and life form. Recipes below are game rules; physical reactions still depend on conditions.</p><div class="journal-progress"><span style="width:${(unlocked.size / allItems.length) * 100}%"></span></div><div class="journal-list">${entries
      .map((item) => {
        const key = itemKey(item),
          found = unlocked.has(key),
          r = recipeForUnlock(key)!;
        const ready = unlocked.has(r.a) && unlocked.has(r.b);
        return `<div class="journal-entry ${found ? "" : "undiscovered"}">${found ? itemIcon(item, 25) : icon("lock-keyhole")}<div><strong>${itemLabel(item)}</strong><span>${keyLabel(r.a)} + ${keyLabel(r.b)}${!found && ready ? " � Ready to combine" : ""}</span></div>${found ? icon("check") : ""}</div>`;
      })
      .join(
        "",
      )}</div><p class="modal-footnote">Life is unlocked just like materials. New worlds keep discoveries; older saves do not grant the previous starter palette.</p>`,
  );
}
function worldPicker() {
  dialog(
    `<span class="eyebrow">A FRESH BEGINNING</span><h2>Make room for possibility.</h2><p class="modal-intro">Choose your starting point. Your discoveries stay with you. Save your current world first if you want to return.</p><div class="world-options"><button data-preset="garden">${icon("globe-2")}<strong>Starting terrain</strong><span>Stone, sand, and water. Add life as you discover it.</span></button><button data-preset="empty">${icon("square")}<strong>A blank universe</strong><span>Nothing here. Everything possible.</span></button></div>`,
  );
  document.querySelectorAll<HTMLButtonElement>("[data-preset]").forEach(
    (b) =>
      (b.onclick = () => {
        undo = sim.serialize();
        if (b.dataset.preset === "empty") {
          sim.clear();
          $("#world-name").textContent = "A blank universe";
        } else {
          generateStartingWorld(sim, Date.now() | 0);
          $("#world-name").textContent = "New world";
        }
        $("#modal").close();
        toast("Your next world starts here.");
      }),
  );
}
document.querySelectorAll<HTMLButtonElement>(".category").forEach(
  (b) =>
    (b.onclick = () => {
      category = b.dataset.category!;
      $(".elements-scroll").scrollTop = 0;
      document
        .querySelectorAll(".category")
        .forEach((c) => c.classList.toggle("active", c === b));
      b.setAttribute("aria-pressed", "true");
      document
        .querySelectorAll<HTMLElement>(".category")
        .forEach((c) => c.setAttribute("aria-pressed", String(c === b)));
      renderLibrary();
    }),
);
$("#element-search").addEventListener("input", (e) => {
  query = (e.target as HTMLInputElement).value.toLowerCase();
  renderLibrary();
});
document
  .querySelectorAll<HTMLButtonElement>("[data-tool]")
  .forEach(
    (b) => (b.onclick = () => setTool(b.dataset.tool as Controls["tool"])),
  );
$("#brush-size").addEventListener("input", (e) => {
  controls.brush = Number((e.target as HTMLInputElement).value);
  $("#brush-value").textContent = String(controls.brush);
});
window.addEventListener("brushchange", () => {
  $<HTMLInputElement>("#brush-size").value = String(controls.brush);
  $("#brush-value").textContent = String(controls.brush);
});
$("#brush-shape").onclick = () => {
  controls.shape = controls.shape === "circle" ? "square" : "circle";
  $("#brush-shape").innerHTML = icon(controls.shape);
  refreshIcons();
};
$("#pause").onclick = () => pause();
$("#step").onclick = () => {
  pause(true);
  sim.step();
};
$("#speed").onclick = () => {
  controls.speed = controls.speed === 4 ? 1 : controls.speed * 2;
  $("#speed").textContent = `${controls.speed}×`;
};
$("#undo").onclick = () => {
  if (undo) {
    sim.restore(undo);
    undo = null;
    toast("Last edit undone.");
  } else toast("Make a mark in your world first.");
};
$("#reset").onclick = () => {
  undo = sim.serialize();
  generateStartingWorld(sim);
  $("#world-name").textContent = "First world";
  toast("Starting terrain restored. Discoveries kept.");
};
$("#clear").onclick = () => {
  undo = sim.serialize();
  sim.clear();
  $("#world-name").textContent = "A blank universe";
  toast("A clean canvas. Undo to bring your world back.");
};
$("#save").onclick = () => {
  try {
    localStorage.setItem(
      "particle-world",
      JSON.stringify({
        world: sim.serialize(),
        name: $("#world-name").textContent,
        progress: { version: PROGRESS_VERSION, unlocked: [...unlocked] },
      }),
    );
    toast("World saved on this device. Come back anytime.");
  } catch {
    toast("Could not save: your browser storage is full or unavailable.");
  }
};
$("#load").onclick = () => {
  try {
    const raw = localStorage.getItem("particle-world");
    if (!raw) {
      toast("No saved world yet. Create one, then choose Save world.");
      return;
    }
    const data = JSON.parse(raw);
    undo = sim.serialize();
    sim.restore(data.world);
    $("#world-name").textContent =
      typeof data.name === "string" ? data.name : "Your saved world";
    restoreProgress(data.progress).forEach((key) => unlocked.add(key));
    persistProgress();
    renderLibrary();
    toast("Welcome back to your world.");
  } catch {
    toast("That saved world could not be loaded. Your current world is safe.");
  }
};
$("#fullscreen").onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await $(".world-shell").requestFullscreen();
  } catch {
    toast("Fullscreen isn’t available in this browser.");
  }
};
$("#grid-toggle").onclick = () => {
  controls.grid = !controls.grid;
  $("#grid-toggle").setAttribute("aria-pressed", String(controls.grid));
};
$("#new-world").onclick = worldPicker;
$("#journal-tab").onclick = showJournal;
$("#help").onclick = () =>
  dialog(
    `<span class="eyebrow">WELCOME, WORLD MAKER</span><h2>A sandbox for your curiosity.</h2><p class="modal-intro">Click a palette item to select it and draw in the world. Drag an item onto the canvas to place a blob, or drop two items into Combine for an immediate result. Click a result to paint it or drag it into the world. Keyboard: focus a palette item and press C to add it to Combine. Every colored pixel is a particle you can change. There is no score, no wrong answer, and no rush.</p><div class="help-steps"><p><b>01 &nbsp; Make your mark.</b> Paint sand, water, stone, fire, and more. Right-click to erase. Scroll to change the brush size.</p><p><b>02 &nbsp; Let things meet.</b> Water and fire become steam. Seeds grow into plants when rooted in damp, healthy soil. Try dropping lava into the lake.</p><p><b>03 &nbsp; Follow the discoveries.</b> Start with four elements. Drop two unlocked items into Combine to unlock another material or life form. Discoveries are saved in this browser.</p></div><div class="shortcuts"><span><kbd>B</kbd> Brush</span><span><kbd>E</kbd> Erase</span><span><kbd>I</kbd> Inspect</span><span><kbd>Space</kbd> Pause</span><span><kbd>[ ]</kbd> Brush size</span><span><kbd>Ctrl Z</kbd> Undo</span></div><p class="modal-footnote">Save world stores one world locally. Element recipes are creative game rules, not real chemistry.</p>`,
  );
$("#sound").onclick = () => {
  muted = !muted;
  $("#sound").innerHTML =
    icon(muted ? "volume-x" : "volume-2") + " Discovery sound";
  $("#sound").setAttribute(
    "aria-label",
    muted ? "Enable discovery sounds" : "Mute discovery sounds",
  );
  refreshIcons();
  if (!muted) chime();
};
$(".modal-close").onclick = () => $("#modal").close();
$<HTMLDialogElement>("#modal").addEventListener("click", (e) => {
  if (e.target === $("#modal")) {
    const r = $("#modal").getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      $("#modal").close();
  }
});
$<HTMLDialogElement>("#modal").addEventListener("close", () =>
  pause($("#modal").getAttribute("data-was-paused") === "true"),
);
document.addEventListener("keydown", (e) => {
  if (
    (e.target as HTMLElement).matches("input,textarea,select") ||
    $<HTMLDialogElement>("#modal").open
  )
    return;
  if (
    (e.target as HTMLElement).closest("button,summary") &&
    (e.code === "Space" || e.key === "Enter")
  )
    return;
  if (e.code === "Space") {
    e.preventDefault();
    pause();
  }
  if (e.key.toLowerCase() === "b") setTool("paint");
  if (e.key.toLowerCase() === "e") setTool("erase");
  if (e.key.toLowerCase() === "i") setTool("inspect");
  if (e.key === "/") {
    e.preventDefault();
    $("#element-search").focus();
  }
  if (e.key === "[" || e.key === "]") {
    controls.brush = Math.max(
      1,
      Math.min(20, controls.brush + (e.key === "[" ? -1 : 1)),
    );
    window.dispatchEvent(new Event("brushchange"));
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "z") {
    e.preventDefault();
    $("#undo").click();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause(true);
});
$("#world-menu").addEventListener("click", (e) => {
  if ((e.target as HTMLElement).closest("button"))
    $<HTMLDetailsElement>("#world-menu").open = false;
});
document.addEventListener("pointerdown", (e) => {
  if (!(e.target as HTMLElement).closest("#world-menu"))
    $<HTMLDetailsElement>("#world-menu").open = false;
});
selectElement(E.Sand);
renderLab();
refreshIcons();
bootWorld(sim, controls);
