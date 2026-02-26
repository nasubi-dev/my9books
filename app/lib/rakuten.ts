import type { BookSearchResult } from '../types/book'

const RAKUTEN_API_BASE = 'https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404'

interface RakutenItem {
  isbn: string
  title: string
  author: string
  largeImageUrl: string
  mediumImageUrl: string
  smallImageUrl: string
}

interface RakutenResponse {
  Items?: { Item: RakutenItem }[]
  error?: string
}

/**
 * 楽天ブックス API で書籍検索
 * - 利用規約によりキャッシュ禁止
 * - レート制限: 1req/秒
 */
export async function searchRakutenBooks(query: string): Promise<BookSearchResult[]> {
  const appId = process.env.RAKUTEN_APP_ID
  if (!appId) {
    console.warn('RAKUTEN_APP_ID is not set')
    return []
  }

  const params = new URLSearchParams({
    applicationId: appId,
    title: query,
    hits: '20',
    outOfStockFlag: '1',
    formatVersion: '2',
  })

  const res = await fetch(`${RAKUTEN_API_BASE}?${params}`, {
    headers: { 'User-Agent': 'my9books/1.0' },
  })

  if (!res.ok) {
    console.warn(`Rakuten API error: ${res.status}`)
    return []
  }

  const data = await res.json() as RakutenResponse

  if (!data.Items)
    return []

  return data.Items
    .filter(({ Item }) => Item.isbn && Item.isbn.length > 0)
    .map(({ Item }) => ({
      isbn: Item.isbn.replace(/-/g, ''),
      title: Item.title,
      author: Item.author,
      // smallImageUrl の "64×" を "200×" に差し替えて大きい画像を取得
      coverUrl: Item.largeImageUrl || Item.mediumImageUrl || Item.smallImageUrl || null,
      source: 'rakuten' as const,
    }))
}
