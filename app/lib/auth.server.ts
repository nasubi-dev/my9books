import type { LoaderFunctionArgs } from 'react-router'
import { getAuth } from '@clerk/react-router/ssr.server'
import { redirect } from 'react-router'

/**
 * loader 内で認証チェックを行うユーティリティ
 * 未ログインの場合は /sign-in にリダイレクト
 *
 * @example
 * export async function loader(args: Route.LoaderArgs) {
 *   const { userId } = await requireAuth(args)
 * }
 */
export async function requireAuth(
  args: LoaderFunctionArgs,
): Promise<{ userId: string }> {
  const auth = await getAuth(args)
  // Clerk の auth オブジェクトはユニオン型のため型アサーションで取り出す
  const userId = (auth as { userId?: string | null }).userId ?? null
  if (!userId) {
    throw redirect('/sign-in')
  }
  return { userId }
}

/**
 * API route の action 内で認証チェックを行うユーティリティ
 * 未ログインの場合は 401 を返す
 *
 * @example
 * export async function action(args: Route.ActionArgs) {
 *   const { userId } = await requireAuthApi(args)
 * }
 */
export async function requireAuthApi(
  args: LoaderFunctionArgs,
): Promise<{ userId: string }> {
  const auth = await getAuth(args)
  const userId = (auth as { userId?: string | null }).userId ?? null
  if (!userId) {
    throw Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return { userId }
}
