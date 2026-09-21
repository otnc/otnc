/**
 * update-github-urls.mjs
 *
 * GitHub Code Search API を使って全リポジトリから旧アカウント名を含む
 * ファイルを検索し、対象パターンのみ新アカウント名に書き換えてコミットする。
 *
 * 使い方:
 *   npm run urls             # キャッシュがあれば再利用
 *   npm run urls -- --no-cache  # キャッシュを無視して再検索
 *
 * キャッシュ:
 *   cache/search-items.json  … Code Search ヒット一覧（途中保存あり）
 *   cache/search-done.json   … 検索済みリポジトリ名
 *   cache/repo-branches.json … default_branch の取得結果
 *
 * 注意:
 *   - Code Search API は認証済みでも 10 req/min のため低速です。
 *   - バイナリファイル (画像等) は自動スキップします。
 *   - VS Code 拡張 ID / publisher / Kyash / JSR スコープなど
 *     置換すべきでないパターンは REPLACE_RULES に含まれません。
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { apiGet, apiPut, searchCode, listAllRepos } from "./github-client.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dir, "cache");
const SEARCH_CACHE_FILE = join(CACHE_DIR, "search-items.json");
const BRANCHES_CACHE_FILE = join(CACHE_DIR, "repo-branches.json");

const NO_CACHE = process.argv.includes("--no-cache");

/** キャッシュファイルを読む（存在しなければ null） */
function readCache(file) {
  if (NO_CACHE || !existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf-8"));
  } catch {
    return null;
  }
}

/** キャッシュファイルに書く */
function writeCache(file, data) {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}

const OLD_NAME = process.env.GITHUB_OLD_NAME;
const NEW_NAME = process.env.GITHUB_NEW_NAME;
if (!OLD_NAME || !NEW_NAME) {
  console.error("環境変数 GITHUB_OLD_NAME / GITHUB_NEW_NAME がセットされていません。");
  process.exit(1);
}

const GITHUB_OWNER = NEW_NAME;
const COMMIT_MESSAGE = `chore: replace ${OLD_NAME} references with ${NEW_NAME}`;

/**
 * 置換ルール。上から順に適用する。
 *
 * 【置換しないもの（ルールに含めない）】
 *   - otoneko1102.noshift-vscode / otoneko1102.purus  … VS Code 拡張 ID
 *   - "publisher": "otoneko1102"                      … VS Code publisher フィールド
 *   - Kyash: @otoneko1102                              … Kyash ハンドル
 *   - jsr.io/@otoneko1102 / @otoneko1102/<pkg>         … JSR / npm スコープパッケージ
 */
const REPLACE_RULES = [
  // github.com URL（パス区切り有無を問わず）
  [new RegExp(`github\.com/${OLD_NAME}`, "g"), `github.com/${NEW_NAME}`],
  // GitHub Pages
  [new RegExp(`${OLD_NAME}\.github\.io`, "g"), `${NEW_NAME}.github.io`],
  // shields.io GitHub バッジ（/TYPE/.../otoneko1102/<repo> 形式）
  [new RegExp(`(shields\.io\/github\/(?:[^/\\s]+\/)*)${OLD_NAME}\/`, "g"), `$1${NEW_NAME}/`],
  // contrib.rocks（?repo=otoneko1102/<repo> 形式）
  [new RegExp(`(contrib\.rocks\/image\\?repo=)${OLD_NAME}\/`, "g"), `$1${NEW_NAME}/`],
  // GitHub プロフィール @mention（全角括弧）例: （@otoneko1102）
  [new RegExp(`（@${OLD_NAME}）`, "g"), `（@${NEW_NAME}）`],
  // GitHub プロフィール @mention（半角括弧）例: (@otoneko1102)
  [new RegExp(`\\(@${OLD_NAME}\\)`, "g"), `(@${NEW_NAME})`],
];

/** テキストに REPLACE_RULES のいずれかがマッチするか確認 */
function hasAnyMatch(text) {
  return REPLACE_RULES.some(([pattern]) => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  });
}

/** REPLACE_RULES をすべて適用して置換後テキストを返す */
function applyReplaceRules(text) {
  let result = text;
  for (const [pattern, replacement] of REPLACE_RULES) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/** テキストとして扱えない拡張子はスキップ */
const BINARY_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "svg", "ico",
  "woff", "woff2", "ttf", "eot", "otf",
  "pdf", "zip", "tar", "gz", "7z",
  "mp4", "mp3", "ogg", "wav",
  "exe", "dll", "so", "dylib",
  "lock",
]);

function isBinary(filePath) {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  return BINARY_EXTENSIONS.has(ext);
}

/** Contents API でファイルを取得してテキストに変換 */
async function fetchFileContent(owner, repo, path, ref) {
  // パスの各セグメントのみエンコード（/ は保持）
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const refParam = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  const data = await apiGet(`/repos/${owner}/${repo}/contents/${encodedPath}${refParam}`);
  if (!data || Array.isArray(data)) return null;
  if (data.encoding !== "base64") return null;
  return { sha: data.sha, text: Buffer.from(data.content, "base64").toString("utf-8") };
}

/** default_branch をキャッシュ付きで取得 */
const branchesCache = readCache(BRANCHES_CACHE_FILE) ?? {};
async function getDefaultBranch(owner, repo) {
  if (branchesCache[repo]) return branchesCache[repo];
  const data = await apiGet(`/repos/${owner}/${repo}`);
  const branch = data?.default_branch ?? "main";
  branchesCache[repo] = branch;
  // 逐次保存（途中終了時もキャッシュを残す）
  writeCache(BRANCHES_CACHE_FILE, branchesCache);
  return branch;
}

// ---- 検索フェーズ ----

