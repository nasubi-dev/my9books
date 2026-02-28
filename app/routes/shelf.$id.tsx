import type { JSX } from 'react'
import type { LoaderFunctionArgs } from 'react-router'
import type { Route } from './+types/shelf.$id'
import { getAuth } from '@clerk/react-router/server'
import { track } from '@vercel/analytics'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { useEffect, useState } from 'react'
import { data, useLoaderData } from 'react-router'
import { db } from '../db'
import { books, shelfBooks, shelves, userBookBookmarks, userShelfBookmarks, userShelfLikes } from '../db/schema'
import { COPY } from '../lib/copy'

// ─── Meta ────────────────────────────────────────────────────

export function meta({ data: loaderData }: Route.MetaArgs): Route.MetaDescriptors {
  if (!loaderData?.shelf) {
    return [{ title: COPY.meta.shelfFallback }]
  }
  const { shelf, shelfUrl } = loaderData
  const origin = new URL(shelfUrl).origin
  const ogImage = `${origin}/api/og-default`
  const title = COPY.share.ogTitle(shelf.name)
  return [
    { title },
    { name: 'description', content: COPY.site.ogDescription },
    { property: 'og:title', content: title },
    { property: 'og:description', content: COPY.site.ogDescription },
    { property: 'og:image', content: ogImage },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: shelfUrl },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:image', content: ogImage },
  ]
}

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
  description?: string | null
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

  // ログインユーザーのいいね・ブックマーク状態を取得
  let liked = false
  let bookmarked = false
  let bookmarkedIsbns: string[] = []
  if (viewerId) {
    const [likeRow] = await db
      .select({ id: userShelfLikes.id })
      .from(userShelfLikes)
      .where(and(eq(userShelfLikes.userId, viewerId), eq(userShelfLikes.shelfId, id)))
      .limit(1)
    liked = !!likeRow

    const [bookmarkRow] = await db
      .select({ id: userShelfBookmarks.id })
      .from(userShelfBookmarks)
      .where(and(eq(userShelfBookmarks.userId, viewerId), eq(userShelfBookmarks.shelfId, id)))
      .limit(1)
    bookmarked = !!bookmarkRow

    const isbnList = rows.map(r => r.isbn)
    if (isbnList.length > 0) {
      const bookBookmarkRows = await db
        .select({ isbn: userBookBookmarks.isbn })
        .from(userBookBookmarks)
        .where(and(eq(userBookBookmarks.userId, viewerId), inArray(userBookBookmarks.isbn, isbnList)))
      bookmarkedIsbns = bookBookmarkRows.map(r => r.isbn)
    }
  }

  return {
    shelf: { ...shelf, books: rows },
    shelfUrl: args.request.url,
    viewerId,
    liked,
    bookmarked,
    bookmarkedIsbns,
  }
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

