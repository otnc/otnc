import { OWNER, graphql } from "../github.mjs";
import { REPOSITORY_PAGE_SIZE } from "./config.mjs";

const PROFILE_QUERY = /* GraphQL */ `
  query ($login: String!) {
    user(login: $login) {
      createdAt
      followers { totalCount }
      following { totalCount }
      repositoriesContributedTo(first: 1, contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]) { totalCount }
    }
  }
`;

const REPOSITORIES_QUERY = /* GraphQL */ `
  query ($login: String!, $first: Int!, $after: String) {
    user(login: $login) {
      repositories(ownerAffiliations: OWNER, first: $first, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes {
          name
          isFork
          isTemplate
          isArchived
          stargazerCount
          forkCount
          watchers { totalCount }
          languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
            edges { size node { name color } }
          }
        }
      }
    }
  }
`;

const CONTRIBUTIONS_QUERY = /* GraphQL */ `
  query ($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        totalCommitContributions
        totalIssueContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
        restrictedContributionsCount
      }
    }
  }
`;

export async function fetchProfile() {
  const { user } = await graphql(PROFILE_QUERY, { login: OWNER });
  return {
    createdAt: user.createdAt,
    followers: user.followers.totalCount,
    following: user.following.totalCount,
    contributedTo: user.repositoriesContributedTo.totalCount,
  };
}

/** Every repository the owner has, following pagination. */
export async function fetchRepositories() {
  const repositories = [];
  let after = null;
  do {
    const { user } = await graphql(REPOSITORIES_QUERY, { login: OWNER, first: REPOSITORY_PAGE_SIZE, after });
    repositories.push(...user.repositories.nodes);
    after = user.repositories.pageInfo.hasNextPage ? user.repositories.pageInfo.endCursor : null;
  } while (after);
  return repositories;
}

/** contributionsCollection covers at most one year per query. */
export async function fetchContributions({ from, to }) {
  const { user } = await graphql(CONTRIBUTIONS_QUERY, { login: OWNER, from: from.toISOString(), to: to.toISOString() });
  const c = user.contributionsCollection;
  return {
    commits: c.totalCommitContributions,
    issues: c.totalIssueContributions,
    pullRequests: c.totalPullRequestContributions,
    reviews: c.totalPullRequestReviewContributions,
    private: c.restrictedContributionsCount,
  };
}
