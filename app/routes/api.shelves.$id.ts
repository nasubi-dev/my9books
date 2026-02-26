import type { Route } from './+types/api.shelves.$id'

// GET /api/shelves/:id
export async function loader({ params: _params }: Route.LoaderArgs) {
  // TODO: 実装
  return Response.json({ shelf: null })
}

// PATCH /api/shelves/:id - shelf名変更
// DELETE /api/shelves/:id - shelf削除
export async function action({
  request: _request,
  params: _params,
}: Route.ActionArgs) {
  // TODO: 実装
  return Response.json({ ok: true })
}
