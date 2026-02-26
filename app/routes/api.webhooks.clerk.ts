import type { Route } from './+types/api.webhooks.clerk'
import { eq } from 'drizzle-orm'
import { Webhook } from 'svix'
import { db } from '../db/index'
import { users } from '../db/schema'

// POST /api/webhooks/clerk
// Clerk の user.created / user.updated イベントを受け取り Turso の users テーブルに同期
export async function action({ request }: Route.ActionArgs) {
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) {
    return Response.json(
      { error: 'CLERK_WEBHOOK_SECRET is not set' },
      { status: 500 },
    )
  }

  // Svix による署名検証
  const svixId = request.headers.get('svix-id')
  const svixTimestamp = request.headers.get('svix-timestamp')
  const svixSignature = request.headers.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return Response.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  const body = await request.text()
  const wh = new Webhook(secret)

  let payload: { type: string, data: Record<string, unknown> }
  try {
    payload = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as typeof payload
  }
  catch {
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const { type, data } = payload

  const firstName = typeof data.first_name === 'string' ? data.first_name : ''
  const lastName = typeof data.last_name === 'string' ? data.last_name : ''
  const displayName = `${firstName} ${lastName}`.trim() || 'ユーザー'
  const avatarUrl = typeof data.image_url === 'string' ? data.image_url : null
  const id = data.id as string

  if (type === 'user.created') {
    await db.insert(users).values({ id, displayName, avatarUrl })
  }

  if (type === 'user.updated') {
    await db
      .update(users)
      .set({ displayName, avatarUrl })
      .where(eq(users.id, id))
  }

  return Response.json({ ok: true })
}
