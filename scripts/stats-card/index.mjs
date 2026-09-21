/**
 * Generates the wide stats card per locale (see config.mjs OUTPUTS).
 * Data flow: queries (network) -> collect (pure shaping) -> render (SVG) -> files.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { buildStats, sumContributions, yearRanges } from "./collect.mjs";
import { OUTPUTS, PAST_YEAR_DAYS } from "./config.mjs";
import { LABELS } from "./i18n.mjs";
import { fetchContributions, fetchProfile, fetchRepositories } from "./queries.mjs";
import { renderCard } from "./render/card.mjs";

const now = new Date();
const profile = await fetchProfile();
const repositories = await fetchRepositories();
const pastYear = await fetchContributions({ from: new Date(now.getTime() - PAST_YEAR_DAYS * 86_400_000), to: now });
const perYear = [];
for (const range of yearRanges(profile.createdAt, now)) perYear.push(await fetchContributions(range));
const stats = buildStats({ profile, repositories, pastYear, lifetime: sumContributions(perYear) });

for (const [locale, file] of Object.entries(OUTPUTS)) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, renderCard(LABELS[locale], stats));
  console.log(`wrote ${file}`);
}
