import type { DragEvent, JSX } from 'react'
import type { LoaderFunctionArgs } from 'react-router'
import type { BookSearchResult } from '../types/book'
import type { Route } from './+types/shelf.$id.edit'
import { track } from '@vercel/analytics'
import { eq } from 'drizzle-orm'
import { useEffect, useRef, useState } from 'react'
import { data, useLoaderData, useNavigate } from 'react-router'
import { db } from '../db'
import { shelfBooks, shelves } from '../db/schema'
import { requireAuth } from '../lib/auth.server'
import { COPY } from '../lib/copy'

// ─── Loader ──────────────────────────────────────────────────

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await requireAuth(args as unknown as LoaderFunctionArgs)
  const { id } = args.params

  const [shelf] = await db.select().from(shelves).where(eq(shelves.id, id)).limit(1)
  if (!shelf)
    throw data({ error: 'not found' }, { status: 404 })
  if (shelf.userId !== userId)
    throw data({ error: 'forbidden' }, { status: 403 })

  const rows = await db
    .select({
      isbn: shelfBooks.isbn,
      position: shelfBooks.position,
      review: shelfBooks.review,
      isSpoiler: shelfBooks.isSpoiler,
    })
    .from(shelfBooks)
    .where(eq(shelfBooks.shelfId, id))
    .orderBy(shelfBooks.position)

  return { shelf, books: rows }
}

// ─── 型定義 ───────────────────────────────────────────────────

interface BookMeta {
  title: string
  author: string
  coverUrl: string | null
}

interface BookEntry {
  isbn: string
  review: string
  isSpoiler: boolean
}

// ─── デバウンスフック ─────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value)
    }, delay)
    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])
  return debounced
}

// ─── メインページ ─────────────────────────────────────────────

