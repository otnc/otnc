/** Pure data shaping: no network, no SVG. */

import { MAX_LANGUAGES } from "./config.mjs";

const CONTRIBUTION_KEYS = ["commits", "issues", "pullRequests", "reviews", "private"];

/** Splits [createdAt, now] into per-year ranges, because GitHub limits contributionsCollection to one year. */
export function yearRanges(createdAt, now = new Date()) {
  const created = new Date(createdAt);
  const ranges = [];
  for (let year = created.getUTCFullYear(); year <= now.getUTCFullYear(); year++) {
    ranges.push({
      from: new Date(Math.max(Date.UTC(year, 0, 1), created.getTime())),
      to: new Date(Math.min(Date.UTC(year + 1, 0, 1) - 1, now.getTime())),
    });
  }
  return ranges;
}

export function sumContributions(perYear) {
  const total = Object.fromEntries(CONTRIBUTION_KEYS.map((key) => [key, 0]));
  for (const year of perYear) for (const key of CONTRIBUTION_KEYS) total[key] += year[key];
  return total;
}

function summarizeRepositories(repositories) {
  const sum = (pick) => repositories.reduce((total, repo) => total + pick(repo), 0);
  return {
    count: repositories.length,
    stars: sum((repo) => repo.stargazerCount),
    forks: sum((repo) => repo.forkCount),
    watchers: sum((repo) => repo.watchers.totalCount),
    templates: sum((repo) => Number(repo.isTemplate)),
    archived: sum((repo) => Number(repo.isArchived)),
  };
}

const topBy = (repositories, pick) => {
  const best = repositories.reduce((top, repo) => (top === null || pick(repo) > pick(top) ? repo : top), null);
  return best && { name: best.name, count: pick(best) };
};

/** Languages by code size across the given repositories. Anything past `limit` is folded into `other`. */
export function aggregateLanguages(repositories, limit = MAX_LANGUAGES) {
  const byName = new Map();
  for (const repo of repositories) {
    for (const { size, node } of repo.languages.edges) {
      const entry = byName.get(node.name) ?? { name: node.name, color: node.color, size: 0 };
      entry.size += size;
      byName.set(node.name, entry);
    }
  }
  const sorted = [...byName.values()].sort((a, b) => b.size - a.size);
  const total = sorted.reduce((sum, lang) => sum + lang.size, 0);
  const ratio = (size) => size / total;
  const shown = sorted.slice(0, limit).map(({ name, color, size }) => ({ name, color, ratio: ratio(size) }));
  const otherSize = sorted.slice(limit).reduce((sum, lang) => sum + lang.size, 0);
  return { languages: shown, other: otherSize > 0 ? ratio(otherSize) : 0 };
}

export function buildStats({ profile, repositories, pastYear, lifetime }) {
  const nonForks = repositories.filter((repo) => !repo.isFork);
  return {
    joined: new Date(profile.createdAt).getUTCFullYear(),
    followers: profile.followers,
    following: profile.following,
    contributedTo: profile.contributedTo,
    mostStarred: topBy(nonForks, (repo) => repo.stargazerCount),
    mostForked: topBy(nonForks, (repo) => repo.forkCount),
    repositories: { nonForks: summarizeRepositories(nonForks), all: summarizeRepositories(repositories) },
    contributions: { pastYear, total: lifetime },
    ...aggregateLanguages(nonForks),
  };
}
