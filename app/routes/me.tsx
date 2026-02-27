import type { JSX } from 'react'
import type { LoaderFunctionArgs } from 'react-router'
import type { Route } from './+types/me'
import { desc, eq, inArray } from 'drizzle-orm'
import { useEffect, useState } from 'react'
import { Link, useLoaderData, useNavigate } from 'react-router'
import { db } from '../db'
import { books, shelfBooks, shelves, userBookBookmarks, userShelfBookmarks, userShelfLikes } from '../db/schema'
import { requireAuth } from '../lib/auth.server'
import { COPY } from '../lib/copy'

// ─── Loader ──────────────────────────────────────────────────

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await requireAuth(args as unknown as LoaderFunctionArgs)

  const userShelves = await db
    .select()
    .from(shelves)
    .where(eq(shelves.userId, userId))
    .orderBy(desc(shelves.createdAt))

  const isbnsMap: Record<string, string[]> = {}
  if (userShelves.length > 0) {
    const allBooks = await db
      .select({ shelfId: shelfBooks.shelfId, isbn: shelfBooks.isbn })
      .from(shelfBooks)
      .where(inArray(shelfBooks.shelfId, userShelves.map(s => s.id)))
      .orderBy(shelfBooks.position)
    for (const b of allBooks) {
      if (!isbnsMap[b.shelfId])
        isbnsMap[b.shelfId] = []
      if (isbnsMap[b.shelfId].length < 3)
        isbnsMap[b.shelfId].push(b.isbn)
    }
  }

  // ブックマーク済みShelf（最大4件）
  const bookmarkedShelfRows = await db
    .select({
      shelfId: userShelfBookmarks.shelfId,
      shelfName: shelves.name,
      viewCount: shelves.viewCount,
    })
    .from(userShelfBookmarks)
    .innerJoin(shelves, eq(userShelfBookmarks.shelfId, shelves.id))
    .where(eq(userShelfBookmarks.userId, userId))
    .orderBy(desc(userShelfBookmarks.createdAt))
    .limit(4)

  // いいね済みShelf（最大4件）
  const likedShelfRows = await db
    .select({
      shelfId: userShelfLikes.shelfId,
      shelfName: shelves.name,
      viewCount: shelves.viewCount,
    })
    .from(userShelfLikes)
    .innerJoin(shelves, eq(userShelfLikes.shelfId, shelves.id))
    .where(eq(userShelfLikes.userId, userId))
    .orderBy(desc(userShelfLikes.createdAt))
    .limit(4)

  // ブックマーク済み本（最大4件）
  const bookmarkedBookRows = await db
    .select({
      isbn: userBookBookmarks.isbn,
      coverUrl: books.coverUrl,
    })
    .from(userBookBookmarks)
    .leftJoin(books, eq(userBookBookmarks.isbn, books.isbn))
    .where(eq(userBookBookmarks.userId, userId))
    .orderBy(desc(userBookBookmarks.createdAt))
    .limit(4)

  // ブックマーク/いいね済みShelfの先頭3冊のISBNを取得
  const relatedShelfIds = [
    ...bookmarkedShelfRows.map(r => r.shelfId),
    ...likedShelfRows.map(r => r.shelfId),
  ]
  const relatedIsbnsMap: Record<string, string[]> = {}
  if (relatedShelfIds.length > 0) {
    const relatedBooks = await db
      .select({ shelfId: shelfBooks.shelfId, isbn: shelfBooks.isbn })
      .from(shelfBooks)
      .where(inArray(shelfBooks.shelfId, relatedShelfIds))
      .orderBy(shelfBooks.position)
    for (const b of relatedBooks) {
      if (!relatedIsbnsMap[b.shelfId])
        relatedIsbnsMap[b.shelfId] = []
      if (relatedIsbnsMap[b.shelfId].length < 3)
        relatedIsbnsMap[b.shelfId].push(b.isbn)
    }
  }

  return {
    shelves: userShelves.map(s => ({ ...s, isbns: isbnsMap[s.id] ?? [] })),
    bookmarkedShelves: bookmarkedShelfRows.map(r => ({
      id: r.shelfId,
      name: r.shelfName,
      viewCount: r.viewCount,
      isbns: relatedIsbnsMap[r.shelfId] ?? [],
    })),
    likedShelves: likedShelfRows.map(r => ({
      id: r.shelfId,
      name: r.shelfName,
      viewCount: r.viewCount,
      isbns: relatedIsbnsMap[r.shelfId] ?? [],
    })),
    bookmarkedBooks: bookmarkedBookRows.map(r => ({
      isbn: r.isbn,
      coverUrl: r.coverUrl ?? null,
    })),
    userId,
  }
}

// ─── ShelfCard ────────────────────────────────────────────────

interface ShelfData {
  id: string
  name: string
  viewCount: number
  isbns: string[]
}

