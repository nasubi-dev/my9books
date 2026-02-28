import type { BookSearchResult } from '../types/book'
import type { Route } from './+types/api.books.search'
import {
  getCachedBookSearch,
  setCachedBookSearch,
} from '../lib/book-meta-cache'
import { searchGoogleBooks } from '../lib/google-books'
import { searchRakutenBooks } from '../lib/rakuten'

// GET /api/books/search?q={query}
// 楽天ブックス + Google Books を並列検索し、ISBN で重複排除（楽天優先）
// ⚠️ サーバーサイドインメモリキャッシュ（TTL 24h）を使用してリクエスト数を削減
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const q = url.searchParams.get('q')
  if (!q)
    return Response.json({ error: 'query is required' }, { status: 400 })

  // キャッシュヒット時はそのまま返す（BOOK_META_CACHE_ENABLED=false で無効化可能）
  const cacheEnabled = process.env.BOOK_META_CACHE_ENABLED !== 'false'
  if (cacheEnabled) {
    const cached = getCachedBookSearch(q)
    if (cached)
      return Response.json({ books: cached, cached: true })
  }

  const [rakutenResult, googleResult] = await Promise.allSettled([
    searchRakutenBooks(q),
    searchGoogleBooks(q),
  ])

  const rakutenBooks: BookSearchResult[]
    = rakutenResult.status === 'fulfilled' ? rakutenResult.value : []
  const googleBooks: BookSearchResult[]
    = googleResult.status === 'fulfilled' ? googleResult.value : []

  // ISBN をキーに重複排除（楽天優先）
  const seen = new Set<string>()
  const books: BookSearchResult[] = []

  for (const book of rakutenBooks) {
    if (!seen.has(book.isbn)) {
      seen.add(book.isbn)
      books.push(book)
    }
  }
  for (const book of googleBooks) {
    if (!seen.has(book.isbn)) {
      seen.add(book.isbn)
      books.push(book)
    }
  }

  // 書影ありの結果が1件以上ある場合のみキャッシュする
  // （空結果・coverUrl が全て null の場合はキャッシュしない → 次回リクエストで再取得）
  if (
    cacheEnabled
    && books.length > 0
    && books.some(b => b.coverUrl !== null)
  ) {
    setCachedBookSearch(q, books)
  }

  return Response.json({ books })
}
