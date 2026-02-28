import type { LoaderFunctionArgs } from 'react-router'
import { asc, desc, inArray, sql } from 'drizzle-orm'
import { db } from '../db'
import { shelfBooks, shelves } from '../db/schema'

const LIMIT = 20

// ─── Types ───────────────────────────────────────────────────

export interface FeedShelfRow {
  id: string
  name: string
  userId: string
  likesCount: number
  bookmarksCount: number
  viewCount: number
  createdAt: string
  isbns: string[]
}

// ─── Loader ──────────────────────────────────────────────────

// GET /api/feed?sort=latest|bookmarks|random&offset=0
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const sort = url.searchParams.get('sort') ?? 'latest'
  const offset = Number(url.searchParams.get('offset') ?? '0')

  const sel = db
    .select({
      id: shelves.id,
      name: shelves.name,
      userId: shelves.userId,
      likesCount: shelves.likesCount,
      bookmarksCount: shelves.bookmarksCount,
      viewCount: shelves.viewCount,
      createdAt: shelves.createdAt,
    })
    .from(shelves)

  const order
    = sort === 'bookmarks'
      ? desc(shelves.bookmarksCount)
      : sort === 'random'
        ? sql`RANDOM()`
        : desc(shelves.createdAt)

  const rows = await sel
    .orderBy(order)
    .limit(LIMIT + 1)
    .offset(offset)

  const hasMore = rows.length > LIMIT
  const pageRows = rows.slice(0, LIMIT)

  if (pageRows.length === 0) {
    return Response.json({ shelves: [] as FeedShelfRow[], hasMore: false })
  }

  // 各棚の ISBN を最大9件取得
  const allBooks = await db
    .select({ shelfId: shelfBooks.shelfId, isbn: shelfBooks.isbn })
    .from(shelfBooks)
    .where(
      inArray(
        shelfBooks.shelfId,
        pageRows.map(r => r.id),
      ),
    )
    .orderBy(asc(shelfBooks.position))

  const isbnMap: Record<string, string[]> = {}
  for (const b of allBooks) {
    if (!isbnMap[b.shelfId])
      isbnMap[b.shelfId] = []
    if (isbnMap[b.shelfId].length < 9)
      isbnMap[b.shelfId].push(b.isbn)
  }

  const result: FeedShelfRow[] = pageRows.map(r => ({
    ...r,
    isbns: isbnMap[r.id] ?? [],
  }))

  return Response.json({ shelves: result, hasMore })
}
