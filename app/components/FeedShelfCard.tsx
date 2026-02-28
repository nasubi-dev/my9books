import type { JSX, MouseEvent } from 'react'
import type { FeedShelfRow } from '../routes/api.feed'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

// ─── Types ───────────────────────────────────────────────────

interface FeedShelfCardProps {
  shelf: FeedShelfRow
  /** 現在カードがビューポートに表示中か */
  isActive: boolean
  /** ログイン済みか */
  isSignedIn: boolean
  /** 未ログイン時のCTAコールバック */
  onNeedLogin: () => void
  /** いいね済みか */
  isLiked: boolean
  /** いいね切替コールバック */
  onLikeToggle: (shelfId: string, liked: boolean) => void
  /** ブックマーク済みか */
  isBookmarked: boolean
  /** ブックマーク切替コールバック */
  onBookmarkToggle: (shelfId: string, bookmarked: boolean) => void
  /** カードの高さクラス */
  heightClass: string
}

// ─── BookCoverCell ────────────────────────────────────────────

function BookCoverCell({ isbn, active }: { isbn: string, active: boolean }): JSX.Element {
  const imgRef = useRef<HTMLImageElement>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!active || !isbn)
      return
    let cancelled = false

    fetch(`/api/books/search?q=${encodeURIComponent(isbn)}`)
      .then(r => r.json())
      .then((d: { books?: { coverUrl?: string }[] }) => {
        if (cancelled)
          return
        const url = d.books?.[0]?.coverUrl
        if (url && imgRef.current) {
          imgRef.current.src = url
          setLoaded(true)
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [isbn, active])

  return (
    <div className="w-full h-full bg-sunken overflow-hidden relative">
      <img
        ref={imgRef}
        alt=""
        aria-hidden="true"
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )
}

// ─── EmptyCell ────────────────────────────────────────────────

function EmptyCell(): JSX.Element {
  return <div className="w-full h-full bg-sunken rounded-sm" />
}

// ─── FeedShelfCard ────────────────────────────────────────────

export function FeedShelfCard({
  shelf,
  isActive,
  isSignedIn,
  onNeedLogin,
  isLiked,
  onLikeToggle,
  isBookmarked,
  onBookmarkToggle,
  heightClass,
}: FeedShelfCardProps): JSX.Element {
  const [localLiked, setLocalLiked] = useState(isLiked)
  const [localLikeCount, setLocalLikeCount] = useState(shelf.likesCount)
  const [localBookmarked, setLocalBookmarked] = useState(isBookmarked)
  const [localCount, setLocalCount] = useState(shelf.bookmarksCount)

  // 親から isLiked が変わったら同期
  useEffect(() => {
    setLocalLiked(isLiked)
  }, [isLiked])

  // 親から isBookmarked が変わったら同期
  useEffect(() => {
    setLocalBookmarked(isBookmarked)
  }, [isBookmarked])

  function handleLikeClick(): void {
    if (!isSignedIn) {
      onNeedLogin()
      return
    }
    const next = !localLiked
    setLocalLiked(next)
    setLocalLikeCount(c => c + (next ? 1 : -1))
    onLikeToggle(shelf.id, next)
  }

  function handleBookmarkClick(): void {
    if (!isSignedIn) {
      onNeedLogin()
      return
    }
    const next = !localBookmarked
    setLocalBookmarked(next)
    setLocalCount(c => c + (next ? 1 : -1))
    onBookmarkToggle(shelf.id, next)
  }

  function handleLikeButtonClick(e: MouseEvent): void {
    e.preventDefault()
    e.stopPropagation()
    handleLikeClick()
  }

  function handleBookmarkButtonClick(e: MouseEvent): void {
    e.preventDefault()
    e.stopPropagation()
    handleBookmarkClick()
  }

  // 3×3 グリッド用 9スロット
  const slots = Array.from({ length: 9 }, (_, i) => shelf.isbns[i] ?? null)

  return (
    <Link
      to={`/shelf/${shelf.id}`}
      prefetch="intent"
      className={`relative w-full shrink-0 overflow-hidden bg-black select-none block ${heightClass}`}
      data-shelf-id={shelf.id}
    >
      {/* 書影グリッド 3×3 */}
      <div className="grid grid-cols-3 grid-rows-3 w-full h-full gap-px">
        {slots.map((isbn, i) =>
          isbn
            ? (
                <BookCoverCell
                  // eslint-disable-next-line react/no-array-index-key
                  key={`${shelf.id}-${i}`}
                  isbn={isbn}
                  active={isActive}
                />
              )
            : (
                // eslint-disable-next-line react/no-array-index-key
                <EmptyCell key={`empty-${i}`} />
              ),
        )}
      </div>

      {/* 右サイドバー: いいね・ブックマークボタン */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4 z-20">
        {/* いいねボタン */}
        <button
          type="button"
          onClick={handleLikeButtonClick}
          aria-label={localLiked ? 'いいね解除' : 'いいね'}
          className="flex flex-col items-center gap-0.5"
        >
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center shadow-md transition-colors ${
              localLiked
                ? 'bg-red-500 text-white'
                : 'bg-black/50 backdrop-blur text-white'
            }`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill={localLiked ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <span className="text-white text-xs font-medium drop-shadow">
            {localLikeCount.toLocaleString()}
          </span>
        </button>

        {/* ブックマークボタン */}
        <button
          type="button"
          onClick={handleBookmarkButtonClick}
          aria-label={localBookmarked ? 'ブックマーク解除' : 'ブックマーク追加'}
          className="flex flex-col items-center gap-0.5"
        >
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center shadow-md transition-colors ${
              localBookmarked
                ? 'bg-action text-action-fg'
                : 'bg-black/50 backdrop-blur text-white'
            }`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill={localBookmarked ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span className="text-white text-xs font-medium drop-shadow">
            {localCount.toLocaleString()}
          </span>
        </button>
      </div>

      {/* 下部グラデーションオーバーレイ */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-linear-to-t from-black/80 to-transparent pt-16 pb-4 px-4">
        <p className="text-white font-bold text-base leading-snug mb-2 line-clamp-2">
          {shelf.name}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-white/70 text-xs">
            閲覧
            {' '}
            {shelf.viewCount.toLocaleString()}
            {' '}
            ・ 保存
            {' '}
            {localCount.toLocaleString()}
          </span>
          <span className="text-xs bg-white/20 backdrop-blur text-white px-3 py-1 rounded-full border border-white/30">
            この本棚を見る →
          </span>
        </div>
      </div>
    </Link>
  )
}
