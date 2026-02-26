import type { Route } from './+types/api.shelves.$id.view'

// POST /api/shelves/:id/view - 閲覧数インクリメント
export async function action({ params: _params }: Route.ActionArgs) {
  // TODO: 実装
  return Response.json({ ok: true })
}
