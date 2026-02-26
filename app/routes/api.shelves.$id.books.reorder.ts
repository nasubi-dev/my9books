import type { Route } from './+types/api.shelves.$id.books.reorder'

// PATCH /api/shelves/:id/books/reorder - 並び順一括更新
export async function action({
  request: _request,
  params: _params,
}: Route.ActionArgs) {
  // TODO: 実装
  return Response.json({ ok: true })
}