interface ShelfCardProps {
  shelf: ShelfData
  isOwner: boolean
  onDelete: (id: string) => void
}

function ShelfCard({ shelf, isOwner, onDelete }: ShelfCardProps): JSX.Element {
  const [covers, setCovers] = useState<Record<string, string | null>>({})

  useEffect(() => {
    for (const isbn of shelf.isbns) {
      fetch(`/api/books/search?q=${encodeURIComponent(isbn)}`)
        .then(r => r.json() as Promise<{ books?: { isbn: string, coverUrl: string | null }[] }>)
        .then((d) => {
          const book = d.books?.find(b => b.isbn === isbn) ?? d.books?.[0] ?? null
          setCovers(prev => ({ ...prev, [isbn]: book?.coverUrl ?? null }))
        })
        .catch(() => { setCovers(prev => ({ ...prev, [isbn]: null })) })
    }
  }, [shelf.isbns])

  return (
    <div className="card p-4 flex flex-col gap-3">
      {/* ミニ書影グリッド */}
      <div className="flex gap-1.5">
        {shelf.isbns.length > 0
          ? shelf.isbns.map(isbn => (
              covers[isbn] !== undefined
                ? (
                    <img
                      key={isbn}
                      src={covers[isbn] ?? undefined}
                      alt=""
                      className="w-12 h-[4.5rem] object-cover rounded-[var(--radius-sm)] flex-shrink-0 bg-[var(--color-sunken)]"
                    />
                  )
                : (
                    <div
                      key={isbn}
                      className="w-12 h-[4.5rem] rounded-[var(--radius-sm)] bg-[var(--color-sunken)] animate-pulse flex-shrink-0"
                    />
                  )
            ))
          : (
              <div className="w-12 h-[4.5rem] rounded-[var(--radius-sm)] border-2 border-dashed border-[var(--color-border)]" />
            )}
      </div>

      {/* タイトル・閲覧数 */}
      <div className="flex-1 min-w-0">
        <Link
          to={`/shelf/${shelf.id}`}
          className="text-sm font-semibold text-[var(--color-text)] hover:underline line-clamp-2 leading-snug"
        >
          {shelf.name}
        </Link>
        <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
          {COPY.status.viewCount(shelf.viewCount)}
        </p>
      </div>

      {/* オーナー操作 */}
      {isOwner && (
        <div className="flex gap-2 pt-2 border-t border-[var(--color-border)]">
          <Link
            to={`/shelf/${shelf.id}/edit`}
            className="flex-1 text-center text-xs py-1.5 border border-[var(--color-border)] rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            {COPY.action.edit}
          </Link>
          <button
            type="button"
            onClick={() => onDelete(shelf.id)}
            className="flex-1 text-xs py-1.5 border border-[var(--color-border)] rounded-[var(--radius-sm)] text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] transition-colors"
          >
            {COPY.action.delete}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── BookmarkBookCard ─────────────────────────────────────────

interface BookmarkBookCardProps {
  isbn: string
  coverUrl: string | null
  onRemove: (isbn: string) => void
}

function BookmarkBookCard({ isbn, coverUrl, onRemove }: BookmarkBookCardProps): JSX.Element {
  const [meta, setMeta] = useState<{ title: string, author: string } | null>(null)
  const [removing, setRemoving] = useState(false)

  useEffect(() => {
    fetch(`/api/books/search?q=${encodeURIComponent(isbn)}`)
      .then(r => r.json() as Promise<{ books?: { isbn: string, title: string, author: string }[] }>)
      .then((d) => {
        const book = d.books?.find(b => b.isbn === isbn) ?? d.books?.[0] ?? null
        if (book)
          setMeta({ title: book.title, author: book.author })
      })
      .catch(() => {})
  }, [isbn])

  const handleRemove = async (): Promise<void> => {
    setRemoving(true)
    try {
      await fetch(`/api/books/${isbn}/bookmarks`, { method: 'DELETE' })
      onRemove(isbn)
    }
    finally {
      setRemoving(false)
    }
  }

  return (
    <div className="card p-3 flex gap-3 items-start">
      {coverUrl
        ? (
            <img
              src={coverUrl}
              alt=""
              className="w-10 h-[3.75rem] object-cover rounded-sm shrink-0 bg-sunken"
            />
          )
        : (
            <div className="w-10 h-[3.75rem] rounded-sm bg-sunken shrink-0" />
          )}
      <div className="flex-1 min-w-0">
        {meta
          ? (
              <>
                <p className="text-xs font-semibold text-text leading-snug line-clamp-2">{meta.title}</p>
                <p className="text-xs text-text-tertiary mt-0.5">{meta.author}</p>
              </>
            )
          : (
              <div className="space-y-1.5">
                <div className="h-3 bg-sunken rounded animate-pulse w-4/5" />
                <div className="h-3 bg-sunken rounded animate-pulse w-1/2" />
              </div>
            )}
      </div>
      <button
        type="button"
        onClick={() => { void handleRemove() }}
        disabled={removing}
        className="text-text-tertiary hover:text-danger transition-colors shrink-0 disabled:opacity-50"
        aria-label="ブックマーク解除"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
          <path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
        </svg>
      </button>
    </div>
  )
}

// ─── メインページ ─────────────────────────────────────────────

export default function Me(): JSX.Element {
  const { shelves: initialShelves, bookmarkedShelves, likedShelves, bookmarkedBooks: initialBookmarkedBooks } = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  const [shelfList, setShelfList] = useState(initialShelves)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [bookmarkedBookList, setBookmarkedBookList] = useState(initialBookmarkedBooks)

  const handleDeleteRequest = (id: string): void => {
    setDeleteTarget(id)
  }

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!deleteTarget)
      return
    setIsDeleting(true)
    try {
      await fetch(`/api/shelves/${deleteTarget}`, { method: 'DELETE' })
      setShelfList(prev => prev.filter(s => s.id !== deleteTarget))
    }
    finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg)] px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">マイShelf</h1>
          <button
            type="button"
            onClick={() => navigate('/shelf/new')}
            className="px-4 py-2 bg-[var(--color-action)] text-[var(--color-action-fg)] text-sm font-medium rounded-[var(--radius-md)] hover:bg-[var(--color-action-hover)] transition-colors"
          >
            + 新しいShelf
          </button>
        </div>

        {shelfList.length === 0
          ? (
              <div className="card p-12 text-center">
                <p className="text-[var(--color-text-secondary)] mb-4">{COPY.empty.shelf}</p>
                <button
                  type="button"
                  onClick={() => navigate('/shelf/new')}
                  className="px-6 py-2 bg-[var(--color-action)] text-[var(--color-action-fg)] text-sm font-medium rounded-[var(--radius-md)] hover:bg-[var(--color-action-hover)] transition-colors"
                >
                  最初のShelfを作成する
                </button>
              </div>
            )
          : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {shelfList.map(shelf => (
                  <ShelfCard
                    key={shelf.id}
                    shelf={shelf}
                    isOwner
                    onDelete={handleDeleteRequest}
                  />
                ))}
              </div>
            )}
        {/* ── ブックマーク済みShelf ─────────────────── */}
        {bookmarkedShelves.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-text">保存した本棚</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {bookmarkedShelves.slice(0, 3).map(shelf => (
                <ShelfCard
                  key={shelf.id}
                  shelf={shelf}
                  isOwner={false}
                  onDelete={() => {}}
                />
              ))}
            </div>
            {bookmarkedShelves.length > 3 && (
              <p className="text-xs text-text-tertiary mt-3 text-center">
                他
                {bookmarkedShelves.length - 3}
                {' '}
                件
              </p>
            )}
          </div>
        )}

        {/* ── いいね済みShelf ──────────────────────── */}
        {likedShelves.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-text">いいねした本棚</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {likedShelves.slice(0, 3).map(shelf => (
                <ShelfCard
                  key={shelf.id}
                  shelf={shelf}
                  isOwner={false}
                  onDelete={() => {}}
                />
              ))}
            </div>
            {likedShelves.length > 3 && (
              <p className="text-xs text-text-tertiary mt-3 text-center">
                他
                {likedShelves.length - 3}
                {' '}
                件
              </p>
            )}
          </div>
        )}

        {/* ── ブックマーク済み本 ──────────────────── */}
        {bookmarkedBookList.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-text">気になる本</h2>
            </div>
            <div className="flex flex-col gap-2">
              {bookmarkedBookList.slice(0, 3).map(book => (
                <BookmarkBookCard
                  key={book.isbn}
                  isbn={book.isbn}
                  coverUrl={book.coverUrl}
                  onRemove={isbn => setBookmarkedBookList(prev => prev.filter(b => b.isbn !== isbn))}
                />
              ))}
            </div>
            {bookmarkedBookList.length > 3 && (
              <p className="text-xs text-text-tertiary mt-3 text-center">
                他
                {bookmarkedBookList.length - 3}
                {' '}
                件
              </p>
            )}
          </div>
        )}
      </div>

      {/* 削除確認モーダル */}
      {deleteTarget !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">{COPY.action.deleteShelfTitle}</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              {COPY.action.deleteShelfBody}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 border border-[var(--color-border)] text-[var(--color-text)] rounded-[var(--radius-md)] text-sm font-medium hover:bg-[var(--color-surface-hover)] transition-colors disabled:opacity-50"
              >
                {COPY.action.cancel}
              </button>
              <button
                type="button"
                onClick={() => { void handleDeleteConfirm() }}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-[var(--color-danger)] text-white rounded-[var(--radius-md)] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isDeleting ? '削除中...' : COPY.action.deleteConfirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
