import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

// ユーザーテーブル（Clerk の userId をそのまま使用）
export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // Clerk userId (user_xxxxx)
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
})

// shelf テーブル（9冊まとめ）
export const shelves = sqliteTable('shelves', {
  id: text('id').primaryKey(), // UUID
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  viewCount: integer('view_count').notNull().default(0),
  likesCount: integer('likes_count').notNull().default(0),
  bookmarksCount: integer('bookmarks_count').notNull().default(0),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
})

// 書籍マスタ
export const books = sqliteTable('books', {
  isbn: text('isbn').primaryKey(),
  coverUrl: text('cover_url'), // 書影URL（楽天/Google Books 由来）※表示用のみ・再配布不可
  amazonAffiliateUrl: text('amazon_affiliate_url'),
  rakutenAffiliateUrl: text('rakuten_affiliate_url'),
})

// shelf ↔ book 中間テーブル
export const shelfBooks = sqliteTable('shelf_books', {
  id: text('id').primaryKey(), // UUID
  shelfId: text('shelf_id')
    .notNull()
    .references(() => shelves.id, { onDelete: 'cascade' }),
  isbn: text('isbn')
    .notNull()
    .references(() => books.isbn, { onDelete: 'cascade' }),
  position: integer('position').notNull(), // 1〜9
  review: text('review'), // 感想・紹介文
  isSpoiler: integer('is_spoiler').notNull().default(0), // 0/1
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
})

// shelf いいね
export const userShelfLikes = sqliteTable('user_shelf_likes', {
  id: text('id').primaryKey(), // UUID
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  shelfId: text('shelf_id')
    .notNull()
    .references(() => shelves.id, { onDelete: 'cascade' }),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
})

// shelf ブックマーク
export const userShelfBookmarks = sqliteTable('user_shelf_bookmarks', {
  id: text('id').primaryKey(), // UUID
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  shelfId: text('shelf_id')
    .notNull()
    .references(() => shelves.id, { onDelete: 'cascade' }),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
})

// 本ブックマーク
export const userBookBookmarks = sqliteTable('user_book_bookmarks', {
  id: text('id').primaryKey(), // UUID
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  isbn: text('isbn')
    .notNull()
    .references(() => books.isbn, { onDelete: 'cascade' }),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
})

// 型エクスポート
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Shelf = typeof shelves.$inferSelect
export type NewShelf = typeof shelves.$inferInsert
export type Book = typeof books.$inferSelect
export type NewBook = typeof books.$inferInsert
export type ShelfBook = typeof shelfBooks.$inferSelect
export type NewShelfBook = typeof shelfBooks.$inferInsert
export type UserShelfLike = typeof userShelfLikes.$inferSelect
export type UserShelfBookmark = typeof userShelfBookmarks.$inferSelect
export type UserBookBookmark = typeof userBookBookmarks.$inferSelect
