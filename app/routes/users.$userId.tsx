import type { JSX } from 'react'
import type { Route } from './+types/users.$userId'
import { desc, eq, inArray } from 'drizzle-orm'
import { useEffect, useState } from 'react'
import { data, Link, useLoaderData } from 'react-router'
import { db } from '../db'
import { shelfBooks, shelves, users } from '../db/schema'

// ─── Loader ──────────────────────────────────────────────────

export async function loader({ params }: Route.LoaderArgs) {
  const { userId } = params

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user)
    throw data({ error: 'user not found' }, { status: 404 })

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
    user: { id: user.id, displayName: user.displayName },
    shelves: userShelves.map(s => ({ ...s, isbns: isbnsMap[s.id] ?? [] })),
  }
}

// ─── ShelfCard（読み取り専用） ─────────────────────────────────

interface ShelfData {
  id: string
  name: string
  viewCount: number
  isbns: string[]
}

function ShelfCard({ shelf }: { shelf: ShelfData }): JSX.Element {
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
    <Link to={`/shelf/${shelf.id}`} className="card p-4 flex flex-col gap-3 hover:shadow-[var(--shadow-lg)] transition-shadow">
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
        <p className="text-sm font-semibold text-[var(--color-text)] line-clamp-2 leading-snug">
          {shelf.name}
        </p>
        <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
          {shelf.viewCount.toLocaleString()}
          {' '}
          閲覧
        </p>
      </div>
    </Link>
  )
}

// ─── メインページ ─────────────────────────────────────────────

export default function UserShelves(): JSX.Element {
  const { user, shelves: userShelves } = useLoaderData<typeof loader>()

  return (
    <main className="min-h-screen bg-[var(--color-bg)] px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            {user.displayName}
            さんのShelf
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {userShelves.length}
            件
          </p>
        </div>

        {userShelves.length === 0
          ? (
              <div className="card p-12 text-center">
                <p className="text-[var(--color-text-secondary)]">まだShelfがありません</p>
              </div>
            )
          : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {userShelves.map(shelf => (
                  <ShelfCard key={shelf.id} shelf={shelf} />
                ))}
              </div>
            )}
      </div>
    </main>
  )
}
