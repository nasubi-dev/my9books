import type { Route } from './+types/api.users.$userId.shelves'

// GET /api/users/:userId/shelves
export async function loader({ params: _params }: Route.LoaderArgs) {
  // TODO: 実装
  return Response.json({ shelves: [] })
}
