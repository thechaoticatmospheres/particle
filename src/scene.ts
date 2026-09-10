import Phaser from "phaser";
import { Simulation } from "./simulation";
import { byId, E } from "./elements";
import { habitats, type Species } from "./materials";
import type { ModifierValues } from "./modifiers";
export type Overlay =
  | "natural"
  | "temperature"
  | "salinity"
  | "moisture"
  | "pollution"
  | "fertility"
  | "charge";
export interface Controls {
  dragging: boolean;
  selected: number;
  brush: number;
  tool: "paint" | "erase" | "inspect" | Species;
  overlay: Overlay;
  variant: ModifierValues;
  shape: "circle" | "square";
  paused: boolean;
  speed: number;
  grid: boolean;
  pointer: { x: number; y: number; active: boolean };
  onPaint: () => void;
  onInspect: (x: number, y: number) => void;
  onSpawn: (species: Species, success: boolean) => void;
  onStats: (count: number, fps: number) => void;
}
export class WorldScene extends Phaser.Scene {
  private texture!: Phaser.Textures.CanvasTexture;
  private pixels!: ImageData;
  private bg!: Uint8ClampedArray;
  private cursor!: Phaser.GameObjects.Graphics;
  private accumulator = 0;
  private statsTime = 0;
  private last: { x: number; y: number } | null = null;
  constructor(
    public sim: Simulation,
    public controls: Controls,
  ) {
    super("world");
  }
  create() {
    const { width: w, height: h } = this.sim;
    this.texture = this.textures.createCanvas("world", w, h)!;
    this.pixels = this.texture.context.createImageData(w, h);
    this.bg = this.background(w, h);
    const picture = this.add.image(0, 0, "world").setOrigin(0);
    this.cursor = this.add.graphics();
    const resize = () => {
      picture.setDisplaySize(this.scale.width, this.scale.height);
      this.cursor.setScale(this.scale.width / w, this.scale.height / h);
    };
    resize();
    this.scale.on("resize", resize);
    this.events.once("shutdown", () => this.scale.off("resize", resize));
    const canvas = this.game.canvas;
    canvas.setAttribute(
      "aria-label",
      "Interactive particle world. Click and drag to paint your selected element.",
    );
    canvas.setAttribute("role", "img");
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (this.controls.dragging) return;
      if (p.leftButtonDown() || p.rightButtonDown()) {
        this.controls.pointer = { ...this.point(p), active: true };
        if (this.controls.tool !== "inspect" || p.rightButtonDown())
          this.controls.onPaint();
        this.last = null;
        const point = this.point(p),
          tool = this.controls.tool;
        if (Object.hasOwn(habitats, tool) && !p.rightButtonDown())
          this.controls.onSpawn(
            tool as Species,
            !!this.sim.spawn(tool as Species, point.x, point.y),
          );
        else this.paint(p);
      }
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (this.controls.dragging) return;
      this.controls.pointer = { ...this.point(p), active: true };
      if (this.controls.tool === "inspect") {
        const point = this.point(p);
        this.controls.onInspect(Math.floor(point.x), Math.floor(point.y));
      }
      if (p.isDown) this.paint(p);
      else this.last = null;
    });
    this.input.on("pointerup", () => (this.last = null));
    this.input.on("gameout", () => {
      this.controls.pointer.active = false;
      this.last = null;
    });
    this.input.on(
      "wheel",
      (_p: unknown, _o: unknown, _dx: number, dy: number) => {
        this.controls.brush = Phaser.Math.Clamp(
          this.controls.brush + (dy > 0 ? -1 : 1),
          1,
          20,
        );
        window.dispatchEvent(new Event("brushchange"));
      },
    );
  }
  private point(p: Phaser.Input.Pointer) {
    return {
      x: (p.x * this.sim.width) / this.scale.width,
      y: (p.y * this.sim.height) / this.scale.height,
    };
  }
  private paint(p: Phaser.Input.Pointer) {
    if (this.controls.dragging) {
      this.last = null;
      return;
    }
    const point = this.point(p),
      c = this.controls;
    if (c.tool === "inspect" && !p.rightButtonDown()) {
      c.onInspect(Math.floor(point.x), Math.floor(point.y));
      return;
    }
    if (Object.hasOwn(habitats, c.tool) && !p.rightButtonDown()) return;
    const id = p.rightButtonDown() || c.tool === "erase" ? 0 : c.selected;
    const previous = this.last ?? point,
      dist = Math.hypot(point.x - previous.x, point.y - previous.y),
      steps = Math.max(1, Math.ceil(dist / Math.max(1, c.brush / 2)));
    for (let n = 0; n <= steps; n++) {
      const x = Math.round(previous.x + ((point.x - previous.x) * n) / steps),
        y = Math.round(previous.y + ((point.y - previous.y) * n) / steps);
      if (c.shape === "square") {
        if (id === 0)
          this.sim.creatures = this.sim.creatures.filter(
            (creature) =>
              Math.abs(creature.x - x) > c.brush + 2 ||
              Math.abs(creature.y - y) > c.brush + 2,
          );
        for (let dy = -c.brush; dy <= c.brush; dy++)
          for (let dx = -c.brush; dx <= c.brush; dx++)
            if (id === 0 || this.sim.get(x + dx, y + dy) === 0) {
              this.sim.set(x + dx, y + dy, id);
              if (id && this.sim.get(x + dx, y + dy) >= 0)
                this.sim.fields.assign(
                  (y + dy) * this.sim.width + x + dx,
                  c.variant,
                );
            }
      } else this.sim.paint(x, y, id, c.brush, false, c.variant);
    }
    this.last = point;
  }
  update(_time: number, delta: number) {
    const c = this.controls;
    this.accumulator += Math.min(delta, 80);
    while (this.accumulator >= 1000 / 30) {
      if (!c.paused) for (let n = 0; n < c.speed; n++) this.sim.step();
      this.accumulator -= 1000 / 30;
    }
    if (
      this.input.activePointer.isDown &&
      c.pointer.active &&
      (c.tool === "paint" ||
        c.tool === "erase" ||
        this.input.activePointer.rightButtonDown())
    )
      this.paint(this.input.activePointer);
    const data = this.pixels.data,
      w = this.sim.width;
    data.set(this.bg);
    let count = 0;
    for (let i = 0; i < this.sim.cells.length; i++) {
      const id = this.sim.cells[i];
      if (!id) continue;
      count++;
      let color = colors[id];
      const f = this.sim.fields;
      if (c.overlay !== "natural")
        color = overlayColor(c.overlay, f[c.overlay][i]);
      else if (f.burning[i])
        color = [245, 125 + ((i + this.sim.tick) % 60), 48];
      else if (f.charge[i] > 50) color = [245, 225, 120];
      else if (id === E.Water || id === E.Acid) {
        const salt = Math.min(1, f.salinity[i] / 70),
          pollution = f.pollution[i] / 100,
          acid = f.acidity[i] / 100;
        color = [
          58 + salt * 55 + pollution * 55 + acid * 75,
          140 + salt * 35 - pollution * 35 + acid * 55,
          225 - pollution * 150 - acid * 120,
        ];
      } else if (id === E.Metal && f.corrosion[i] > 10) {
        const rust = f.corrosion[i] / 100;
        color = [165 + rust * 30, 180 - rust * 95, 195 - rust * 145];
      } else if (id === E.Plant && f.vitality[i] < 80)
        color = [180 - f.vitality[i], 100 + f.vitality[i], 60];
      const noise = ((i * 17 + (i % w) * 13) % 19) - 9,
        off = i * 4;
      let light = id === E.Stone ? 0.62 : id === E.Soil ? 0.82 : 1;
      if (id === E.Water)
        light =
          0.72 +
          (0.22 * (Math.sin((i % w) * 0.12 + this.sim.tick * 0.04) + 1)) / 2;
      if (id === E.Fire || id === E.Lava || id === E.Spark)
        light = 0.8 + (0.3 * ((i + this.sim.tick) % 9)) / 9;
      const alpha =
        id === E.Steam || id === E.Smoke ? 0.6 : id === E.Glass ? 0.65 : 1;
      for (let j = 0; j < 3; j++)
        data[off + j] =
          (color[j] * light + noise) * alpha + data[off + j] * (1 - alpha);
    }
    this.texture.context.putImageData(this.pixels, 0, 0);
    this.drawLife();
    this.texture.refresh();
    this.cursor.clear();
    if (c.grid) {
      this.cursor.lineStyle(0.2, 0x8297ae, 0.14);
      for (let x = 0; x < w; x += 10)
        this.cursor.lineBetween(x, 0, x, this.sim.height);
      for (let y = 0; y < this.sim.height; y += 10)
        this.cursor.lineBetween(0, y, w, y);
    }
    if (c.pointer.active) {
      this.cursor.lineStyle(0.5, c.tool === "erase" ? 0xff8e83 : 0xe5fff2, 0.8);
      if (c.shape === "square")
        this.cursor.strokeRect(
          c.pointer.x - c.brush,
          c.pointer.y - c.brush,
          c.brush * 2,
          c.brush * 2,
        );
      else this.cursor.strokeCircle(c.pointer.x, c.pointer.y, c.brush);
    }
    this.statsTime += delta;
    if (this.statsTime > 500) {
      c.onStats(count, Math.round(this.game.loop.actualFps));
      if (c.tool === "inspect" && c.pointer.active)
        c.onInspect(Math.floor(c.pointer.x), Math.floor(c.pointer.y));
      this.statsTime = 0;
    }
  }
  private drawLife() {
    const ctx = this.texture.context;
    for (const c of this.sim.creatures) {
      const x = Math.round(c.x),
        y = Math.round(c.y);
      if (c.species === "human") {
        ctx.fillStyle = "#101b25";
        ctx.fillRect(x - 2, y - 7, 5, 8);
        ctx.fillStyle = habitats.human.color;
        ctx.fillRect(x - 1, y - 7, 3, 3);
        ctx.fillStyle = c.health < 45 ? "#e78d7a" : "#d6b876";
        ctx.fillRect(x - 1, y - 4, 3, 3);
        const stride = Math.floor(this.sim.tick / 8 + c.id) % 2;
        ctx.fillStyle = "#abbad0";
        ctx.fillRect(x - 1, y - 1, 1, 2 - stride);
        ctx.fillRect(x + 1, y - 1, 1, 1 + stride);
        ctx.fillStyle = "#384454";
        ctx.fillRect(x + c.direction, y - 6, 1, 1);
      } else {
        ctx.fillStyle = habitats[c.species].color;
        ctx.fillRect(x - 2, y - 1, 5, 2);
        ctx.fillRect(x - c.direction * 3, y - 2, 1, 4);
        ctx.fillStyle = "#243346";
        ctx.fillRect(x + c.direction, y - 1, 1, 1);
      }
      if (c.health < 85) {
        ctx.fillStyle = "#29343e";
        ctx.fillRect(x - 3, y - (c.species === "human" ? 10 : 5), 7, 1);
        ctx.fillStyle = c.health < 45 ? "#f19a87" : "#abdec0";
        ctx.fillRect(
          x - 3,
          y - (c.species === "human" ? 10 : 5),
          Math.ceil(c.health * 0.07),
          1,
        );
      }
    }
  }
  private background(w: number, h: number) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#111d2d");
    gradient.addColorStop(0.7, "#233344");
    gradient.addColorStop(1, "#304650");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    let seed = 93;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 95; i++) {
      ctx.fillStyle = `rgba(194,219,226,${0.15 + rand() * 0.4})`;
      ctx.fillRect(Math.floor(rand() * w), Math.floor(rand() * h * 0.63), 1, 1);
    }
    ctx.fillStyle = "#bfd4c7";
    ctx.beginPath();
    ctx.arc(w * 0.82, h * 0.16, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#142131";
    ctx.beginPath();
    ctx.arc(w * 0.82 + 4, h * 0.16 - 3, 7, 0, Math.PI * 2);
    ctx.fill();
    for (let layer = 0; layer < 3; layer++) {
      ctx.fillStyle = ["#263849", "#2b4050", "#304752"][layer];
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 2) {
        const y =
          h * (0.56 + layer * 0.09) +
          Math.sin(x * 0.022 + layer * 2) * 14 +
          Math.sin(x * 0.052 + layer) * 9;
        ctx.lineTo(x, Math.round(y));
      }
      ctx.lineTo(w, h);
      ctx.fill();
    }
    return ctx.getImageData(0, 0, w, h).data;
  }
}
function overlayColor(mode: Overlay, value: number): number[] {
  if (mode === "temperature") {
    const t = Math.max(0, Math.min(1, (value + 30) / 230));
    return [
      Math.round(30 + 225 * t),
      Math.round(140 - 75 * t),
      Math.round(235 - 205 * t),
    ];
  }
  const t = Math.min(
    1,
    value / (mode === "charge" ? 255 : mode === "salinity" ? 70 : 100),
  );
  const high =
    mode === "salinity"
      ? [203, 149, 242]
      : mode === "moisture"
        ? [70, 188, 247]
        : mode === "pollution"
          ? [211, 127, 89]
          : mode === "fertility"
            ? [141, 218, 101]
            : [255, 222, 95];
  return high.map((v, n) => Math.round([26, 38, 52][n] * (1 - t) + v * t));
}
const colors: Record<number, number[]> = {};
byId.forEach(
  (e) =>
    (colors[e.id] = [1, 3, 5].map((i) =>
      parseInt(e.color.slice(i, i + 2), 16),
    )),
);
export function bootWorld(sim: Simulation, controls: Controls) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: "world",
    width: sim.width,
    height: sim.height,
    backgroundColor: "#142131",
    pixelArt: true,
    antialias: false,
    scale: { mode: Phaser.Scale.RESIZE },
    scene: new WorldScene(sim, controls),
    banner: false,
    audio: { noAudio: true },
    input: { mouse: { preventDefaultWheel: true } },
  });
}
