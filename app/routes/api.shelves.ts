import type { Route } from './+types/api.shelves'

// POST /api/shelves - shelf 新規作成（認証必須）
export async function action({ request: _request }: Route.ActionArgs) {
  // TODO: 実装
  return Response.json({ shelf: null }, { status: 201 })
}
