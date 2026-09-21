import { LAYOUT, PANEL_WIDTH } from "../config.mjs";
import { h } from "./svg.mjs";

const truncate = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

export function renderSection(section, index, labels, stats) {
  const { gap, top, headerY, firstRowY, rowHeight, valueColumnWidth, valueMaxChars } = LAYOUT.panels;
  const left = LAYOUT.padding + index * (PANEL_WIDTH + gap);
  const columns = section.columns ?? [null];
  const columnX = (i) => left + PANEL_WIDTH - (columns.length - 1 - i) * valueColumnWidth;

  const headers = section.columns?.map((key, i) => h("text", { x: columnX(i), y: headerY, class: "head" }, labels[key]));
  const rows = section.rows.map((row, r) => {
    const y = firstRowY + r * rowHeight;
    const values = row.values(stats);
    const firstColumn = columns.length - values.length;
    return [
      h("text", { x: left, y, class: "row" }, labels[row.label]),
      values.map((value, i) => h("text", { x: columnX(firstColumn + i), y, class: "num" }, truncate(value, valueMaxChars))),
    ];
  });

  return [h("text", { x: left, y: top, class: "title" }, labels[section.title]), headers, rows];
}
