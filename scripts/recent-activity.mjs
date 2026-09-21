/**
 * Replaces the block between <!-- activity:start --> and <!-- activity:end -->
 * in README.base.md with the latest public pull requests.
 * The block sits outside the kiritan locale blocks, so it is shared by every locale.
 */

import { readFile, writeFile } from "node:fs/promises";
import { OWNER, graphql } from "./github.mjs";

const TARGET = "README.base.md";
const LIMIT = 5;
const STATE_ICON = { MERGED: "🟣", OPEN: "🟢", CLOSED: "🔴" };

const data = await graphql(
  `query ($q: String!, $limit: Int!) {
    search(query: $q, type: ISSUE, first: $limit) {
      nodes {
        ... on PullRequest {
          title
          url
          state
          repository { nameWithOwner }
        }
      }
    }
  }`,
  { q: `author:${OWNER} is:pr is:public sort:created-desc`, limit: LIMIT },
);

const lines = data.search.nodes
  .filter((pr) => pr.url)
  .map((pr) => `- ${STATE_ICON[pr.state] ?? "⚪"} [${pr.title.replace(/[[\]]/g, "")}](${pr.url}) - ${pr.repository.nameWithOwner}`);

const source = await readFile(TARGET, "utf8");
const pattern = /(<!-- activity:start -->)[\s\S]*?(<!-- activity:end -->)/;
if (!pattern.test(source)) throw new Error(`activity markers not found in ${TARGET}`);
await writeFile(TARGET, source.replace(pattern, (_, start, end) => `${start}\n${lines.join("\n")}\n${end}`));
console.log(`updated ${lines.length} activity entries`);
