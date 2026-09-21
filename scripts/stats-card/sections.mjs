/**
 * Declarative description of the three tables on the card.
 * `icon` is an Octicons name (https://primer.style/octicons), shown left of the title or label.
 * `columns` are header label keys; a row with fewer values than columns is aligned to the last column(s).
 * Add or reorder rows here, then add the label keys in i18n.mjs.
 */

const number = (n) => n.toLocaleString("en-US");
const repo = (top) => (top ? top.name : "-");

export const SECTIONS = [
  {
    title: "general",
    icon: "mark-github",
    rows: [
      { label: "joined", icon: "calendar", values: (s) => [String(s.joined)] },
      { label: "followers", icon: "people", values: (s) => [number(s.followers)] },
      { label: "following", icon: "person", values: (s) => [number(s.following)] },
      { label: "mostStarred", icon: "star", values: (s) => [repo(s.mostStarred)] },
      { label: "mostForked", icon: "repo-forked", values: (s) => [repo(s.mostForked)] },
    ],
  },
  {
    title: "repositories",
    icon: "repo",
    columns: ["nonForks", "all"],
    rows: [
      { label: "myRepositories", icon: "repo", values: (s) => both(s.repositories, "count") },
      { label: "starredBy", icon: "star", values: (s) => both(s.repositories, "stars") },
      { label: "forkedBy", icon: "repo-forked", values: (s) => both(s.repositories, "forks") },
      { label: "watchedBy", icon: "eye", values: (s) => both(s.repositories, "watchers") },
      { label: "templates", icon: "repo-template", values: (s) => both(s.repositories, "templates") },
      { label: "archived", icon: "archive", values: (s) => both(s.repositories, "archived") },
    ],
  },
  {
    title: "contributions",
    icon: "graph",
    columns: ["pastYear", "total"],
    rows: [
      { label: "commits", icon: "git-commit", values: (s) => period(s.contributions, "commits") },
      { label: "issues", icon: "issue-opened", values: (s) => period(s.contributions, "issues") },
      { label: "pullRequests", icon: "git-pull-request", values: (s) => period(s.contributions, "pullRequests") },
      { label: "reviews", icon: "code-review", values: (s) => period(s.contributions, "reviews") },
      { label: "contributedTo", icon: "repo-push", values: (s) => [number(s.contributedTo)] },
      { label: "privateContributions", icon: "lock", values: (s) => [number(s.contributions.total.private)] },
    ],
  },
];

const both = (repositories, key) => [number(repositories.nonForks[key]), number(repositories.all[key])];
const period = (contributions, key) => [number(contributions.pastYear[key]), number(contributions.total[key])];
