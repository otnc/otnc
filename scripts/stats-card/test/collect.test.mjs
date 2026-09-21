import assert from "node:assert/strict";
import { test } from "node:test";
import { aggregateLanguages, buildStats, sumContributions, yearRanges } from "../collect.mjs";

const repo = (overrides = {}, ...languages) => ({
  name: "repo",
  isFork: false,
  isTemplate: false,
  isArchived: false,
  stargazerCount: 0,
  forkCount: 0,
  watchers: { totalCount: 0 },
  languages: { edges: languages.map(([name, size, color]) => ({ size, node: { name, color } })) },
  ...overrides,
});

test("yearRanges clamps the first and last year to the account lifetime", () => {
  const ranges = yearRanges("2022-10-29T03:00:00Z", new Date("2024-05-01T00:00:00Z"));
  assert.equal(ranges.length, 3);
  assert.equal(ranges[0].from.toISOString(), "2022-10-29T03:00:00.000Z");
  assert.equal(ranges[1].from.toISOString(), "2023-01-01T00:00:00.000Z");
  assert.equal(ranges[2].to.toISOString(), "2024-05-01T00:00:00.000Z");
});

test("sumContributions adds every field of every year", () => {
  const year = { commits: 1, issues: 2, pullRequests: 3, reviews: 4, private: 5 };
  assert.deepEqual(sumContributions([year, year]), { commits: 2, issues: 4, pullRequests: 6, reviews: 8, private: 10 });
});

test("aggregateLanguages folds the tail into other and keeps ratios relative to everything", () => {
  const { languages, other } = aggregateLanguages([repo({}, ["TS", 60, "#3178c6"], ["CSS", 10, null]), repo({}, ["TS", 20, "#3178c6"], ["Go", 10, "#00add8"])], 1);
  assert.deepEqual(languages.map((l) => l.name), ["TS"]);
  assert.equal(languages[0].ratio, 0.8);
  assert.equal(other, 0.2);
});

test("buildStats separates non-forks from all repositories and picks the most starred non-fork", () => {
  const stats = buildStats({
    profile: { createdAt: "2022-10-29T03:00:00Z", followers: 1, following: 2, contributedTo: 3 },
    repositories: [
      repo({ name: "a", stargazerCount: 5, forkCount: 1, isArchived: true }),
      repo({ name: "b", stargazerCount: 9, isTemplate: true }),
      repo({ name: "fork", isFork: true, stargazerCount: 100 }),
    ],
    pastYear: {},
    lifetime: {},
  });
  assert.equal(stats.joined, 2022);
  assert.deepEqual(stats.repositories.nonForks, { count: 2, stars: 14, forks: 1, watchers: 0, templates: 1, archived: 1 });
  assert.equal(stats.repositories.all.stars, 114);
  assert.deepEqual(stats.mostStarred, { name: "b", count: 9 });
});
