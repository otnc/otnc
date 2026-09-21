/**
 * Generates images/lifetime.svg and images/lifetime.ja.svg:
 * contributions since the account was created, followers and stars, in one row.
 * contributionsCollection only covers one year per query, so every year is summed.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { OWNER, graphql } from "./github.mjs";

const LABELS = {
  en: { contributions: "Contributions", followers: "Followers", stars: "Stars", since: "since" },
  ja: { contributions: "Contributions", followers: "Followers", stars: "Stars", since: "since" },
};

async function fetchProfile() {
  const data = await graphql(
    `query ($login: String!) {
      user(login: $login) {
        createdAt
        followers { totalCount }
        repositories(ownerAffiliations: OWNER, isFork: false, first: 100, orderBy: { field: STARGAZERS, direction: DESC }) {
          nodes { stargazerCount }
        }
      }
    }`,
    { login: OWNER },
  );
  return data.user;
}

async function fetchContributionsOfYear(from, to) {
  const data = await graphql(
    `query ($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar { totalContributions }
        }
      }
    }`,
    { login: OWNER, from: from.toISOString(), to: to.toISOString() },
  );
  return data.user.contributionsCollection.contributionCalendar.totalContributions;
}

async function fetchLifetimeContributions(createdAt) {
  const created = new Date(createdAt);
  const now = new Date();
  let total = 0;
  for (let year = created.getUTCFullYear(); year <= now.getUTCFullYear(); year++) {
    const from = new Date(Math.max(Date.UTC(year, 0, 1), created.getTime()));
    const to = new Date(Math.min(Date.UTC(year + 1, 0, 1) - 1, now.getTime()));
    total += await fetchContributionsOfYear(from, to);
  }
  return total;
}

function renderSvg(labels, items, since) {
  const width = 480;
  const cell = width / items.length;
  const cells = items
    .map((item, i) => {
      const x = cell * i + cell / 2;
      return `<text x="${x}" y="40" class="value">${item.value.toLocaleString("en-US")}</text>
  <text x="${x}" y="62" class="label">${item.label}</text>`;
    })
    .join("\n  ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="96" viewBox="0 0 ${width} 96" role="img" aria-label="Lifetime GitHub stats">
  <style>
    .value { font: 700 24px 'Segoe UI', Ubuntu, sans-serif; fill: #58a6ff; text-anchor: middle; }
    .label { font: 400 12px 'Segoe UI', Ubuntu, sans-serif; fill: #8b949e; text-anchor: middle; }
    .since { font: 400 11px 'Segoe UI', Ubuntu, sans-serif; fill: #8b949e; text-anchor: middle; }
  </style>
  <rect x="0.5" y="0.5" width="${width - 1}" height="95" rx="8" fill="#282c34" stroke="#3b4048"/>
  ${cells}
  <text x="${width / 2}" y="84" class="since">${labels.since} ${since}</text>
</svg>
`;
}

const profile = await fetchProfile();
const contributions = await fetchLifetimeContributions(profile.createdAt);
const stars = profile.repositories.nodes.reduce((sum, repo) => sum + repo.stargazerCount, 0);
const since = profile.createdAt.slice(0, 10);

await mkdir("images", { recursive: true });
for (const [locale, labels] of Object.entries(LABELS)) {
  const items = [
    { label: labels.contributions, value: contributions },
    { label: labels.followers, value: profile.followers.totalCount },
    { label: labels.stars, value: stars },
  ];
  const file = locale === "en" ? "images/lifetime.svg" : `images/lifetime.${locale}.svg`;
  await writeFile(file, renderSvg(labels, items, since));
  console.log(`wrote ${file}`);
}
