import type { Route } from './+types/clerk-proxy.$'

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const clerkUrl =
    `https://clerk.nasubi.dev${url.pathname.replace('/clerk-proxy', '')}${url.search}`

  const headers = new Headers(request.headers)
  headers.delete('host')

  const response = await fetch(clerkUrl, {
    method: request.method,
    headers,
  })

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  })
}
