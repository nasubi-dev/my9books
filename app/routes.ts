import type { RouteConfig } from '@react-router/dev/routes'
import { index, route } from '@react-router/dev/routes'

export default [
  // トップ
  index('routes/home.tsx'),

  // 認証（Clerk）
  route('sign-in/*', 'routes/sign-in.tsx'),
  route('sign-up/*', 'routes/sign-up.tsx'),

  // Shelf
  route('shelf/new', 'routes/shelf.new.tsx'),
  route('shelf/:id', 'routes/shelf.$id.tsx'),
  route('shelf/:id/edit', 'routes/shelf.$id.edit.tsx'),

  // ユーザー
  route('me', 'routes/me.tsx'),
  route('users/:userId', 'routes/users.$userId.tsx'),

  // API Routes
  route('api/books/search', 'routes/api.books.search.ts'),
  route('api/shelves', 'routes/api.shelves.ts'),
  route('api/shelves/:id', 'routes/api.shelves.$id.ts'),
  route('api/shelves/:id/view', 'routes/api.shelves.$id.view.ts'),
  route('api/shelves/:id/books', 'routes/api.shelves.$id.books.ts'),
  route('api/shelves/:id/books/:isbn', 'routes/api.shelves.$id.books.$isbn.ts'),
  route(
    'api/shelves/:id/books/reorder',
    'routes/api.shelves.$id.books.reorder.ts',
  ),
  route('api/users/:userId/shelves', 'routes/api.users.$userId.shelves.ts'),
  route('api/og-default', 'routes/api.og.default.tsx'),
  route('api/webhooks/clerk', 'routes/api.webhooks.clerk.ts'),
] satisfies RouteConfig
