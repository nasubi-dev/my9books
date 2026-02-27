/**
 * Phase 12 DB マイグレーション
 * - shelves.bookmarks_count カラム追加
 * - user_shelf_likes テーブル作成
 * - user_shelf_bookmarks テーブル確認・作成
 * - user_book_bookmarks テーブル確認・作成
 */
import { createClient } from '@libsql/client'

// Bun は .env を自動読み込みするので process.env で参照可能
const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN

if (!url) {
  throw new Error('TURSO_DATABASE_URL is not set')
}

const client = createClient({ url, authToken })

const migrations = [
  // shelves に bookmarks_count を追加（存在しない場合のみ）
  `ALTER TABLE shelves ADD COLUMN bookmarks_count INTEGER NOT NULL DEFAULT 0`,

  // user_shelf_likes テーブル作成
  `CREATE TABLE IF NOT EXISTS user_shelf_likes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shelf_id TEXT NOT NULL REFERENCES shelves(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // user_shelf_bookmarks テーブル確認・作成
  `CREATE TABLE IF NOT EXISTS user_shelf_bookmarks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shelf_id TEXT NOT NULL REFERENCES shelves(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // user_book_bookmarks テーブル確認・作成
  `CREATE TABLE IF NOT EXISTS user_book_bookmarks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    isbn TEXT NOT NULL REFERENCES books(isbn) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
]

for (const sql of migrations) {
  const label = sql.split('\n')[0].slice(0, 60)
  try {
    await client.execute(sql)
    console.log(`✅ ${label}`)
  }
  catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    // カラムが既に存在する場合はスキップ
    if (msg.includes('duplicate column') || msg.includes('already exists')) {
      console.log(`⏭  already exists: ${label}`)
    }
    else {
      console.error(`❌ ${label}`)
      console.error(msg)
    }
  }
}

console.log('\n✅ Migration complete')
