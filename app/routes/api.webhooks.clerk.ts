import type { Route } from './+types/api.webhooks.clerk'

// POST /api/webhooks/clerk
// Clerk の user.created イベントを受け取り Turso の users テーブルに insert
// TODO: Svix を使って署名検証を追加する
export async function action({ request }: Route.ActionArgs) {
  const payload = await request.json()

  if (payload.type === 'user.created') {
    const {
      id,
      first_name: _firstName,
      last_name: _lastName,
      image_url: _imageUrl,
    } = payload.data
    // TODO: Turso の users テーブルに insert
    // await db.insert(users).values({ id, displayName: `${_firstName} ${_lastName}`, avatarUrl: _imageUrl });
    console.warn('New user created:', id)
  }

  return Response.json({ ok: true })
}
