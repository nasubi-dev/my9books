import type { LoaderFunctionArgs } from 'react-router'
import type { Route } from './+types/api.shelves'
import { getAuth } from '@clerk/react-router/server'
import { db } from '../db'
import { shelves, users } from '../db/schema'
import { requireAuthApi } from '../lib/auth.server'

// POST /api/shelves - shelf 新規作成（認証必須）
export async function action(args: Route.ActionArgs) {
  const { userId } = await requireAuthApi(
    args as unknown as LoaderFunctionArgs,
  )

  const body = (await args.request.json()) as { name?: string }
  const name = body.name?.trim()
  if (!name)
    return Response.json({ error: 'name is required' }, { status: 400 })

  // Webhook 未設定などで users テーブルに未登録の場合は upsert
  const clerkAuth = await getAuth(args as unknown as LoaderFunctionArgs)
  const displayName
    = (clerkAuth as { sessionClaims?: { name?: string } }).sessionClaims?.name
      ?? userId
  await db
    .insert(users)
    .values({ id: userId, displayName })
    .onConflictDoNothing()

  const id = crypto.randomUUID()
  const now = new Date().toISOString().replace('T', ' ').replace('Z', '')

  await db
    .insert(shelves)
    .values({ id, userId, name, createdAt: now, updatedAt: now })

  return Response.json(
    {
      shelf: {
        id,
        userId,
        name,
        viewCount: 0,
        likesCount: 0,
        createdAt: now,
        updatedAt: now,
      },
    },
    { status: 201 },
  )
}
