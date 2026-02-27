import type { LoaderFunctionArgs } from 'react-router'
import type { Route } from './+types/api.books.$isbn.bookmarks'
import { and, eq } from 'drizzle-orm'
import { db } from '../db'
import { books, userBookBookmarks } from '../db/schema'
import { requireAuthApi } from '../lib/auth.server'

// POST   /api/books/:isbn/bookmarks  → 本ブックマーク追加
// DELETE /api/books/:isbn/bookmarks  → 本ブックマーク解除
export async function action(args: Route.ActionArgs) {
  const { userId } = await requireAuthApi(
    args as unknown as LoaderFunctionArgs,
  )
  const { isbn } = args.params
  const method = args.request.method.toUpperCase()

  if (method === 'POST') {
    // books テーブルに isbn が存在しない場合は insert（upsert）
    await db
      .insert(books)
      .values({ isbn })
      .onConflictDoNothing()

    // 重複チェック
    const [existing] = await db
      .select({ id: userBookBookmarks.id })
      .from(userBookBookmarks)
      .where(
        and(
          eq(userBookBookmarks.userId, userId),
          eq(userBookBookmarks.isbn, isbn),
        ),
      )
      .limit(1)
    if (existing)
      return Response.json({ bookmarked: true })

    await db.insert(userBookBookmarks).values({
      id: crypto.randomUUID(),
      userId,
      isbn,
    })

    return Response.json({ bookmarked: true })
  }

  if (method === 'DELETE') {
    await db
      .delete(userBookBookmarks)
      .where(
        and(
          eq(userBookBookmarks.userId, userId),
          eq(userBookBookmarks.isbn, isbn),
        ),
      )

    return Response.json({ bookmarked: false })
  }

  return Response.json({ error: 'method not allowed' }, { status: 405 })
}
