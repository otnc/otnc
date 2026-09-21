/**
 * Declarative description of the three tables on the card.
 * `columns` are header label keys; a row with fewer values than columns is aligned to the last column(s).
 * Add or reorder rows here, then add the label keys in i18n.mjs.
 */

const number = (n) => n.toLocaleString("en-US");
const repo = (top) => (top ? top.name : "-");

export const SECTIONS = [
  {
    title: "general",
    rows: [
      { label: "joined", values: (s) => [String(s.joined)] },
      { label: "followers", values: (s) => [number(s.followers)] },
      { label: "following", values: (s) => [number(s.following)] },
      { label: "mostStarred", values: (s) => [repo(s.mostStarred)] },
      { label: "mostForked", values: (s) => [repo(s.mostForked)] },
    ],
  },
  {
    title: "repositories",
    columns: ["nonForks", "all"],
    rows: [
      { label: "myRepositories", values: (s) => both(s.repositories, "count") },
      { label: "starredBy", values: (s) => both(s.repositories, "stars") },
      { label: "forkedBy", values: (s) => both(s.repositories, "forks") },
      { label: "watchedBy", values: (s) => both(s.repositories, "watchers") },
      { label: "templates", values: (s) => both(s.repositories, "templates") },
      { label: "archived", values: (s) => both(s.repositories, "archived") },
    ],
  },
  {
    title: "contributions",
    columns: ["pastYear", "total"],
    rows: [
      { label: "commits", values: (s) => period(s.contributions, "commits") },
      { label: "issues", values: (s) => period(s.contributions, "issues") },
      { label: "pullRequests", values: (s) => period(s.contributions, "pullRequests") },
      { label: "reviews", values: (s) => period(s.contributions, "reviews") },
      { label: "contributedTo", values: (s) => [number(s.contributedTo)] },
      { label: "privateContributions", values: (s) => [number(s.contributions.total.private)] },
    ],
  },
];

const both = (repositories, key) => [number(repositories.nonForks[key]), number(repositories.all[key])];
const period = (contributions, key) => [number(contributions.pastYear[key]), number(contributions.total[key])];
