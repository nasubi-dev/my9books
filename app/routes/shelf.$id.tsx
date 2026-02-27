import type { JSX } from 'react'
import type { LoaderFunctionArgs } from 'react-router'
import type { Route } from './+types/shelf.$id'
import { getAuth } from '@clerk/react-router/ssr.server'
import { eq, sql } from 'drizzle-orm'
import { useEffect, useState } from 'react'
import { data, useLoaderData } from 'react-router'
import { db } from '../db'
import { books, shelfBooks, shelves } from '../db/schema'

// ─── 型定義 ───────────────────────────────────────────────────

interface ShelfBookRow {
  isbn: string
  position: number
  review: string | null
  isSpoiler: number
  rakutenAffiliateUrl: string | null
  amazonAffiliateUrl: string | null
}

interface BookMeta {
  title: string
  author: string
  coverUrl: string | null
}

// ─── Loader ──────────────────────────────────────────────────

export async function loader(args: Route.LoaderArgs) {
  const { id } = args.params

  const [shelf] = await db.select().from(shelves).where(eq(shelves.id, id)).limit(1)
  if (!shelf)
    throw data({ error: 'not found' }, { status: 404 })

  const rows: ShelfBookRow[] = await db
    .select({
      isbn: shelfBooks.isbn,
      position: shelfBooks.position,
      review: shelfBooks.review,
      isSpoiler: shelfBooks.isSpoiler,
      rakutenAffiliateUrl: books.rakutenAffiliateUrl,
      amazonAffiliateUrl: books.amazonAffiliateUrl,
    })
    .from(shelfBooks)
    .leftJoin(books, eq(shelfBooks.isbn, books.isbn))
    .where(eq(shelfBooks.shelfId, id))
    .orderBy(shelfBooks.position)

  // 作者自身のアクセスは閲覧数をカウントしない
  const auth = await getAuth(args as unknown as LoaderFunctionArgs)
  const viewerId = (auth as { userId?: string | null }).userId ?? null
  if (viewerId !== shelf.userId) {
    db.update(shelves)
      .set({ viewCount: sql`${shelves.viewCount} + 1` })
      .where(eq(shelves.id, id))
      .catch(() => {})
  }

  return { shelf: { ...shelf, books: rows }, shelfUrl: args.request.url }
}

// ─── スケルトン ───────────────────────────────────────────────

function BookSkeleton(): JSX.Element {
  return (
    <div className="aspect-[2/3] rounded-[var(--radius-md)] bg-[var(--color-sunken)] animate-pulse" />
  )
}

// ─── 書籍カード ───────────────────────────────────────────────

interface BookCardProps {
  book: ShelfBookRow
  meta: BookMeta | null
  loading: boolean
  onClick: () => void
}

function BookCard({ book, meta, loading, onClick }: BookCardProps): JSX.Element {
  const [spoilerRevealed, setSpoilerRevealed] = useState(false)
  const isSpoiler = book.isSpoiler === 1 && !spoilerRevealed

  if (loading || !meta) {
    return <BookSkeleton />
  }

  return (
    <div className="relative group">
      <button
        type="button"
        className="card-hoverable w-full aspect-[2/3] overflow-hidden p-0 block"
        onClick={() => {
          if (isSpoiler) {
            setSpoilerRevealed(true)
          }
          else {
            onClick()
          }
        }}
      >
        {meta.coverUrl
          ? (
              <img
                src={meta.coverUrl}
                alt={meta.title}
                className={[
                  'w-full h-full object-cover transition-all duration-300',
                  isSpoiler ? 'blur-xl scale-110' : '',
                ].join(' ')}
              />
            )
          : (
              <div className="w-full h-full flex items-center justify-center bg-[var(--color-sunken)] p-3">
                <span className="text-[var(--color-text-tertiary)] text-xs text-center leading-snug line-clamp-4">
                  {meta.title}
                </span>
              </div>
            )}

        {isSpoiler && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2">
            <span className="badge">ネタバレ</span>
            <span className="text-[10px] text-[var(--color-text-secondary)] mt-1">
              タップで表示
            </span>
          </div>
        )}
      </button>
    </div>
  )
}

// ─── モーダル ─────────────────────────────────────────────────

interface ModalProps {
  book: ShelfBookRow
  meta: BookMeta
  onClose: () => void
}

