/**
 * book-meta-cache.ts
 *
 * サーバーサイドのインメモリキャッシュ（TTL付き）。
 * 楽天/Google Books API へのリクエスト数を削減するために使用。
 *
 * ⚠️ 剥がし方は docs/reports/20260228-book-meta-cache-removal.md を参照。
 */

import type { BookSearchResult } from '../types/book'

interface CacheEntry {
  data: BookSearchResult[]
  expiresAt: number
}

// TTL: 24時間（ミリ秒）
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

const cache = new Map<string, CacheEntry>()

/** キャッシュから取得。期限切れの場合は undefined を返す */
export function getCachedBookSearch(
  key: string,
): BookSearchResult[] | undefined {
  const entry = cache.get(key)
  if (!entry)
    return undefined
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return undefined
  }
  return entry.data
}

/** キャッシュに書き込む */
export function setCachedBookSearch(
  key: string,
  data: BookSearchResult[],
): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS })
}

/** キャッシュ全件クリア（テスト・デバッグ用） */
export function clearBookSearchCache(): void {
  cache.clear()
}

/** 現在のキャッシュサイズを返す */
export function getBookSearchCacheSize(): number {
  return cache.size
}

/**
 * 複数のキーを一括チェックし、ヒット済み / 未ヒットに分類する。
 * 外部APIは一切叩かない。
 */
export function getBatchCacheStatus(keys: string[]): {
  hits: Record<string, BookSearchResult[]>
  misses: string[]
} {
  const hits: Record<string, BookSearchResult[]> = {}
  const misses: string[] = []
  for (const key of keys) {
    const data = getCachedBookSearch(key)
    if (data)
      hits[key] = data
    else
      misses.push(key)
  }
  return { hits, misses }
}
