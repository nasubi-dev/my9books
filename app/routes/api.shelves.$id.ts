import type { LoaderFunctionArgs } from 'react-router'
import type { Route } from './+types/api.shelves.$id'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { books, shelfBooks, shelves } from '../db/schema'
import { requireAuthApi } from '../lib/auth.server'

// GET /api/shelves/:id
export async function loader({ params }: Route.LoaderArgs) {
  const { id } = params

  const [shelf] = await db
    .select()
    .from(shelves)
    .where(eq(shelves.id, id))
    .limit(1)
  if (!shelf)
    return Response.json({ error: 'not found' }, { status: 404 })

  const rows = await db
    .select({
      isbn: shelfBooks.isbn,
      position: shelfBooks.position,
      review: shelfBooks.review,
      isSpoiler: shelfBooks.isSpoiler,
      amazonAffiliateUrl: books.amazonAffiliateUrl,
      rakutenAffiliateUrl: books.rakutenAffiliateUrl,
    })
    .from(shelfBooks)
    .leftJoin(books, eq(shelfBooks.isbn, books.isbn))
    .where(eq(shelfBooks.shelfId, id))
    .orderBy(shelfBooks.position)

  return Response.json({ shelf: { ...shelf, books: rows } })
}

// PATCH /api/shelves/:id - shelf名変更
// DELETE /api/shelves/:id - shelf削除
export async function action(args: Route.ActionArgs) {
  const { userId } = await requireAuthApi(
    args as unknown as LoaderFunctionArgs,
  )
  const { id } = args.params
  const method = args.request.method.toUpperCase()

  // オーナーチェック
  const [shelf] = await db
    .select()
    .from(shelves)
    .where(eq(shelves.id, id))
    .limit(1)
  if (!shelf)
    return Response.json({ error: 'not found' }, { status: 404 })
  if (shelf.userId !== userId)
    return Response.json({ error: 'forbidden' }, { status: 403 })

  if (method === 'PATCH') {
    const body = (await args.request.json()) as { name?: string }
    const name = body.name?.trim()
    if (!name)
      return Response.json({ error: 'name is required' }, { status: 400 })

    const updatedAt = new Date()
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '')
    await db.update(shelves).set({ name, updatedAt }).where(eq(shelves.id, id))
    return Response.json({ shelf: { ...shelf, name, updatedAt } })
  }

  if (method === 'DELETE') {
    await db.delete(shelves).where(eq(shelves.id, id))
    return Response.json({ ok: true })
  }

  return Response.json({ error: 'method not allowed' }, { status: 405 })
}
