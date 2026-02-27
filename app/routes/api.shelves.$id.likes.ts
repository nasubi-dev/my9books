import type { LoaderFunctionArgs } from 'react-router'
import type { Route } from './+types/api.shelves.$id.likes'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '../db'
import { shelves, userShelfLikes } from '../db/schema'
import { requireAuthApi } from '../lib/auth.server'

// POST   /api/shelves/:id/likes  → いいね追加
// DELETE /api/shelves/:id/likes  → いいね解除
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
      .select({ id: userShelfLikes.id })
      .from(userShelfLikes)
      .where(
        and(
          eq(userShelfLikes.userId, userId),
          eq(userShelfLikes.shelfId, shelfId),
        ),
      )
      .limit(1)
    if (existing)
      return Response.json({ liked: true })

    await db.insert(userShelfLikes).values({
      id: crypto.randomUUID(),
      userId,
      shelfId,
    })
    await db
      .update(shelves)
      .set({ likesCount: sql`${shelves.likesCount} + 1` })
      .where(eq(shelves.id, shelfId))

    return Response.json({ liked: true })
  }

  if (method === 'DELETE') {
    await db
      .delete(userShelfLikes)
      .where(
        and(
          eq(userShelfLikes.userId, userId),
          eq(userShelfLikes.shelfId, shelfId),
        ),
      )
    // likes_count は 0 未満にならないよう clamp
    await db
      .update(shelves)
      .set({
        likesCount: sql`MAX(0, ${shelves.likesCount} - 1)`,
      })
      .where(eq(shelves.id, shelfId))

    return Response.json({ liked: false })
  }

  return Response.json({ error: 'method not allowed' }, { status: 405 })
}
