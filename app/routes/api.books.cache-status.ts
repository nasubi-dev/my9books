import type { BookSearchResult } from '../types/book'
import type { Route } from './+types/api.books.cache-status'
import { getBatchCacheStatus } from '../lib/book-meta-cache'

// GET /api/books/cache-status?isbns=isbn1,isbn2,...
// 複数 ISBN のキャッシュ状態を一括チェック（外部 API は叩かない）
// レスポンス: { hits: { [isbn]: BookSearchResult }, misses: string[] }
export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const isbnsParam = url.searchParams.get('isbns')
  if (!isbnsParam)
    return Response.json({ hits: {}, misses: [] })

  const isbns = isbnsParam.split(',').filter(Boolean)
  const { hits: rawHits, misses } = getBatchCacheStatus(isbns)

  // hits: ISBN → 先頭マッチの BookSearchResult に変換
  const hits: Record<string, BookSearchResult> = {}
  for (const [isbn, results] of Object.entries(rawHits)) {
    const found = results.find(b => b.isbn === isbn) ?? results[0] ?? null
    if (found)
      hits[isbn] = found
    else
      misses.push(isbn)
  }

  return Response.json({ hits, misses })
}
