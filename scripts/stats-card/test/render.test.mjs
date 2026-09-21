import assert from "node:assert/strict";
import { test } from "node:test";
import { LABELS } from "../i18n.mjs";
import { renderCard } from "../render/card.mjs";
import { h, toString } from "../render/svg.mjs";

const repositories = { nonForks: { count: 129, stars: 519, forks: 27, watchers: 33, templates: 3, archived: 25 }, all: { count: 159, stars: 542, forks: 27, watchers: 33, templates: 3, archived: 25 } };
const contribution = (n) => ({ commits: n, issues: n, pullRequests: n, reviews: n, private: n });
const stats = {
  joined: 2022, followers: 188, following: 111, contributedTo: 96,
  mostStarred: { name: "hono-feed", count: 1 }, mostForked: null,
  repositories, contributions: { pastYear: contribution(1), total: contribution(6081) },
  languages: [{ name: "C<>&", color: null, ratio: 0.5 }], other: 0.5,
};

test("h escapes text and attributes", () => {
  assert.equal(toString(h("text", { title: 'a"b' }, "<x>&")), '<text title="a&quot;b">&lt;x&gt;&amp;</text>');
});

test("renderCard shows every section with localized labels, formatted numbers and escaped names", () => {
  const svg = renderCard(LABELS.ja, stats);
  assert.match(svg, /^<svg[\s\S]*<\/svg>\n$/);
  for (const expected of [">基本情報<", ">リポジトリ<", ">コントリビューション<", ">6,081<", ">hono-feed<", ">-<", "C&lt;&gt;&amp;", ">その他 "]) {
    assert.ok(svg.includes(expected), `missing ${expected}`);
  }
});

test("every label key used by the card exists in every locale", () => {
  const keys = (locale) => Object.keys(LABELS[locale]).sort();
  assert.deepEqual(keys("ja"), keys("en"));
});
