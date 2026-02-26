import type { BookSearchResult } from '../types/book'

const RAKUTEN_API_BASE
  = 'https://openapi.rakuten.co.jp/services/api/BooksBook/Search/20170404'

interface RakutenItem {
  isbn: string
  title: string
  author: string
  largeImageUrl: string
  mediumImageUrl: string
  smallImageUrl: string
}

interface RakutenResponse {
  Items?: RakutenItem[]
  error?: string
}

/**
 * 楽天ブックス API で書籍検索
 * - 利用規約によりキャッシュ禁止
 * - レート制限: 1req/秒
 */
export async function searchRakutenBooks(
  query: string,
): Promise<BookSearchResult[]> {
  const appId = process.env.RAKUTEN_APP_ID
  const accessKey = process.env.RAKUTEN_ACCESS_KEY
  if (!appId || !accessKey) {
    console.warn('RAKUTEN_APP_ID or RAKUTEN_ACCESS_KEY is not set')
    return []
  }

  const params = new URLSearchParams({
    applicationId: appId,
    accessKey,
    title: query,
    hits: '20',
    outOfStockFlag: '1',
    formatVersion: '2',
  })

  // 楽天 API は登録済みドメインの Referer / Origin が必要なため SITE_URL を使用
  const siteUrl = process.env.SITE_URL ?? 'https://my9books.nasubi.dev'
  const res = await fetch(`${RAKUTEN_API_BASE}?${params}`, {
    headers: {
      'User-Agent': 'my9books/1.0',
      'Referer': `${siteUrl}/`,
      'Origin': siteUrl,
    },
  })

  if (!res.ok) {
    console.warn(`Rakuten API error: ${res.status}`)
    return []
  }

  const data = (await res.json()) as RakutenResponse

  if (!data.Items)
    return []

  return data.Items.filter(item => item.isbn && item.isbn.length > 0).map(
    item => ({
      isbn: item.isbn.replace(/-/g, ''),
      title: item.title,
      author: item.author,
      coverUrl:
        item.largeImageUrl || item.mediumImageUrl || item.smallImageUrl || null,
      source: 'rakuten' as const,
    }),
  )
}
