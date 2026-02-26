import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'

function createDb(): ReturnType<typeof drizzle> {
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!url) {
    throw new Error('TURSO_DATABASE_URL is not set')
  }

  const client = createClient({
    url,
    authToken,
  })

  return drizzle(client, { schema })
}

// シングルトンとしてDB接続を管理
declare global {
  var __db: ReturnType<typeof createDb> | undefined // eslint-disable-line vars-on-top
}

export const db = globalThis.__db ?? createDb()

if (process.env.NODE_ENV !== 'production') {
  globalThis.__db = db
}
