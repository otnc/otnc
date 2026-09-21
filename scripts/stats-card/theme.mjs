export const THEME = {
  background: "#0d1117",
  border: "#30363d",
  accent: "#58a6ff",
  text: "#e6edf3",
  muted: "#8b949e",
  /** Used for "Other" and for languages GitHub has no color for. */
  fallbackLanguageColor: "#8b949e",
  fontFamily: "'Segoe UI', 'Hiragino Sans', 'Noto Sans JP', Ubuntu, sans-serif",
};

export function stylesheet(theme = THEME) {
  return `
    text { font-family: ${theme.fontFamily}; }
    .title { font-size: 14px; font-weight: 600; fill: ${theme.text}; }
    .head { font-size: 11px; fill: ${theme.muted}; text-anchor: end; }
    .row { font-size: 13px; fill: ${theme.muted}; }
    .num { font-size: 13px; font-weight: 600; fill: ${theme.accent}; text-anchor: end; }
    .lang { font-size: 13px; fill: ${theme.text}; }
    .ratio { fill: ${theme.muted}; }
  `;
}