let uniqueItems;
const cachedItems = readCache(SEARCH_CACHE_FILE);

// キャッシュが途中まであれば再利用し、残りのリポジトリだけ検索する
// cache/search-items.json  … ヒットファイル一覧（途中保存あり）
// cache/search-done.json   … 検索済みリポジトリ名のリスト
const SEARCH_DONE_FILE = join(CACHE_DIR, "search-done.json");

/** itemMap にアイテムを追加して即座にキャッシュへ書き込む */
function appendToSearchCache(itemMap) {
  writeCache(SEARCH_CACHE_FILE, [...itemMap.values()]);
}

const searchIsDone = !NO_CACHE && existsSync(SEARCH_DONE_FILE) && (() => {
  try {
    const done = JSON.parse(readFileSync(SEARCH_DONE_FILE, "utf-8"));
    return Array.isArray(done) && done.includes("__global__") && done.includes("__all_repos__");
  } catch { return false; }
})();

if (cachedItems && searchIsDone) {
  console.log(`[cache] search-items.json を使用 (${cachedItems.length} 件)`);
  uniqueItems = cachedItems;
} else {
  const itemMap = cachedItems
    ? new Map(cachedItems.map((i) => [`${i.repository.name}:${i.path}`, i]))
    : new Map();
  const doneRepos = new Set(
    NO_CACHE || !existsSync(SEARCH_DONE_FILE)
      ? []
      : JSON.parse(readFileSync(SEARCH_DONE_FILE, "utf-8"))
  );

  // ① ユーザー横断検索（未実施の場合のみ）
  if (!doneRepos.has("__global__")) {
    console.log(`検索クエリ: "${OLD_NAME}" user:${GITHUB_OWNER}`);
    const items = await searchCode(`"${OLD_NAME}" user:${GITHUB_OWNER}`);
    console.log(`ヒット件数: ${items.length} ファイル`);
    for (const item of items) {
      const key = `${item.repository.name}:${item.path}`;
      if (!itemMap.has(key)) itemMap.set(key, item);
    }
    doneRepos.add("__global__");
    appendToSearchCache(itemMap);
    writeCache(SEARCH_DONE_FILE, [...doneRepos]);
    console.log(`[cache] グローバル検索結果を保存しました (${itemMap.size} 件)`);
  } else {
    console.log(`[cache] グローバル検索済みをスキップ`);
  }

  const foundRepos = new Set([...itemMap.values()].map((i) => i.repository.name));

  // ② 全リポジトリを列挙し、Code Search に漏れたリポジトリを個別検索で補う
  console.log(`\n全リポジトリを列挙して漏れを補完中...`);
  const allRepos = await listAllRepos();
  console.log(`リポジトリ総数: ${allRepos.length}`);

  for (const repo of allRepos) {
    if (doneRepos.has(repo.name)) {
      console.log(`  [cache] ${repo.name} — 検索済みスキップ`);
      continue;
    }
    if (foundRepos.has(repo.name)) {
      // グローバル検索でヒット済みだが個別検索は不要 → 完了扱い
      doneRepos.add(repo.name);
      writeCache(SEARCH_DONE_FILE, [...doneRepos]);
      continue;
    }
    console.log(`  [補完検索] ${repo.name}`);
    const repoItems = await searchCode(`"${OLD_NAME}" repo:${GITHUB_OWNER}/${repo.name}`);
    for (const item of repoItems) {
      const key = `${item.repository.name}:${item.path}`;
      if (!itemMap.has(key)) itemMap.set(key, item);
    }
    doneRepos.add(repo.name);
    // リポジトリ1件ごとにキャッシュへ書き込む
    appendToSearchCache(itemMap);
    writeCache(SEARCH_DONE_FILE, [...doneRepos]);
    console.log(`    → ${repoItems.length} 件ヒット (累計 ${itemMap.size} 件)`);
  }

  uniqueItems = [...itemMap.values()];
  // 全リポジトリ検索完了フラグを書き込む
  doneRepos.add("__all_repos__");
  writeCache(SEARCH_DONE_FILE, [...doneRepos]);
  console.log(`\n検索完了 — 合計 ${uniqueItems.length} 件\n`);
}

// ---- 更新フェーズ ----

let updatedCount = 0;
let skippedCount = 0;

for (const item of uniqueItems) {
  const repoName = item.repository.name;
  const filePath = item.path;

  if (isBinary(filePath)) {
    console.log(`[binary-skip] ${repoName}/${filePath}`);
    skippedCount++;
    continue;
  }

  const defaultBranch = await getDefaultBranch(GITHUB_OWNER, repoName);

  console.log(`処理中: ${repoName}/${filePath}`);
  try {
    const file = await fetchFileContent(GITHUB_OWNER, repoName, filePath, defaultBranch);
    if (!file) {
      console.log(`  [skip] ファイル取得失敗`);
      skippedCount++;
      continue;
    }

    const updatedText = applyReplaceRules(file.text);
    if (updatedText === file.text) {
      console.log(`  [skip] 対象パターンなし（インデックスが古いか置換不要）`);
      skippedCount++;
      continue;
    }
    const encodedContent = Buffer.from(updatedText).toString("base64");

    await apiPut(`/repos/${GITHUB_OWNER}/${repoName}/contents/${filePath}`, {
      message: COMMIT_MESSAGE,
      content: encodedContent,
      sha: file.sha,
      branch: defaultBranch,
    });

    console.log(`  [updated] ${repoName}/${filePath}`);
    updatedCount++;
  } catch (err) {
    console.error(`  [error] ${err.message}`);
    skippedCount++;
  }
}

console.log(`\n完了 — 更新: ${updatedCount} 件 / スキップ: ${skippedCount} 件`);

