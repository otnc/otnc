/**
 * github-client.mjs
 * GitHub API 共通ユーティリティ（レート制限対策・リトライ含む）
 */

import "dotenv/config";

const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) {
  console.error("環境変数 GITHUB_TOKEN がセットされていません。");
  process.exit(1);
}

/** リクエスト間の最小待機時間 (ms)。Secondary rate limit 対策。 */
export const REQUEST_INTERVAL_MS = 300;
/** Code Search API は 10 req/min のため 7 秒インターバルを確保。 */
export const SEARCH_INTERVAL_MS = 7_000;
/** remaining がこの値以下になったらリセット時刻まで待機する。 */
const RATE_LIMIT_BUFFER = 20;
/** 429 / 503 時のリトライ上限回数。 */
const MAX_RETRIES = 5;

const BASE_HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "otnc-migration-script",
};

/** ms だけ待機 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** レート制限ヘッダーを読み取り、必要なら待機 */
async function handleRateLimit(res) {
  const remaining = parseInt(res.headers.get("x-ratelimit-remaining") ?? "999", 10);
  const resetEpoch = parseInt(res.headers.get("x-ratelimit-reset") ?? "0", 10);

  if (remaining <= RATE_LIMIT_BUFFER && resetEpoch > 0) {
    const waitMs = resetEpoch * 1000 - Date.now() + 2000;
    if (waitMs > 0) {
      const waitSec = Math.ceil(waitMs / 1000);
      console.log(`  [rate-limit] remaining=${remaining} — ${waitSec}秒待機中...`);
      await sleep(waitMs);
    }
  }
}

/** リトライ付き fetch ラッパー */
export async function ghFetch(url, options = {}) {
  const { intervalMs = REQUEST_INTERVAL_MS, ...fetchOptions } = options;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let res;
    try {
      res = await fetch(url, {
        ...fetchOptions,
        headers: { ...BASE_HEADERS, ...fetchOptions.headers },
      });
    } catch (networkErr) {
      // ECONNRESET / ECONNREFUSED などネットワーク例外はリトライ
      if (attempt === MAX_RETRIES) throw networkErr;
      const waitSec = attempt * 5;
      console.log(`  [retry] network error (${networkErr.cause?.code ?? networkErr.message}) — ${waitSec}秒後にリトライ (${attempt}/${MAX_RETRIES})`);
      await sleep(waitSec * 1000);
      continue;
    }

    // 429/503 はレート制限チェックより先に処理（二重待機を防ぐ）
    if (res.status === 429 || res.status === 503) {
      if (attempt === MAX_RETRIES) break;
      const retryAfter = parseInt(res.headers.get("retry-after") ?? "60", 10);
      console.log(`  [retry] ${res.status} — ${retryAfter}秒後にリトライ (${attempt}/${MAX_RETRIES})`);
      await sleep(retryAfter * 1000);
      continue;
    }

    // 成功レスポンスのみ Primary rate limit を確認
    await handleRateLimit(res);
    await sleep(intervalMs);
    return res;
  }
  throw new Error(`${MAX_RETRIES}回リトライしても失敗しました: ${url}`);
}

/** GitHub API GET */
export async function apiGet(path, options = {}) {
  const res = await ghFetch(`https://api.github.com${path}`, options);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

/** GitHub API PUT（ファイル作成 / 更新） */
export async function apiPut(path, body) {
  const res = await ghFetch(`https://api.github.com${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

/** 全リポジトリ一覧を取得（ページネーション対応） */
export async function listAllRepos() {
  const repos = [];
  let page = 1;
  while (true) {
    const data = await apiGet(`/user/repos?per_page=100&page=${page}&type=owner`);
    if (!data || data.length === 0) break;
    repos.push(...data);
    if (data.length < 100) break;
    page++;
  }
  return repos;
}

/**
 * Code Search API でファイルを検索（ページネーション対応）
 * ※ 認証済みでも 10 req/min のため SEARCH_INTERVAL_MS を使用
 */
export async function searchCode(query) {
  const items = [];
  let page = 1;
  while (true) {
    const encoded = encodeURIComponent(query);
    const data = await apiGet(
      `/search/code?q=${encoded}&per_page=100&page=${page}`,
      { intervalMs: SEARCH_INTERVAL_MS }
    );
    if (!data || data.items.length === 0) break;
    items.push(...data.items);
    if (data.items.length < 100 || items.length >= data.total_count) break;
    page++;
  }
  return items;
}
