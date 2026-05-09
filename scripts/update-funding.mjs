/**
 * update-funding.mjs
 *
 * GitHub API を使って全リポジトリの .github/FUNDING.yml / FUNDING.yaml 内の
 * 旧アカウント名を新アカウント名に書き換えてコミットするスクリプト。
 *
 * 使い方:
 *   npm run funding
 */

import "dotenv/config";
import { apiGet, apiPut, listAllRepos } from "./github-client.mjs";

const OLD_NAME = process.env.GITHUB_OLD_NAME;
const NEW_NAME = process.env.GITHUB_NEW_NAME;
const GITHUB_OWNER = NEW_NAME;

if (!OLD_NAME || !NEW_NAME) {
  console.error("環境変数 GITHUB_OLD_NAME / GITHUB_NEW_NAME がセットされていません。");
  process.exit(1);
}

const COMMIT_MESSAGE = `chore: replace ${OLD_NAME} with ${NEW_NAME} in FUNDING`;
const FUNDING_PATHS = [".github/FUNDING.yml", ".github/FUNDING.yaml"];

/** 1リポジトリを処理 */
async function processRepo(repo) {
  const repoName = repo.name;
  const defaultBranch = repo.default_branch;

  for (const filePath of FUNDING_PATHS) {
    const fileData = await apiGet(
      `/repos/${GITHUB_OWNER}/${repoName}/contents/${filePath}?ref=${defaultBranch}`
    );
    if (!fileData) continue; // ファイルなし

    const originalContent = Buffer.from(fileData.content, "base64").toString("utf-8");
    if (!originalContent.includes(OLD_NAME)) {
      console.log(`  [skip] ${repoName}/${filePath} — 対象文字列なし`);
      continue;
    }

    const updatedContent = originalContent.replaceAll(OLD_NAME, NEW_NAME);
    const encodedContent = Buffer.from(updatedContent).toString("base64");

    await apiPut(`/repos/${GITHUB_OWNER}/${repoName}/contents/${filePath}`, {
      message: COMMIT_MESSAGE,
      content: encodedContent,
      sha: fileData.sha,
      branch: defaultBranch,
    });

    console.log(`  [updated] ${repoName}/${filePath}`);
  }
}

// ---- メイン ----
const repos = await listAllRepos();
console.log(`対象リポジトリ数: ${repos.length}`);

for (const repo of repos) {
  if (repo.archived) {
    console.log(`[archived] ${repo.name} — スキップ`);
    continue;
  }
  console.log(`処理中: ${repo.name}`);
  try {
    await processRepo(repo);
  } catch (err) {
    console.error(`  [error] ${repo.name}: ${err.message}`);
  }
}

console.log("完了");