function BookModal({ book, meta, onClose }: ModalProps): JSX.Element {
  // ESC キーで閉じる
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape')
        onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="overlay-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="modal w-full max-w-sm p-6 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        {/* 表紙 + 書籍情報 */}
        <div className="flex gap-4">
          {meta.coverUrl && (
            <img
              src={meta.coverUrl}
              alt={meta.title}
              className="w-20 rounded-[var(--radius-sm)] flex-shrink-0 object-cover shadow-sm"
            />
          )}
          <div className="flex flex-col gap-1 min-w-0">
            <p className="font-semibold text-sm leading-snug line-clamp-3 text-[var(--color-text)]">
              {meta.title}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2">
              {meta.author}
            </p>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
              ISBN:
              {' '}
              {book.isbn}
            </p>
          </div>
        </div>

        {/* 感想 */}
        {book.review && (
          <div className="bg-[var(--color-sunken)] rounded-[var(--radius-md)] p-3">
            <p className="text-sm text-[var(--color-text)] leading-relaxed whitespace-pre-wrap">
              {book.review}
            </p>
          </div>
        )}

        {/* アフィリエイトリンク */}
        <div className="flex flex-col gap-2">
          {book.rakutenAffiliateUrl && (
            <a
              href={book.rakutenAffiliateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary text-sm justify-center"
              onClick={() => {
                // affiliate_click カスタムイベント（Analytics）
              }}
            >
              楽天ブックスで見る
            </a>
          )}
          {book.amazonAffiliateUrl && (
            <a
              href={book.amazonAffiliateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary text-sm justify-center"
              onClick={() => {
                // affiliate_click カスタムイベント（Analytics）
              }}
            >
              Amazonで見る
            </a>
          )}
          {!book.rakutenAffiliateUrl && !book.amazonAffiliateUrl && (
            <a
              href={`https://books.rakuten.co.jp/search?sitem=${book.isbn}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary text-sm justify-center"
            >
              楽天ブックスで検索
            </a>
          )}
        </div>

        <button type="button" className="btn btn-ghost text-sm self-center" onClick={onClose}>
          閉じる
        </button>
      </div>
    </div>
  )
}

// ─── メインページ ─────────────────────────────────────────────

export default function ShelfDetailPage(): JSX.Element {
  const { shelf, shelfUrl } = useLoaderData<typeof loader>()

  // 書影・タイトル・著者（クライアント側でプログレッシブ取得）
  // metaMap にキーが存在しない = まだ読み込み中
  const [metaMap, setMetaMap] = useState<Record<string, BookMeta | null>>({})
  const [modalBook, setModalBook] = useState<ShelfBookRow | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCopyUrl = (): void => {
    navigator.clipboard.writeText(shelfUrl).then(() => {
      // share_url_copy カスタムイベント（フェーズ10で実装）
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
      }, 2000)
    }).catch(() => {})
  }

  const tweetUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shelfUrl)}&text=${encodeURIComponent(`${shelf.name} | my9books`)}`

  // 各 ISBN の書影を並列フェッチ（完了次第 state 更新）
  useEffect(() => {
    if (shelf.books.length === 0)
      return

    for (const { isbn } of shelf.books) {
      fetch(`/api/books/search?q=${isbn}`)
        .then(r => r.json() as Promise<{ books?: { isbn: string, title: string, author: string, coverUrl: string | null }[] }>)
        .then((result) => {
          const found = result.books?.find(b => b.isbn === isbn) ?? result.books?.[0] ?? null
          setMetaMap(prev => ({
            ...prev,
            [isbn]: found
              ? { title: found.title, author: found.author, coverUrl: found.coverUrl }
              : { title: isbn, author: '', coverUrl: null },
          }))
        })
        .catch(() => {
          setMetaMap(prev => ({ ...prev, [isbn]: { title: isbn, author: '', coverUrl: null } }))
        })
    }
  }, [shelf.books])

  // 9マス分のスロット（本が少ない場合は空スロットで埋める）
  const slots = Array.from({ length: 9 }, (_, i) => ({
    book: shelf.books[i] ?? null,
    slotKey: shelf.books[i]?.isbn ?? `empty-${i + 1}`,
  }))

  const modalMeta = modalBook ? metaMap[modalBook.isbn] ?? null : null

  return (
    <main className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-[var(--color-text)] leading-snug">
            {shelf.name}
          </h1>
          <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
            {shelf.viewCount.toLocaleString()}
            {' '}
            閲覧
          </p>
          {/* SNS共有 */}
          <div className="flex gap-2 mt-3">
            <a
              href={tweetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--color-sunken)] text-[var(--color-text-secondary)] rounded-[var(--radius-full)] hover:bg-[var(--color-border)] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.732-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              ツイート
            </a>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--color-sunken)] text-[var(--color-text-secondary)] rounded-[var(--radius-full)] hover:bg-[var(--color-border)] transition-colors"
            >
              {copied
                ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      コピーしました
                    </>
                  )
                : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      URLをコピー
                    </>
                  )}
            </button>
          </div>
        </div>

        {/* 9冊グリッド（3×3） */}
        <div className="card p-4">
          <div className="grid grid-cols-3 gap-3">
            {slots.map(({ book, slotKey }) => {
              if (!book) {
                return (
                  <div
                    key={slotKey}
                    className="aspect-[2/3] rounded-[var(--radius-md)] border-2 border-dashed border-[var(--color-border)]"
                  />
                )
              }
              return (
                <BookCard
                  key={book.isbn}
                  book={book}
                  meta={metaMap[book.isbn] ?? null}
                  loading={!(book.isbn in metaMap)}
                  onClick={() => setModalBook(book)}
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* モーダル */}
      {modalBook && modalMeta && (
        <BookModal
          book={modalBook}
          meta={modalMeta}
          onClose={() => setModalBook(null)}
        />
      )}
    </main>
  )
}
