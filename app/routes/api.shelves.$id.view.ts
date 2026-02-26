import type { Route } from './+types/api.shelves.$id.view'
import { eq, sql } from 'drizzle-orm'
import { db } from '../db'
import { shelves } from '../db/schema'

// POST /api/shelves/:id/view - 閲覧数インクリメント
export async function action({ params }: Route.ActionArgs) {
  const { id } = params
  await db
    .update(shelves)
    .set({ viewCount: sql`${shelves.viewCount} + 1` })
    .where(eq(shelves.id, id))
  return Response.json({ ok: true })
}
