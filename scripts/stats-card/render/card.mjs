import { LAYOUT } from "../config.mjs";
import { SECTIONS } from "../sections.mjs";
import { THEME, stylesheet } from "../theme.mjs";
import { renderLanguages } from "./languages.mjs";
import { h, raw, toString } from "./svg.mjs";
import { renderSection } from "./table.mjs";

export function renderCard(labels, stats) {
  const { width, height, radius, padding, divider } = LAYOUT;
  const svg = h(
    "svg",
    { xmlns: "http://www.w3.org/2000/svg", width, height, viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": "GitHub stats" },
    h("style", {}, raw(stylesheet())),
    h("rect", { x: 0.5, y: 0.5, width: width - 1, height: height - 1, rx: radius, fill: THEME.background, stroke: THEME.border }),
    SECTIONS.map((section, i) => renderSection(section, i, labels, stats)),
    h("line", { x1: padding, y1: divider.y, x2: width - padding, y2: divider.y, stroke: THEME.border }),
    renderLanguages(labels, stats),
  );
  return `${toString(svg)}\n`;
}
