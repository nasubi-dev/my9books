import type { LoaderFunctionArgs } from 'react-router'
import type { Route } from './+types/api.shelves.$id.books'
import { count, eq } from 'drizzle-orm'
import { db } from '../db'
import { books, shelfBooks, shelves } from '../db/schema'
import { requireAuthApi } from '../lib/auth.server'

// POST /api/shelves/:id/books - 本を追加（最大9冊）
export async function action(args: Route.ActionArgs) {
  const { userId } = await requireAuthApi(
    args as unknown as LoaderFunctionArgs,
  )
  const { id } = args.params

  const [shelf] = await db
    .select()
    .from(shelves)
    .where(eq(shelves.id, id))
    .limit(1)
  if (!shelf)
    return Response.json({ error: 'not found' }, { status: 404 })
  if (shelf.userId !== userId)
    return Response.json({ error: 'forbidden' }, { status: 403 })

  const body = (await args.request.json()) as {
    isbn?: string
    coverUrl?: string | null
    rakutenAffiliateUrl?: string
  }
  const { isbn, coverUrl, rakutenAffiliateUrl } = body
  if (!isbn)
    return Response.json({ error: 'isbn is required' }, { status: 400 })

  // 最大9冊チェック
  const [{ value: bookCount }] = await db
    .select({ value: count() })
    .from(shelfBooks)
    .where(eq(shelfBooks.shelfId, id))
  if (bookCount >= 9) {
    return Response.json(
      { error: 'shelf is full (max 9 books)' },
      { status: 400 },
    )
  }

  // books テーブルに isbn を upsert
  await db
    .insert(books)
    .values({
      isbn,
      coverUrl: coverUrl ?? null,
      rakutenAffiliateUrl: rakutenAffiliateUrl ?? null,
    })
    .onConflictDoUpdate({
      target: books.isbn,
      set: {
        coverUrl: coverUrl ?? null,
        rakutenAffiliateUrl: rakutenAffiliateUrl ?? null,
      },
    })

  const position = bookCount + 1
  const now = new Date().toISOString().replace('T', ' ').replace('Z', '')
  await db.insert(shelfBooks).values({
    id: crypto.randomUUID(),
    shelfId: id,
    isbn,
    position,
    createdAt: now,
  })

  return Response.json({ ok: true, isbn, position }, { status: 201 })
}
