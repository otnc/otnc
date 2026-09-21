/**
 * Shared GitHub GraphQL client for the README generators.
 * Reads GITHUB_TOKEN and GITHUB_REPOSITORY_OWNER (both provided by GitHub Actions).
 */

import { graphql as octokitGraphql } from "@octokit/graphql";

const TOKEN = process.env.GITHUB_TOKEN;
export const OWNER = process.env.GITHUB_REPOSITORY_OWNER ?? "otnc";

if (!TOKEN) {
  console.error("GITHUB_TOKEN is not set.");
  process.exit(1);
}

const client = octokitGraphql.defaults({
  headers: { authorization: `token ${TOKEN}`, "user-agent": "otnc-profile-scripts" },
});

export const graphql = (query, variables = {}) => client(query, variables);
