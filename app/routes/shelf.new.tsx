import type { DragEvent, JSX } from 'react'
import type { LoaderFunctionArgs } from 'react-router'
import type { BookSearchResult } from '../types/book'
import type { Route } from './+types/shelf.new'
import { track } from '@vercel/analytics'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { requireAuth } from '../lib/auth.server'
import { COPY } from '../lib/copy'

// ─── Loader（認証チェック） ────────────────────────────────────

export async function loader(args: Route.LoaderArgs) {
  await requireAuth(args as unknown as LoaderFunctionArgs)
  return {}
}

// ─── 型定義 ───────────────────────────────────────────────────

interface BookEntry {
  isbn: string
  title: string
  author: string
  coverUrl: string | null
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

export default function ShelfNew(): JSX.Element {
  const navigate = useNavigate()
  const [shelfName, setShelfName] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BookSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [books, setBooks] = useState<BookEntry[]>([])
  const [expandedIsbn, setExpandedIsbn] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const dragSrcIdxRef = useRef<number | null>(null)
  const debouncedQuery = useDebounce(query, 400)

  // 書籍検索（デバウンス済みクエリが変わるたびに実行）
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
    setBooks(prev => [
      ...prev,
      {
        isbn: book.isbn,
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrl,
        review: '',
        isSpoiler: false,
      },
    ])
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

  const doCreate = async (): Promise<void> => {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      // 1. Shelf作成
      const res = await fetch('/api/shelves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: shelfName.trim() }),
      })
      if (!res.ok)
        throw new Error('Shelf作成に失敗しました')
      const { shelf } = await res.json() as { shelf: { id: string } }

      // 2. 本を登録（順番通りに逐次実行）
      for (const book of books) {
        const addRes = await fetch(`/api/shelves/${shelf.id}/books`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isbn: book.isbn, coverUrl: book.coverUrl }),
        })
        if (!addRes.ok)
          continue
        // 感想・ネタバレが設定されていれば更新
        if (book.review || book.isSpoiler) {
          await fetch(`/api/shelves/${shelf.id}/books/${book.isbn}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ review: book.review, isSpoiler: book.isSpoiler }),
          })
        }
      }

      track('shelf_created', { shelf_id: shelf.id })
      navigate(`/shelf/${shelf.id}`)
    }
    catch (err) {
      setSubmitError(err instanceof Error ? err.message : '作成に失敗しました')
      setIsSubmitting(false)
    }
  }

  const handleSubmit = (): void => {
    if (!shelfName.trim()) {
      setSubmitError('Shelf名を入力してください')
      return
    }
    if (books.length === 0) {
      setSubmitError('本を1冊以上選択してください')
      return
    }
    setSubmitError(null)
    if (books.length < 9) {
      setShowConfirm(true)
      return
    }
    void doCreate()
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg)] px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-[var(--color-text)] mb-8">新しいShelfを作成</h1>

        {/* Shelf名入力 */}
        <section className="card p-6 mb-6">
          <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
            {COPY.form.shelfNameLabel}
            <span className="text-[var(--color-danger)] ml-1">*</span>
          </label>
          <input
            type="text"
            value={shelfName}
            onChange={e => setShelfName(e.target.value)}
            placeholder={COPY.form.shelfNamePlaceholder}
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

        {/* 選択した本リスト */}
        {books.length > 0 && (
          <section className="card p-6 mb-6">
            <h2 className="text-base font-semibold text-[var(--color-text)] mb-1">選択した本</h2>
            <p className="text-xs text-[var(--color-text-secondary)] mb-3">{COPY.form.dragHint}</p>
            <ul className="space-y-2">
              {books.map((book, index) => (
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
                    {book.coverUrl
                      ? <img src={book.coverUrl} alt={book.title} className="w-8 h-12 object-cover rounded flex-shrink-0" />
                      : <div className="w-8 h-12 bg-[var(--color-border)] rounded flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text)] truncate">{book.title}</p>
                      <p className="text-xs text-[var(--color-text-secondary)] truncate">{book.author}</p>
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
              ))}
            </ul>
          </section>
        )}

        {submitError !== null && (
          <div className="mb-4 px-4 py-3 bg-[var(--color-danger-bg)] text-[var(--color-danger)] text-sm rounded-[var(--radius-md)] border border-red-200">
            {submitError}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => { window.history.back() }}
            className="flex-1 px-4 py-3 border border-[var(--color-border)] text-[var(--color-text)] rounded-[var(--radius-md)] font-medium hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            {COPY.action.cancel}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 bg-[var(--color-action)] text-[var(--color-action-fg)] rounded-[var(--radius-md)] font-medium hover:bg-[var(--color-action-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? COPY.action.creating : COPY.action.create}
          </button>
        </div>
      </div>

      {/* 9冊未満確認モーダル */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">{COPY.form.confirmLessThan9Title}</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              {COPY.form.confirmLessThan9Body(books.length)}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 border border-[var(--color-border)] text-[var(--color-text)] rounded-[var(--radius-md)] text-sm font-medium hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                {COPY.form.backToAddButton}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirm(false)
                  void doCreate()
                }}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-[var(--color-action)] text-[var(--color-action-fg)] rounded-[var(--radius-md)] text-sm font-medium hover:bg-[var(--color-action-hover)] transition-colors disabled:opacity-50"
              >
                {COPY.form.confirmCreateButton}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