function BookCard({ book: _book, meta, loading, onClick }: BookCardProps): JSX.Element {
  if (loading || !meta) {
    return <BookSkeleton />
  }

  return (
    <div className="relative group">
      <button
        type="button"
        className="card-hoverable w-full aspect-[2/3] overflow-hidden p-0 block"
        onClick={onClick}
      >
        {meta.coverUrl
          ? (
              <img
                src={meta.coverUrl}
                alt={meta.title}
                className="w-full h-full object-cover"
              />
            )
          : (
              <div className="w-full h-full flex items-center justify-center bg-[var(--color-sunken)] p-3">
                <span className="text-[var(--color-text-tertiary)] text-xs text-center leading-snug line-clamp-4">
                  {meta.title}
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
  shelfId: string
  viewerId: string | null
  isBookmarked: boolean
  onClose: () => void
}

function BookModal({ book, meta, shelfId, viewerId, isBookmarked: initialBookmarked, onClose }: ModalProps): JSX.Element {
  const [bookBookmarked, setBookBookmarked] = useState(initialBookmarked)
  const [bookmarkLoading, setBookmarkLoading] = useState(false)
  const [reviewRevealed, setReviewRevealed] = useState(false)

  const handleBookBookmark = async (): Promise<void> => {
    if (!viewerId || bookmarkLoading)
      return
    setBookmarkLoading(true)
    try {
      await fetch(`/api/books/${book.isbn}/bookmarks`, { method: bookBookmarked ? 'DELETE' : 'POST' })
      setBookBookmarked(!bookBookmarked)
    }
    finally {
      setBookmarkLoading(false)
    }
  }
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
        className="modal w-full max-w-sm flex flex-col gap-4 overflow-y-auto"
        style={{ maxHeight: 'min(90vh, 680px)', padding: '1.5rem' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 表紙 + 書籍情報 */}
        <div className="flex gap-4">
          {meta.coverUrl && (
            <img
              src={meta.coverUrl}
              alt={meta.title}
              className="w-20 rounded-sm shrink-0 object-cover shadow-sm"
            />
          )}
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <p className="font-semibold text-sm leading-snug line-clamp-3 text-text flex-1">
                {meta.title}
              </p>
              {/* 本のブックマーク */}
              <button
                type="button"
                onClick={() => { void handleBookBookmark() }}
                disabled={bookmarkLoading}
                title={viewerId ? (bookBookmarked ? '保存済み' : '保存する') : 'ログインすると保存できます'}
                className={`shrink-0 p-1.5 rounded-md transition-colors disabled:opacity-60 ${
                  bookBookmarked
                    ? 'text-blue-500 hover:bg-blue-50'
                    : 'text-text-tertiary hover:bg-border'
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill={bookBookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-text-secondary line-clamp-2">
              {meta.author}
            </p>
            <p className="text-xs text-text-tertiary mt-1">
              ISBN:
              {' '}
              {book.isbn}
            </p>
            {meta.description && (
              <p className="text-xs text-text-secondary line-clamp-3 mt-0.5">
                {meta.description}
              </p>
            )}
          </div>
        </div>

        {book.review && (
          book.isSpoiler === 1 && !reviewRevealed
            ? (
                <button
                  type="button"
                  onClick={() => setReviewRevealed(true)}
                  className="w-full bg-sunken rounded-md p-3 flex flex-col items-center gap-1 hover:bg-border transition-colors"
                >
                  <span className="badge">{COPY.book.spoilerLabel}</span>
                  <span className="text-xs text-text-secondary">{COPY.book.spoilerReveal}</span>
                </button>
              )
            : (
                <div className="bg-sunken rounded-md p-3">
                  {book.isSpoiler === 1 && (
                    <span className="badge mb-2 inline-block">{COPY.book.spoilerLabel}</span>
                  )}
                  <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">
                    {book.review}
                  </p>
                </div>
              )
        )}

        {/* アフィリエイトリンク */}
        <div className="flex flex-col gap-2">
          {book.rakutenAffiliateUrl && (
            <a
              href={book.rakutenAffiliateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary text-sm justify-center"
              onClick={() => track('affiliate_click', { service: 'rakuten', isbn: book.isbn, shelf_id: shelfId })}
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
              onClick={() => track('affiliate_click', { service: 'amazon', isbn: book.isbn, shelf_id: shelfId })}
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
  const { shelf, shelfUrl, viewerId, liked: initialLiked, bookmarked: initialBookmarked, bookmarkedIsbns } = useLoaderData<typeof loader>()

  // 書影・タイトル・著者（クライアント側でプログレッシブ取得）
  // metaMap にキーが存在しない = まだ読み込み中
  const [metaMap, setMetaMap] = useState<Record<string, BookMeta | null>>({})
  const [modalBook, setModalBook] = useState<ShelfBookRow | null>(null)
  const [copied, setCopied] = useState(false)
  const [liked, setLiked] = useState(initialLiked)
  const [bookmarked, setBookmarked] = useState(initialBookmarked)
  const [likesCount, setLikesCount] = useState(shelf.likesCount)
  const [bookmarksCount, setBookmarksCount] = useState(shelf.bookmarksCount)
  const [likeLoading, setLikeLoading] = useState(false)
  const [bookmarkLoading, setBookmarkLoading] = useState(false)

  const handleCopyUrl = (): void => {
    navigator.clipboard.writeText(shelfUrl).then(() => {
      track('share_url_copy', { shelf_id: shelf.id })
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
      }, 2000)
    }).catch(() => {})
  }

  const tweetUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shelfUrl)}&text=${encodeURIComponent(COPY.share.tweetText(shelf.name))}`

  const handleLike = async (): Promise<void> => {
    if (!viewerId || likeLoading)
      return
    setLikeLoading(true)
    try {
      const method = liked ? 'DELETE' : 'POST'
      await fetch(`/api/shelves/${shelf.id}/likes`, { method })
      setLiked(!liked)
      setLikesCount(prev => liked ? Math.max(0, prev - 1) : prev + 1)
    }
    finally {
      setLikeLoading(false)
    }
  }

  const handleBookmark = async (): Promise<void> => {
    if (!viewerId || bookmarkLoading)
      return
    setBookmarkLoading(true)
    try {
      const method = bookmarked ? 'DELETE' : 'POST'
      await fetch(`/api/shelves/${shelf.id}/bookmarks`, { method })
      setBookmarked(!bookmarked)
      setBookmarksCount(prev => bookmarked ? Math.max(0, prev - 1) : prev + 1)
    }
    finally {
      setBookmarkLoading(false)
    }
  }

  // 各 ISBN の書影を2フェーズ取得
  // Phase 1: キャッシュチェック（外部API不要）→ ヒット分は全件一括表示
  // Phase 2: 未キャッシュ分は 200ms stagger で複数リクエストを分散
  useEffect(() => {
    if (shelf.books.length === 0)
      return

    const isbns = shelf.books.map(b => b.isbn)
    const controller = new AbortController()
    const staggerTimers: ReturnType<typeof setTimeout>[] = []

    interface CacheStatusRes {
      hits: Record<string, { isbn: string, title: string, author: string, coverUrl: string | null, description?: string | null }>
      misses: string[]
    }
    interface SearchRes { books?: { isbn: string, title: string, author: string, coverUrl: string | null, description?: string | null }[] }

    const fetchMiss = (isbn: string): void => {
      fetch(`/api/books/search?q=${isbn}`, { signal: controller.signal })
        .then(r => r.json() as Promise<SearchRes>)
        .then((result) => {
          const found = result.books?.find(b => b.isbn === isbn) ?? result.books?.[0] ?? null
          setMetaMap(prev => ({
            ...prev,
            [isbn]: found
              ? { title: found.title, author: found.author, coverUrl: found.coverUrl, description: found.description ?? null }
              : { title: isbn, author: '', coverUrl: null, description: null },
          }))
        })
        .catch((err) => {
          if ((err as Error).name === 'AbortError')
            return
          setMetaMap(prev => ({ ...prev, [isbn]: { title: isbn, author: '', coverUrl: null, description: null } }))
        })
    }

    fetch(`/api/books/cache-status?isbns=${isbns.join(',')}`, { signal: controller.signal })
      .then(r => r.json() as Promise<CacheStatusRes>)
      .then(({ hits, misses }) => {
        // Phase 1: キャッシュ済み一括反映
        if (Object.keys(hits).length > 0) {
          setMetaMap((prev) => {
            const next = { ...prev }
            for (const [isbn, book] of Object.entries(hits))
              next[isbn] = { title: book.title, author: book.author, coverUrl: book.coverUrl, description: book.description ?? null }
            return next
          })
        }
        // Phase 2: 未キャッシュを stagger
        for (let i = 0; i < misses.length; i++) {
          const isbn = misses[i]
          // eslint-disable-next-line react-web-api/no-leaked-timeout
          staggerTimers.push(setTimeout(() => fetchMiss(isbn), i * 200))
        }
      })
      .catch((err) => {
        if ((err as Error).name === 'AbortError')
          return
        // cache-status 失敗時は全件 stagger でフォールバック
        for (let i = 0; i < isbns.length; i++) {
          const isbn = isbns[i]
          // eslint-disable-next-line react-web-api/no-leaked-timeout
          staggerTimers.push(setTimeout(() => fetchMiss(isbn), i * 200))
        }
      })

    return () => {
      controller.abort()
      for (const t of staggerTimers) clearTimeout(t)
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
            {COPY.status.viewCount(shelf.viewCount)}
          </p>
          {/* SNS共有 */}
          <div className="flex flex-wrap gap-2 mt-3">
            <a
              href={tweetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-sunken text-text-secondary rounded-full hover:bg-border transition-colors"
              onClick={() => track('share_twitter', { shelf_id: shelf.id })}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.732-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              {COPY.share.tweetButtonLabel}
            </a>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-sunken text-text-secondary rounded-full hover:bg-border transition-colors"
            >
              {copied
                ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {COPY.share.urlCopied}
                    </>
                  )
                : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      {COPY.share.copyButtonLabel}
                    </>
                  )}
            </button>
            {/* いいね */}
            <button
              type="button"
              onClick={() => { void handleLike() }}
              disabled={likeLoading}
              title={viewerId ? undefined : 'ログインするといいねできます'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors disabled:opacity-60 ${liked ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-sunken text-text-secondary hover:bg-border'}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
              {likesCount > 0 ? likesCount : 'いいね'}
            </button>
            {/* ブックマーク */}
            <button
              type="button"
              onClick={() => { void handleBookmark() }}
              disabled={bookmarkLoading}
              title={viewerId ? undefined : 'ログインするとブックマークできます'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors disabled:opacity-60 ${bookmarked ? 'bg-blue-50 text-blue-500 hover:bg-blue-100' : 'bg-sunken text-text-secondary hover:bg-border'}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
              </svg>
              {bookmarksCount > 0 ? bookmarksCount : '保存'}
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
                  onClick={() => {
                    track('book_modal_open', { isbn: book.isbn, shelf_id: shelf.id })
                    setModalBook(book)
                  }}
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
          shelfId={shelf.id}
          viewerId={viewerId}
          isBookmarked={bookmarkedIsbns.includes(modalBook.isbn)}
          onClose={() => setModalBook(null)}
        />
      )}
    </main>
  )
}
