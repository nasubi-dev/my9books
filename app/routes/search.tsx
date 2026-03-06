import type { JSX } from 'react'
import type { Route } from './+types/search'
import { desc, inArray, like } from 'drizzle-orm'
import { useEffect, useRef } from 'react'
import { Form, Link, useLoaderData, useNavigate, useSearchParams } from 'react-router'
import { db } from '../db'
import { shelfBooks, shelves } from '../db/schema'
import { COPY } from '../lib/copy'

const COVER_SLOTS = ['first', 'second', 'third'] as const

const EXAMPLE_TAGS = [
  '私をかたちづくる本',
  'ライトノベル',
  'ミステリー',
  '2026年BEST',
  'おすすめ',
] as const

// ─── Loader ──────────────────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const q = url.searchParams.get('q')?.trim() ?? ''

  if (!q) {
    return { q, results: [] }
  }

  const rows = await db
    .select({
      id: shelves.id,
      name: shelves.name,
      userId: shelves.userId,
      viewCount: shelves.viewCount,
      bookmarksCount: shelves.bookmarksCount,
      createdAt: shelves.createdAt,
    })
    .from(shelves)
    .where(like(shelves.name, `%${q}%`))
    .orderBy(desc(shelves.createdAt))
    .limit(30)

  if (rows.length === 0) {
    return { q, results: [] }
  }

  // 各棚の先頭 ISBNを最大3件取得（サムネイル表示用）
  const allBooks = await db
    .select({ shelfId: shelfBooks.shelfId, isbn: shelfBooks.isbn })
    .from(shelfBooks)
    .where(inArray(shelfBooks.shelfId, rows.map(r => r.id)))
    .orderBy(shelfBooks.position)

  const isbnMap: Record<string, string[]> = {}
  for (const b of allBooks) {
    if (!isbnMap[b.shelfId])
      isbnMap[b.shelfId] = []
    if (isbnMap[b.shelfId].length < 3)
      isbnMap[b.shelfId].push(b.isbn)
  }

  const results = rows.map(r => ({ ...r, isbns: isbnMap[r.id] ?? [] }))

  return { q, results }
}

// ─── Meta ────────────────────────────────────────────────────

export function meta({ data }: Route.MetaArgs): Route.MetaDescriptors {
  const q = data?.q
  return [
    { title: q ? COPY.meta.searchQuery(q) : COPY.meta.searchDefault },
    { name: 'description', content: '本棚を名前で検索しよう' },
  ]
}

// ─── Types ───────────────────────────────────────────────────

interface SearchResult {
  id: string
  name: string
  userId: string
  viewCount: number
  bookmarksCount: number
  createdAt: string
  isbns: string[]
}

// ─── ShelfCard ───────────────────────────────────────────────

function ShelfCard({ shelf }: { shelf: SearchResult }): JSX.Element {
  return (
    <Link
      to={`/shelf/${shelf.id}`}
      prefetch="intent"
      className="flex items-center gap-3 p-3 bg-surface rounded-lg border border-border hover:border-border-strong hover:shadow-sm transition-all"
    >
      {/* 書影サムネイル（ISBNがあれば表示枠のみ） */}
      <div className="flex gap-0.5 shrink-0">
        {COVER_SLOTS.map((slot, i) => (
          <div
            key={slot}
            className="w-9 h-12 rounded-sm bg-sunken overflow-hidden"
          >
            {shelf.isbns[i] && (
              <BookCover isbn={shelf.isbns[i]} />
            )}
          </div>
        ))}
      </div>

      {/* テキスト情報 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text truncate">{shelf.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-text-tertiary">
            👁
            {' '}
            {shelf.viewCount.toLocaleString()}
          </span>
          <span className="text-xs text-text-tertiary">
            🔖
            {' '}
            {shelf.bookmarksCount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 矢印 */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-text-tertiary shrink-0" aria-hidden="true">
        <path d="m9 18 6-6-6-6" />
      </svg>
    </Link>
  )
}

// ─── BookCover (ISBNから書影を取得・表示) ────────────────────

function BookCover({ isbn }: { isbn: string }): JSX.Element {
  const coverRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/books/search?q=${encodeURIComponent(isbn)}`)
      .then(r => r.json())
      .then((d: { books?: { coverUrl?: string }[] }) => {
        if (cancelled)
          return
        const url = d.books?.[0]?.coverUrl
        if (url && coverRef.current) {
          coverRef.current.src = url
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isbn])

  return (
    <img
      ref={coverRef}
      alt=""
      className="w-full h-full object-cover"
      aria-hidden="true"
    />
  )
}

// ─── Page ────────────────────────────────────────────────────

export default function SearchPage(): JSX.Element {
  const { q, results } = useLoaderData<typeof loader>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  function handleTagClick(tag: string): void {
    navigate(`/search?q=${encodeURIComponent(tag)}`)
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="text-lg font-bold text-text mb-4">本棚を探す</h1>

      {/* 検索フォーム */}
      <Form method="get" className="mb-4">
        <div className="relative">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            name="q"
            defaultValue={searchParams.get('q') ?? ''}
            placeholder="本棚の名前で検索…"
            autoComplete="off"
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:border-border-strong"
          />
        </div>
      </Form>

      {/* 例示タグチップ */}
      <div className="flex flex-wrap gap-2 mb-6">
        {EXAMPLE_TAGS.map(tag => (
          <button
            key={tag}
            type="button"
            onClick={() => handleTagClick(tag)}
            className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
              q === tag
                ? 'bg-action text-action-fg border-action'
                : 'bg-sunken text-text-secondary border-border hover:border-border-strong hover:text-text'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* 検索結果 */}
      {q && (
        <>
          <p className="text-xs text-text-tertiary mb-3">
            「
            {q}
            」
            {results.length > 0
              ? ` の検索結果 ${results.length}件`
              : ' に一致する本棚は見つかりませんでした'}
          </p>
          <div className="space-y-2">
            {results.map(shelf => (
              <ShelfCard key={shelf.id} shelf={shelf} />
            ))}
          </div>
        </>
      )}

      {/* 未検索時のガイド */}
      {!q && (
        <div className="text-center py-10 text-text-tertiary">
          <div className="text-3xl mb-3">🔍</div>
          <p className="text-sm">キーワードを入力するか、タグをタップして探してみよう</p>
        </div>
      )}
    </div>
  )
}
