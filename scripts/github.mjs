/**
 * Minimal GitHub GraphQL client for the README generators.
 * Reads GITHUB_TOKEN and GITHUB_REPOSITORY_OWNER (both provided by GitHub Actions).
 */

const TOKEN = process.env.GITHUB_TOKEN;
export const OWNER = process.env.GITHUB_REPOSITORY_OWNER ?? "otnc";

if (!TOKEN) {
  console.error("GITHUB_TOKEN is not set.");
  process.exit(1);
}

export async function graphql(query, variables = {}) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "otnc-profile-scripts",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GitHub GraphQL failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  if (json.errors) throw new Error(`GitHub GraphQL errors: ${JSON.stringify(json.errors)}`);
  return json.data;
}