export default function ShelfEdit(): JSX.Element {
  const { shelf, books: initialBooks } = useLoaderData<typeof loader>()
  const navigate = useNavigate()

  const [shelfName, setShelfName] = useState(shelf.name)
  const [books, setBooks] = useState<BookEntry[]>(
    initialBooks.map(b => ({
      isbn: b.isbn,
      review: b.review ?? '',
      isSpoiler: b.isSpoiler === 1,
    })),
  )
  const [metaMap, setMetaMap] = useState<Record<string, BookMeta>>({})
  const [expandedIsbn, setExpandedIsbn] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BookSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const dragSrcIdxRef = useRef<number | null>(null)
  // 元のISBN一覧（削除判定に使用）
  const originalIsbnsRef = useRef(new Set(initialBooks.map(b => b.isbn)))

  const debouncedQuery = useDebounce(query, 400)

  // 既存書籍のメタデータをISBNで並列フェッチ（初回のみ）
  useEffect(() => {
    for (const { isbn } of initialBooks) {
      fetch(`/api/books/search?q=${encodeURIComponent(isbn)}`)
        .then(r => r.json() as Promise<{ books?: BookSearchResult[] }>)
        .then((d) => {
          const match = d.books?.find(b => b.isbn === isbn) ?? d.books?.[0] ?? null
          setMetaMap(prev => ({
            ...prev,
            [isbn]: match
              ? { title: match.title, author: match.author, coverUrl: match.coverUrl }
              : { title: isbn, author: '', coverUrl: null },
          }))
        })
        .catch(() => {
          setMetaMap(prev => ({ ...prev, [isbn]: { title: isbn, author: '', coverUrl: null } }))
        })
    }
  }, [initialBooks])

  // 書籍検索
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      return
    }
    const controller = new AbortController()
    fetch(`/api/books/search?q=${encodeURIComponent(debouncedQuery)}`, { signal: controller.signal })
      .then(r => r.json() as Promise<{ books?: BookSearchResult[] }>)
      .then((d) => {
        setResults(d.books ?? [])
        setIsSearching(false)
      })
      .catch(() => { setIsSearching(false) })
    setIsSearching(true)
    track('book_search', { query: debouncedQuery })
    return () => {
      controller.abort()
      setResults([])
    }
  }, [debouncedQuery])

  const addBook = (book: BookSearchResult): void => {
    if (books.length >= 9 || books.some(b => b.isbn === book.isbn))
      return
    setBooks(prev => [...prev, { isbn: book.isbn, review: '', isSpoiler: false }])
    setMetaMap(prev => ({
      ...prev,
      [book.isbn]: { title: book.title, author: book.author, coverUrl: book.coverUrl },
    }))
  }

  const removeBook = (isbn: string): void => {
    setBooks(prev => prev.filter(b => b.isbn !== isbn))
    if (expandedIsbn === isbn)
      setExpandedIsbn(null)
  }

  const updateBook = (
    isbn: string,
    patch: Partial<Pick<BookEntry, 'review' | 'isSpoiler'>>,
  ): void => {
    setBooks(prev => prev.map(b => (b.isbn === isbn ? { ...b, ...patch } : b)))
  }

  const handleDragOver = (e: DragEvent<HTMLLIElement>, toIdx: number): void => {
    e.preventDefault()
    const fromIdx = dragSrcIdxRef.current
    if (fromIdx === null || fromIdx === toIdx)
      return
    setBooks((prev) => {
      const next = [...prev]
      const [item] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, item)
      return next
    })
    dragSrcIdxRef.current = toIdx
  }

  const handleSave = async (): Promise<void> => {
    if (!shelfName.trim()) {
      setSaveError('Shelf名を入力してください')
      return
    }
    if (books.length === 0) {
      setSaveError('本を1冊以上選択してください')
      return
    }
    setIsSaving(true)
    setSaveError(null)

    try {
      const shelfId = shelf.id
      const currentIsbns = new Set(books.map(b => b.isbn))

      // 1. Shelf名変更
      if (shelfName.trim() !== shelf.name) {
        const res = await fetch(`/api/shelves/${shelfId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: shelfName.trim() }),
        })
        if (!res.ok)
          throw new Error('Shelf名の更新に失敗しました')
      }

      // 2. 削除された本を削除（並列）
      const removed = [...originalIsbnsRef.current].filter(isbn => !currentIsbns.has(isbn))
      await Promise.all(
        removed.map(isbn =>
          fetch(`/api/shelves/${shelfId}/books/${isbn}`, { method: 'DELETE' }),
        ),
      )

      // 3. 追加された本を登録（逐次実行でposition保持）
      const added = books.filter(b => !originalIsbnsRef.current.has(b.isbn))
      for (const book of added) {
        await fetch(`/api/shelves/${shelfId}/books`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isbn: book.isbn, coverUrl: metaMap[book.isbn]?.coverUrl ?? null }),
        })
      }

      // 4. 並び順を一括更新
      await fetch(`/api/shelves/${shelfId}/books/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: books.map((b, i) => ({ isbn: b.isbn, position: i + 1 })),
        }),
      })

      // 5. 感想・ネタバレをすべて更新（並列）
      await Promise.all(
        books.map(book =>
          fetch(`/api/shelves/${shelfId}/books/${book.isbn}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ review: book.review, isSpoiler: book.isSpoiler }),
          }),
        ),
      )

      navigate(`/shelf/${shelfId}`)
    }
    catch (err) {
      setSaveError(err instanceof Error ? err.message : '保存に失敗しました')
      setIsSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg)] px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-[var(--color-text)] mb-8">Shelfを編集</h1>

        {/* Shelf名 */}
        <section className="card p-6 mb-6">
          <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
            {COPY.form.shelfNameLabel}
            <span className="text-[var(--color-danger)] ml-1">*</span>
          </label>
          <input
            type="text"
            value={shelfName}
            onChange={e => setShelfName(e.target.value)}
            maxLength={100}
            className="w-full px-3 py-2 bg-[var(--color-sunken)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-border-strong)]"
          />
        </section>

        {/* 書籍検索 */}
        <section className="card p-6 mb-6">
          <h2 className="text-base font-semibold text-[var(--color-text)] mb-3">
            {COPY.form.addBookLabel}
            <span className="ml-2 font-normal text-sm text-[var(--color-text-secondary)]">
              {COPY.status.bookCount(books.length, 9)}
            </span>
          </h2>
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={COPY.form.searchPlaceholder}
            disabled={books.length >= 9}
            className="w-full px-3 py-2 bg-[var(--color-sunken)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-border-strong)] mb-3 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {isSearching && (
            <p className="py-2 text-sm text-[var(--color-text-secondary)]">{COPY.status.searching}</p>
          )}
          {!isSearching && results.length > 0 && (
            <ul className="border border-[var(--color-border)] rounded-[var(--radius-md)] divide-y divide-[var(--color-border)] overflow-hidden max-h-64 overflow-y-auto">
              {results.map((book) => {
                const isSelected = books.some(b => b.isbn === book.isbn)
                const isFull = books.length >= 9
                return (
                  <li
                    key={book.isbn}
                    className="flex items-center gap-3 p-3 bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] transition-colors"
                  >
                    {book.coverUrl
                      ? <img src={book.coverUrl} alt={book.title} className="w-8 h-12 object-cover rounded flex-shrink-0" />
                      : <div className="w-8 h-12 bg-[var(--color-sunken)] rounded flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text)] truncate">{book.title}</p>
                      <p className="text-xs text-[var(--color-text-secondary)] truncate">{book.author}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => isSelected ? removeBook(book.isbn) : addBook(book)}
                      disabled={!isSelected && isFull}
                      className={`flex-shrink-0 px-3 py-1 text-xs font-medium rounded-[var(--radius-sm)] transition-colors ${
                        isSelected
                          ? 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]'
                          : isFull
                            ? 'bg-[var(--color-sunken)] text-[var(--color-text-disabled)] cursor-not-allowed'
                            : 'bg-[var(--color-action)] text-[var(--color-action-fg)] hover:bg-[var(--color-action-hover)]'
                      }`}
                    >
                      {isSelected ? '削除' : '追加'}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* 現在の本リスト */}
        {books.length > 0 && (
          <section className="card p-6 mb-6">
            <h2 className="text-base font-semibold text-[var(--color-text)] mb-1">現在の本</h2>
            <p className="text-xs text-[var(--color-text-secondary)] mb-3">{COPY.form.dragHint}</p>
            <ul className="space-y-2">
              {books.map((book, index) => {
                const meta = metaMap[book.isbn]
                return (
                  <li
                    key={book.isbn}
                    draggable
                    onDragStart={() => { dragSrcIdxRef.current = index }}
                    onDragOver={e => handleDragOver(e, index)}
                    onDragEnd={() => { dragSrcIdxRef.current = null }}
                    className="bg-[var(--color-sunken)] rounded-[var(--radius-md)] p-3 cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-[var(--color-text-tertiary)] w-4 text-center flex-shrink-0">
                        {index + 1}
                      </span>
                      {meta?.coverUrl
                        ? <img src={meta.coverUrl} alt={meta.title} className="w-8 h-12 object-cover rounded flex-shrink-0" />
                        : <div className="w-8 h-12 bg-[var(--color-border)] rounded flex-shrink-0 animate-pulse" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--color-text)] truncate">
                          {meta?.title ?? book.isbn}
                        </p>
                        <p className="text-xs text-[var(--color-text-secondary)] truncate">
                          {meta?.author ?? '読み込み中...'}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setExpandedIsbn(expandedIsbn === book.isbn ? null : book.isbn)}
                          className="px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] rounded-[var(--radius-sm)] transition-colors"
                        >
                          {expandedIsbn === book.isbn ? '閉じる' : '感想'}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeBook(book.isbn)}
                          className="px-2 py-1 text-xs text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] rounded-[var(--radius-sm)] transition-colors"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                    {expandedIsbn === book.isbn && (
                      <div className="mt-3 pt-3 border-t border-[var(--color-border)] space-y-2">
                        <textarea
                          value={book.review}
                          onChange={e => updateBook(book.isbn, { review: e.target.value })}
                          placeholder={COPY.form.reviewPlaceholder}
                          rows={3}
                          className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-sm)] text-sm text-[var(--color-text)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-border-strong)] resize-none"
                        />
                        <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={book.isSpoiler}
                            onChange={e => updateBook(book.isbn, { isSpoiler: e.target.checked })}
                          />
                          {COPY.form.spoilerCheckbox}
                        </label>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {saveError !== null && (
          <div className="mb-4 px-4 py-3 bg-[var(--color-danger-bg)] text-[var(--color-danger)] text-sm rounded-[var(--radius-md)] border border-red-200">
            {saveError}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/me')}
            className="flex-1 px-4 py-3 border border-[var(--color-border)] text-[var(--color-text)] rounded-[var(--radius-md)] font-medium hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            {COPY.action.cancel}
          </button>
          <button
            type="button"
            onClick={() => { void handleSave() }}
            disabled={isSaving}
            className="flex-1 px-4 py-3 bg-[var(--color-action)] text-[var(--color-action-fg)] rounded-[var(--radius-md)] font-medium hover:bg-[var(--color-action-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? COPY.action.saving : COPY.action.save}
          </button>
        </div>
      </div>
    </main>
  )
}
