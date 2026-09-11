import type { PaletteItem } from "./combiner";

export function enablePaletteDrag(options: {
  payload: (node: HTMLElement) => PaletteItem | null;
  select: (item: PaletteItem) => void;
  drop: (item: PaletteItem, x: number, y: number) => void;
  combine: (item: PaletteItem) => void;
  dragging: (active: boolean) => void;
}) {
  let active: {
    node: HTMLElement;
    item: PaletteItem;
    x: number;
    y: number;
    id: number;
    ghost: HTMLElement | null;
  } | null = null;
  let suppressClick = false;
  const targets = () => [
    document.querySelector<HTMLElement>(".world-stage")!,
    document.querySelector<HTMLElement>("#lab-drop")!,
  ];
  function finish() {
    if (!active) return;
    active.ghost?.remove();
    if (active.node.hasPointerCapture(active.id))
      active.node.releasePointerCapture(active.id);
    active = null;
    targets().forEach((n) => n.classList.remove("drop-hover"));
    document.body.classList.remove("dragging");
    options.dragging(false);
  }
  document.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    const node = (e.target as HTMLElement).closest<HTMLElement>(
      "[data-palette]",
    );
    if (!node) return;
    const item = options.payload(node);
    if (!item) return;
    suppressClick = false;
    active = {
      node,
      item,
      x: e.clientX,
      y: e.clientY,
      id: e.pointerId,
      ghost: null,
    };
    node.setPointerCapture(e.pointerId);
  });
  document.addEventListener(
    "pointermove",
    (e) => {
      if (!active || e.pointerId !== active.id) return;
      if (
        !active.ghost &&
        Math.hypot(e.clientX - active.x, e.clientY - active.y) < 6
      )
        return;
      e.preventDefault();
      if (!active.ghost) {
        active.ghost = active.node.cloneNode(true) as HTMLElement;
        active.ghost.className = "drag-ghost";
        active.ghost.removeAttribute("id");
        active.ghost.removeAttribute("data-palette");
        active.ghost.setAttribute("aria-hidden", "true");
        document.body.append(active.ghost);
        document.body.classList.add("dragging");
        options.dragging(true);
        suppressClick = true;
      }
      active.ghost.style.left = `${e.clientX + 14}px`;
      active.ghost.style.top = `${e.clientY + 14}px`;
      targets().forEach((n) => {
        const r = n.getBoundingClientRect();
        n.classList.toggle(
          "drop-hover",
          e.clientX >= r.left &&
            e.clientX < r.right &&
            e.clientY >= r.top &&
            e.clientY < r.bottom,
        );
      });
    },
    { passive: false },
  );
  document.addEventListener("pointerup", (e) => {
    if (!active || e.pointerId !== active.id) return;
    const item = active.item,
      dragged = !!active.ghost;
    finish();
    if (dragged) options.drop(item, e.clientX, e.clientY);
  });
  document.addEventListener("pointercancel", finish);
  document.addEventListener("contextmenu", (e) => {
    const node = (e.target as HTMLElement).closest<HTMLElement>(
      "[data-palette]",
    );
    if (!node) return;
    e.preventDefault();
    finish();
    const item = options.payload(node);
    if (item) options.combine(item);
  });
  window.addEventListener("blur", finish);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") finish();
    const node = (e.target as HTMLElement).closest<HTMLElement>(
      "[data-palette]",
    );
    if (node && e.key.toLowerCase() === "c" && !e.ctrlKey && !e.metaKey) {
      const item = options.payload(node);
      if (item) {
        e.preventDefault();
        options.combine(item);
      }
    }
  });
  document.addEventListener("click", (e) => {
    const node = (e.target as HTMLElement).closest<HTMLElement>(
      "[data-palette]",
    );
    if (!node) return;
    if (suppressClick && e.detail !== 0) {
      suppressClick = false;
      e.preventDefault();
      return;
    }
    const item = options.payload(node);
    if (item) options.select(item);
  });
}
