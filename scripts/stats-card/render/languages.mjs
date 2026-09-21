import { ICON, INNER_WIDTH, LAYOUT } from "../config.mjs";
import { THEME } from "../theme.mjs";
import { renderIcon, textOffset } from "./icon.mjs";
import { h } from "./svg.mjs";

export function renderLanguages(labels, { languages, other }) {
  const { titleY, barY, barHeight, legendTop, legendRowHeight, legendColumns, dotRadius } = LAYOUT.languages;
  const left = LAYOUT.padding;
  const entries = [
    ...languages.map((lang) => ({ ...lang, color: lang.color ?? THEME.fallbackLanguageColor })),
    ...(other > 0 ? [{ name: labels.other, color: THEME.fallbackLanguageColor, ratio: other }] : []),
  ];

  let offset = 0;
  const segments = entries.map((entry) => {
    const width = entry.ratio * INNER_WIDTH;
    const segment = h("rect", { x: left + offset, y: barY, width, height: barHeight, fill: entry.color });
    offset += width;
    return segment;
  });

  const columnWidth = INNER_WIDTH / legendColumns;
  const legend = entries.flatMap((entry, i) => {
    const x = left + (i % legendColumns) * columnWidth;
    const y = legendTop + Math.floor(i / legendColumns) * legendRowHeight;
    return [
      h("circle", { cx: x + dotRadius, cy: y - 4, r: dotRadius, fill: entry.color }),
      h("text", { x: x + dotRadius * 2 + 6, y, class: "lang" }, `${entry.name} `, h("tspan", { class: "ratio" }, `${(entry.ratio * 100).toFixed(1)}%`)),
    ];
  });

  return [
    renderIcon(ICON.languagesTitle, { x: left, textY: titleY, fill: THEME.text }),
    h("text", { x: left + textOffset, y: titleY, class: "title" }, labels.languages),
    h("clipPath", { id: "bar" }, h("rect", { x: left, y: barY, width: INNER_WIDTH, height: barHeight, rx: barHeight / 2 })),
    h("g", { "clip-path": "url(#bar)" }, segments),
    legend,
  ];
}
