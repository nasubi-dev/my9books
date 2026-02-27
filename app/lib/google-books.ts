import type { BookSearchResult } from '../types/book'

const GOOGLE_BOOKS_API_BASE = 'https://www.googleapis.com/books/v1/volumes'

interface GoogleVolumeInfo {
  title?: string
  authors?: string[]
  industryIdentifiers?: { type: string, identifier: string }[]
  imageLinks?: {
    thumbnail?: string
    smallThumbnail?: string
  }
}

interface GoogleVolume {
  id: string
  volumeInfo: GoogleVolumeInfo
}

interface GoogleBooksResponse {
  totalItems?: number
  items?: GoogleVolume[]
}

/** ISBN-13 を優先、なければ ISBN-10 を返す */
function extractIsbn(identifiers?: GoogleVolumeInfo['industryIdentifiers']): string | null {
  if (!identifiers)
    return null
  const isbn13 = identifiers.find(i => i.type === 'ISBN_13')
  if (isbn13)
    return isbn13.identifier.replace(/-/g, '')
  const isbn10 = identifiers.find(i => i.type === 'ISBN_10')
  if (isbn10)
    return isbn10.identifier.replace(/-/g, '')
  return null
}

/**
 * Google Books API で書籍検索
 * - DB への永続保存は不可
 * - 無料枠: 1,000req/日
 */
export async function searchGoogleBooks(query: string): Promise<BookSearchResult[]> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY
  if (!apiKey) {
    console.warn('GOOGLE_BOOKS_API_KEY is not set')
    return []
  }

  // ISBN（10桁または13桁の数字）の場合は isbn: プレフィックスで完全一致検索
  const isIsbn = /^\d{10}(?:\d{3})?$/.test(query.replace(/-/g, ''))
  const q = isIsbn ? `isbn:${query.replace(/-/g, '')}` : query

  const params = new URLSearchParams({
    q,
    maxResults: '20',
    printType: 'books',
    key: apiKey,
  })

  const res = await fetch(`${GOOGLE_BOOKS_API_BASE}?${params}`)

  if (!res.ok) {
    console.warn(`Google Books API error: ${res.status}`)
    return []
  }

  const data = await res.json() as GoogleBooksResponse

  if (!data.items)
    return []

  const results: BookSearchResult[] = []

  for (const volume of data.items) {
    const isbn = extractIsbn(volume.volumeInfo.industryIdentifiers)
    if (!isbn)
      continue

    const thumbnail = volume.volumeInfo.imageLinks?.thumbnail
      ?? volume.volumeInfo.imageLinks?.smallThumbnail
      ?? null
    // HTTP → HTTPS に強制
    const coverUrl = thumbnail ? thumbnail.replace(/^http:/, 'https:') : null

    results.push({
      isbn,
      title: volume.volumeInfo.title ?? '',
      author: volume.volumeInfo.authors?.join(', ') ?? '',
      coverUrl,
      source: 'google',
    })
  }

  return results
}
