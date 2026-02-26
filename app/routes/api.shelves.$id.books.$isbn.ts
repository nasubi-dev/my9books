import type { Route } from './+types/api.shelves.$id.books.$isbn'

// PATCH /api/shelves/:id/books/:isbn - 感想・ネタバレ・順番を更新
// DELETE /api/shelves/:id/books/:isbn - 本を削除
export async function action({
  request: _request,
  params: _params,
}: Route.ActionArgs) {
  // TODO: 実装
  return Response.json({ ok: true })
}
