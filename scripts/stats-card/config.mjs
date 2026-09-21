/** Everything tunable about the stats card lives here, in theme.mjs, i18n.mjs or sections.mjs. */

/** Output file per locale. The default locale has no suffix, like kiritan's naming preset. */
export const OUTPUTS = {
  en: "images/stats.svg",
  ja: "images/stats.ja.svg",
};

/** Languages shown individually (the rest are folded into "Other"). */
export const MAX_LANGUAGES = 8;

export const REPOSITORY_PAGE_SIZE = 100;

/** The "past year" column covers this many days back from now. */
export const PAST_YEAR_DAYS = 365;

export const LAYOUT = {
  width: 840,
  height: 340,
  radius: 10,
  padding: 32,
  panels: { count: 3, gap: 28, top: 40, headerY: 62, firstRowY: 86, rowHeight: 24, valueColumnWidth: 64, valueMaxChars: 16 },
  divider: { y: 220 },
  languages: { titleY: 246, barY: 260, barHeight: 10, legendTop: 296, legendRowHeight: 24, legendColumns: 5, dotRadius: 5 },
};

export const INNER_WIDTH = LAYOUT.width - LAYOUT.padding * 2;
export const PANEL_WIDTH = (INNER_WIDTH - LAYOUT.panels.gap * (LAYOUT.panels.count - 1)) / LAYOUT.panels.count;
