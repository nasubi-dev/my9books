import type { JSX } from 'react'
import type { LoaderFunctionArgs } from 'react-router'
import type { Route } from './+types/me'
import { desc, eq, inArray } from 'drizzle-orm'
import { useEffect, useState } from 'react'
import { Link, useLoaderData, useNavigate } from 'react-router'
import { db } from '../db'
import { shelfBooks, shelves } from '../db/schema'
import { requireAuth } from '../lib/auth.server'

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

  return {
    shelves: userShelves.map(s => ({ ...s, isbns: isbnsMap[s.id] ?? [] })),
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
          {shelf.viewCount.toLocaleString()}
          {' '}
          閲覧
        </p>
      </div>

      {/* オーナー操作 */}
      {isOwner && (
        <div className="flex gap-2 pt-2 border-t border-[var(--color-border)]">
          <Link
            to={`/shelf/${shelf.id}/edit`}
            className="flex-1 text-center text-xs py-1.5 border border-[var(--color-border)] rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            編集
          </Link>
          <button
            type="button"
            onClick={() => onDelete(shelf.id)}
            className="flex-1 text-xs py-1.5 border border-[var(--color-border)] rounded-[var(--radius-sm)] text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] transition-colors"
          >
            削除
          </button>
        </div>
      )}
    </div>
  )
}

// ─── メインページ ─────────────────────────────────────────────

export default function Me(): JSX.Element {
  const { shelves: initialShelves } = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  const [shelfList, setShelfList] = useState(initialShelves)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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
                <p className="text-[var(--color-text-secondary)] mb-4">まだShelfがありません</p>
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
      </div>

      {/* 削除確認モーダル */}
      {deleteTarget !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">Shelfを削除しますか？</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              この操作は元に戻せません。
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 border border-[var(--color-border)] text-[var(--color-text)] rounded-[var(--radius-md)] text-sm font-medium hover:bg-[var(--color-surface-hover)] transition-colors disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => { void handleDeleteConfirm() }}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-[var(--color-danger)] text-white rounded-[var(--radius-md)] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isDeleting ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
