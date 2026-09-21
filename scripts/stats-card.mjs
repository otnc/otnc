/**
 * Generates a wide stats card per locale: images/stats.svg, images/stats.ja.svg.
 * Left: lifetime numbers since the account was created. Right: top languages by code size.
 * contributionsCollection only covers one year per query, so every year is summed.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { OWNER, graphql } from "./github.mjs";

const LABELS = {
  en: { contributions: "Contributions", commits: "Commits", pullRequests: "Pull requests", issues: "Issues", followers: "Followers", stars: "Stars", languages: "Top languages", since: "Since" },
  ja: { contributions: "コントリビューション", commits: "コミット", pullRequests: "プルリクエスト", issues: "イシュー", followers: "フォロワー", stars: "スター", languages: "よく使う言語", since: "登録日" },
};

const WIDTH = 840;
const HEIGHT = 200;
const MAX_LANGUAGES = 6;

async function fetchProfile() {
  const data = await graphql(
    `query ($login: String!) {
      user(login: $login) {
        createdAt
        followers { totalCount }
        issues { totalCount }
        pullRequests { totalCount }
        repositories(ownerAffiliations: OWNER, isFork: false, first: 100, orderBy: { field: STARGAZERS, direction: DESC }) {
          nodes {
            stargazerCount
            languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
              edges { size node { name color } }
            }
          }
        }
      }
    }`,
    { login: OWNER },
  );
  return data.user;
}

async function fetchContributionsOfRange(from, to) {
  const data = await graphql(
    `query ($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          totalCommitContributions
          contributionCalendar { totalContributions }
        }
      }
    }`,
    { login: OWNER, from: from.toISOString(), to: to.toISOString() },
  );
  return data.user.contributionsCollection;
}

async function fetchLifetimeContributions(createdAt) {
  const created = new Date(createdAt);
  const now = new Date();
  const total = { contributions: 0, commits: 0 };
  for (let year = created.getUTCFullYear(); year <= now.getUTCFullYear(); year++) {
    const from = new Date(Math.max(Date.UTC(year, 0, 1), created.getTime()));
    const to = new Date(Math.min(Date.UTC(year + 1, 0, 1) - 1, now.getTime()));
    const collection = await fetchContributionsOfRange(from, to);
    total.contributions += collection.contributionCalendar.totalContributions;
    total.commits += collection.totalCommitContributions;
  }
  return total;
}

function aggregateLanguages(repositories) {
  const sizes = new Map();
  for (const repo of repositories) {
    for (const { size, node } of repo.languages.edges) {
      const entry = sizes.get(node.name) ?? { name: node.name, color: node.color ?? "#8b949e", size: 0 };
      entry.size += size;
      sizes.set(node.name, entry);
    }
  }
  const sorted = [...sizes.values()].sort((a, b) => b.size - a.size);
  const total = sorted.reduce((sum, lang) => sum + lang.size, 0);
  return sorted.slice(0, MAX_LANGUAGES).map((lang) => ({ ...lang, ratio: lang.size / total }));
}

const escapeXml = (text) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const format = (n) => n.toLocaleString("en-US");

function renderNumbers(labels, values) {
  const items = [
    [labels.contributions, values.contributions],
    [labels.commits, values.commits],
    [labels.pullRequests, values.pullRequests],
    [labels.issues, values.issues],
    [labels.followers, values.followers],
    [labels.stars, values.stars],
  ];
  return items
    .map(([label, value], i) => {
      const x = 32 + (i % 3) * 150;
      const y = 54 + Math.floor(i / 3) * 62;
      return `<text x="${x}" y="${y}" class="value">${format(value)}</text>
  <text x="${x}" y="${y + 20}" class="label">${escapeXml(label)}</text>`;
    })
    .join("\n  ");
}

function renderLanguages(labels, languages) {
  const left = 500;
  const barWidth = 308;
  let offset = 0;
  const bar = languages
    .map((lang) => {
      const w = lang.ratio * barWidth;
      const rect = `<rect x="${left + offset}" y="60" width="${w}" height="10" fill="${lang.color}"/>`;
      offset += w;
      return rect;
    })
    .join("\n    ");
  const legend = languages
    .map((lang, i) => {
      const x = left + (i % 2) * 160;
      const y = 100 + Math.floor(i / 2) * 26;
      return `<circle cx="${x + 5}" cy="${y - 4}" r="5" fill="${lang.color}"/>
  <text x="${x + 16}" y="${y}" class="lang">${escapeXml(lang.name)} <tspan class="label">${(lang.ratio * 100).toFixed(1)}%</tspan></text>`;
    })
    .join("\n  ");
  return `<text x="${left}" y="40" class="title">${escapeXml(labels.languages)}</text>
  <clipPath id="bar"><rect x="${left}" y="60" width="${barWidth}" height="10" rx="5"/></clipPath>
  <g clip-path="url(#bar)">
    ${bar}
  </g>
  ${legend}`;
}

function renderSvg(labels, values, languages, since) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="GitHub stats">
  <style>
    text { font-family: 'Segoe UI', 'Hiragino Sans', 'Noto Sans JP', Ubuntu, sans-serif; }
    .value { font-size: 26px; font-weight: 700; fill: #58a6ff; }
    .label { font-size: 12px; fill: #8b949e; }
    .title { font-size: 14px; font-weight: 600; fill: #e6edf3; }
    .lang { font-size: 13px; fill: #e6edf3; }
  </style>
  <rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${HEIGHT - 1}" rx="10" fill="#0d1117" stroke="#30363d"/>
  ${renderNumbers(labels, values)}
  <line x1="470" y1="24" x2="470" y2="${HEIGHT - 24}" stroke="#30363d"/>
  ${renderLanguages(labels, languages)}
  <text x="32" y="${HEIGHT - 16}" class="label">${escapeXml(labels.since)} ${since}</text>
</svg>
`;
}

const profile = await fetchProfile();
const lifetime = await fetchLifetimeContributions(profile.createdAt);
const values = {
  ...lifetime,
  pullRequests: profile.pullRequests.totalCount,
  issues: profile.issues.totalCount,
  followers: profile.followers.totalCount,
  stars: profile.repositories.nodes.reduce((sum, repo) => sum + repo.stargazerCount, 0),
};
const languages = aggregateLanguages(profile.repositories.nodes);
const since = profile.createdAt.slice(0, 10);

await mkdir("images", { recursive: true });
for (const [locale, labels] of Object.entries(LABELS)) {
  const file = locale === "en" ? "images/stats.svg" : `images/stats.${locale}.svg`;
  await writeFile(file, renderSvg(labels, values, languages, since));
  console.log(`wrote ${file}`);
}
