import type { Route } from './+types/api.shelves.$id.books'

// POST /api/shelves/:id/books - 本を追加（最大9冊）
export async function action({
  request: _request,
  params: _params,
}: Route.ActionArgs) {
  // TODO: 実装
  return Response.json({ ok: true }, { status: 201 })
}
