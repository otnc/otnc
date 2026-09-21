import octicons from "@primer/octicons";
import { ICON } from "../config.mjs";
import { h, raw } from "./svg.mjs";

/** An Octicon (16px design) whose baseline-aligned text sits at `textY`, drawn at the current ICON.size. */
export function renderIcon(name, { x, textY, fill }) {
  const octicon = octicons[name];
  if (!octicon) throw new Error(`Unknown Octicon: ${name}`);
  return h("svg", { x, y: textY - ICON.size + 2, width: ICON.size, height: ICON.size, viewBox: "0 0 16 16", fill }, raw(octicon.heights[16].path));
}

/** Where the text starts when an icon precedes it. */
export const textOffset = ICON.size + ICON.gap;
