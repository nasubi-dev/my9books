import type { Route } from './+types/api.books.search'

// GET /api/books/search?q={query}
// 楽天ブックス + Google Books を並列検索
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const q = url.searchParams.get('q')
  if (!q)
    return Response.json({ error: 'query is required' }, { status: 400 })
  // TODO: 楽天 + Google Books 並列検索実装
  return Response.json({ books: [] })
}
