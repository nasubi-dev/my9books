import type { LoaderFunctionArgs } from 'react-router'
import type { Route } from './+types/api.shelves.$id.bookmarks'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '../db'
import { shelves, userShelfBookmarks } from '../db/schema'
import { requireAuthApi } from '../lib/auth.server'

// POST   /api/shelves/:id/bookmarks  → ブックマーク追加
// DELETE /api/shelves/:id/bookmarks  → ブックマーク解除
export async function action(args: Route.ActionArgs) {
  const { userId } = await requireAuthApi(
    args as unknown as LoaderFunctionArgs,
  )
  const { id: shelfId } = args.params
  const method = args.request.method.toUpperCase()

  // shelf 存在確認
  const [shelf] = await db
    .select({ id: shelves.id })
    .from(shelves)
    .where(eq(shelves.id, shelfId))
    .limit(1)
  if (!shelf)
    return Response.json({ error: 'not found' }, { status: 404 })

  if (method === 'POST') {
    // 重複チェック
    const [existing] = await db
      .select({ id: userShelfBookmarks.id })
      .from(userShelfBookmarks)
      .where(
        and(
          eq(userShelfBookmarks.userId, userId),
          eq(userShelfBookmarks.shelfId, shelfId),
        ),
      )
      .limit(1)
    if (existing)
      return Response.json({ bookmarked: true })

    await db.insert(userShelfBookmarks).values({
      id: crypto.randomUUID(),
      userId,
      shelfId,
    })
    await db
      .update(shelves)
      .set({ bookmarksCount: sql`${shelves.bookmarksCount} + 1` })
      .where(eq(shelves.id, shelfId))

    return Response.json({ bookmarked: true })
  }

  if (method === 'DELETE') {
    await db
      .delete(userShelfBookmarks)
      .where(
        and(
          eq(userShelfBookmarks.userId, userId),
          eq(userShelfBookmarks.shelfId, shelfId),
        ),
      )
    await db
      .update(shelves)
      .set({
        bookmarksCount: sql`MAX(0, ${shelves.bookmarksCount} - 1)`,
      })
      .where(eq(shelves.id, shelfId))

    return Response.json({ bookmarked: false })
  }

  return Response.json({ error: 'method not allowed' }, { status: 405 })
}
