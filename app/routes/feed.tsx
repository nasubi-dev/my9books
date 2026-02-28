import type { JSX } from 'react'
import type { Route } from './+types/feed'
import type { FeedShelfRow } from './api.feed'
import { useUser } from '@clerk/react-router'
import { asc, desc, inArray, sql } from 'drizzle-orm'
import gsap from 'gsap'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLoaderData, useNavigate, useSearchParams } from 'react-router'
import { FeedShelfCard } from '../components/FeedShelfCard'
import { GuestLimitModal } from '../components/GuestLimitModal'
import { db } from '../db'
import { shelfBooks, shelves } from '../db/schema'

const LIMIT = 20

type SortType = 'latest' | 'bookmarks' | 'random'

// ─── Meta ────────────────────────────────────────────────────

export function meta(): Route.MetaDescriptors {
  return [
    { title: 'フィード | my9books' },
    { name: 'description', content: 'みんなの本棚をスワイプして発見しよう' },
  ]
}

// ─── Loader ──────────────────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const sort = (url.searchParams.get('sort') ?? 'latest') as SortType
  const guestSwipeLimit = Number(process.env.FEED_GUEST_SWIPE_LIMIT ?? 30)

  const sel = db
    .select({
      id: shelves.id,
      name: shelves.name,
      userId: shelves.userId,
      likesCount: shelves.likesCount,
      bookmarksCount: shelves.bookmarksCount,
      viewCount: shelves.viewCount,
      createdAt: shelves.createdAt,
    })
    .from(shelves)

  const order
    = sort === 'bookmarks'
      ? desc(shelves.bookmarksCount)
      : sort === 'random'
        ? sql`RANDOM()`
        : desc(shelves.createdAt)

  const rows = await sel.orderBy(order).limit(LIMIT + 1).offset(0)
  const hasMore = rows.length > LIMIT
  const pageRows = rows.slice(0, LIMIT)

  const isbnMap: Record<string, string[]> = {}
  if (pageRows.length > 0) {
    const allBooks = await db
      .select({ shelfId: shelfBooks.shelfId, isbn: shelfBooks.isbn })
      .from(shelfBooks)
      .where(inArray(shelfBooks.shelfId, pageRows.map(r => r.id)))
      .orderBy(asc(shelfBooks.position))

    for (const b of allBooks) {
      if (!isbnMap[b.shelfId])
        isbnMap[b.shelfId] = []
      if (isbnMap[b.shelfId].length < 9)
        isbnMap[b.shelfId].push(b.isbn)
    }
  }

  const initialShelves: FeedShelfRow[] = pageRows.map(r => ({
    ...r,
    isbns: isbnMap[r.id] ?? [],
  }))

  return { initialShelves, initialHasMore: hasMore, sort, guestSwipeLimit }
}

// ─── SortTabs ────────────────────────────────────────────────

const SORT_TABS: { key: SortType, label: string }[] = [
  { key: 'latest', label: '新着順' },
  { key: 'bookmarks', label: '保存数順' },
  { key: 'random', label: 'おすすめ' },
]

function SortTabs({
  current,
  onChange,
}: {
  current: SortType
  onChange: (s: SortType) => void
}): JSX.Element {
  return (
    <div className="flex justify-center items-center h-12 pointer-events-none">
      <div className="flex items-center gap-1 bg-black/60 rounded-full px-1.5 py-1.5 pointer-events-auto">
        {SORT_TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`text-xs font-medium px-4 py-1.5 rounded-full transition-all ${
              current === tab.key
                ? 'bg-white text-black font-semibold'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────

export default function FeedPage(): JSX.Element {
  const { initialShelves, initialHasMore, sort: initSort, guestSwipeLimit }
    = useLoaderData<typeof loader>()
  const { isSignedIn } = useUser()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // ─ State ─────────────────────────────────────────────────
  const [sort, setSort] = useState<SortType>(initSort)
  const [shelfList, setShelfList] = useState<FeedShelfRow[]>(initialShelves)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFetching, setIsFetching] = useState(false)
  const [likedIds, setLikedIds] = useState<Set<string>>(() => new Set())
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => new Set())
  const [guestModalOpen, setGuestModalOpen] = useState(false)
  const [guestModalReason, setGuestModalReason] = useState<'limit' | 'action'>('limit')
  const [showHint, setShowHint] = useState(false)

  // ─ Refs（イベントハンドラ用ミュータブルな最新値） ──────────
  const viewportRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isAnimatingRef = useRef(false)
  const currentIndexRef = useRef(0)
  const cardHeightRef = useRef(0)
  const touchStartRef = useRef({ x: 0, y: 0 })
  const lastWheelAtRef = useRef(0)
  const sortRef = useRef(sort)
  const shelfListRef = useRef(shelfList)
  const hasMoreRef = useRef(hasMore)
  const isFetchingRef = useRef(isFetching)
  const isSignedInRef = useRef(isSignedIn)
  const guestLimitReachedRef = useRef(false)
  const guestSwipeLimitRef = useRef(guestSwipeLimit)

  useEffect(() => {
    sortRef.current = sort
  }, [sort])
  useEffect(() => {
    shelfListRef.current = shelfList
  }, [shelfList])
  useEffect(() => {
    hasMoreRef.current = hasMore
  }, [hasMore])
  useEffect(() => {
    isFetchingRef.current = isFetching
  }, [isFetching])
  useEffect(() => {
    isSignedInRef.current = isSignedIn
  }, [isSignedIn])
  useEffect(() => {
    guestSwipeLimitRef.current = guestSwipeLimit
  }, [guestSwipeLimit])

  // ページ表示中はbodyスクロールを無効化
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // ─ 初回スワイプヒント ──────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined')
      return
    if (!localStorage.getItem('feedHintShown')) {
      setShowHint(true)
      localStorage.setItem('feedHintShown', '1')
      const t = setTimeout(() => setShowHint(false), 2500)
      return () => clearTimeout(t)
    }
  }, [])

  // ─ 高さ測定 & リサイズ対応 ──────────────────────────────────
  useLayoutEffect(() => {
    function measure(): void {
      if (!viewportRef.current)
        return
      cardHeightRef.current = viewportRef.current.clientHeight
      if (containerRef.current) {
        gsap.set(containerRef.current, {
          y: -currentIndexRef.current * cardHeightRef.current,
        })
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // ─ 追加フェッチ ────────────────────────────────────────────
  const fetchMore = useCallback(async (s: SortType, offset: number) => {
    if (isFetchingRef.current)
      return
    if (offset > 0 && !hasMoreRef.current)
      return
    setIsFetching(true)
    isFetchingRef.current = true
    try {
      const res = await fetch(`/api/feed?sort=${s}&offset=${offset}`)
      const data = (await res.json()) as { shelves: FeedShelfRow[], hasMore: boolean }
      if (offset === 0) {
        setShelfList(data.shelves)
      }
      else {
        setShelfList(prev => [...prev, ...data.shelves])
      }
      setHasMore(data.hasMore)
      hasMoreRef.current = data.hasMore
    }
    catch {}
    setIsFetching(false)
    isFetchingRef.current = false
  }, [])

  // ─ ソート変更 ──────────────────────────────────────────────
  useEffect(() => {
    const newSort = (searchParams.get('sort') ?? 'latest') as SortType
    if (newSort === sortRef.current)
      return
    setSort(newSort)
    setCurrentIndex(0)
    currentIndexRef.current = 0
    if (containerRef.current) {
      gsap.set(containerRef.current, { y: 0 })
    }
    hasMoreRef.current = true
    fetchMore(newSort, 0)
  }, [searchParams, fetchMore])

  // ─ ゲストカウンター ────────────────────────────────────────
  function checkAndIncGuestSwipe(): boolean {
    if (isSignedInRef.current)
      return true
    const next = Number(sessionStorage.getItem('feedGuestSwipeCount') ?? 0) + 1
    sessionStorage.setItem('feedGuestSwipeCount', String(next))
    if (next >= guestSwipeLimitRef.current) {
      try {
        ;(window as any).gtag?.('event', 'feed_guest_limit_reached', { swipeCount: next })
      }
      catch {}
      guestLimitReachedRef.current = true
      setGuestModalReason('limit')
      setGuestModalOpen(true)
      return false
    }
    return true
  }

  // ─ カード移動 ─────────────────────────────────────────────
  const goTo = useCallback((nextIndex: number) => {
    const list = shelfListRef.current
    if (nextIndex < 0 || nextIndex >= list.length)
      return
    if (isAnimatingRef.current)
      return
    if (guestLimitReachedRef.current) {
      setGuestModalReason('limit')
      setGuestModalOpen(true)
      return
    }
    // 前進時のみゲストカウントチェック
    if (nextIndex > currentIndexRef.current) {
      if (!checkAndIncGuestSwipe())
        return
    }

    isAnimatingRef.current = true
    currentIndexRef.current = nextIndex
    setCurrentIndex(nextIndex)

    // 残り5件で次ページフェッチ
    if (nextIndex >= list.length - 5 && hasMoreRef.current) {
      void fetchMore(sortRef.current, list.length)
    }

    gsap.to(containerRef.current, {
      y: -nextIndex * cardHeightRef.current,
      duration: 0.38,
      ease: 'power2.out',
      onComplete: () => {
        isAnimatingRef.current = false
      },
    })
  }, [fetchMore])

  // ─ いいね・ブックマーク ────────────────────────────────────
  function toggleLike(shelfId: string, intent: 'add' | 'remove'): void {
    if (!isSignedInRef.current)
      return
    const prevLiked = likedIds.has(shelfId)
    setLikedIds((prev) => {
      const next = new Set(prev)
      if (intent === 'add')
        next.add(shelfId)
      else
        next.delete(shelfId)
      return next
    })
    fetch(`/api/shelves/${shelfId}/likes`, {
      method: intent === 'add' ? 'POST' : 'DELETE',
    }).catch(() => {
      setLikedIds((prev) => {
        const next = new Set(prev)
        if (prevLiked)
          next.add(shelfId)
        else
          next.delete(shelfId)
        return next
      })
    })
  }

  function handleLikeToggle(shelfId: string, liked: boolean): void {
    toggleLike(shelfId, liked ? 'add' : 'remove')
  }

  function toggleBookmark(shelfId: string, intent: 'add' | 'remove'): void {
    if (!isSignedInRef.current)
      return

    const prevBookmarked = bookmarkedIds.has(shelfId)
    // 楽観的更新
    setBookmarkedIds((prev) => {
      const next = new Set(prev)
      if (intent === 'add')
        next.add(shelfId)
      else
        next.delete(shelfId)
      return next
    })
    fetch(`/api/shelves/${shelfId}/bookmarks`, {
      method: intent === 'add' ? 'POST' : 'DELETE',
    }).catch(() => {
      // ロールバック
      setBookmarkedIds((prev) => {
        const next = new Set(prev)
        if (prevBookmarked)
          next.add(shelfId)
        else
          next.delete(shelfId)
        return next
      })
    })
  }

  function handleBookmarkToggle(shelfId: string, bookmarked: boolean): void {
    toggleBookmark(shelfId, bookmarked ? 'add' : 'remove')
  }

  // ─ タッチイベント ──────────────────────────────────────────
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport)
      return

    let activeTouchId: number | null = null

    function onTouchStart(e: TouchEvent): void {
      const t = e.touches[0]
      if (!t)
        return
      activeTouchId = t.identifier
      touchStartRef.current = { x: t.clientX, y: t.clientY }
    }

    function onTouchMove(e: TouchEvent): void {
      if (activeTouchId === null)
        return
      const t = Array.from(e.changedTouches).find(tt => tt.identifier === activeTouchId)
      if (!t)
        return
      const dx = t.clientX - touchStartRef.current.x
      const dy = t.clientY - touchStartRef.current.y
      if (Math.abs(dy) > Math.abs(dx))
        e.preventDefault()
    }

    function onTouchEnd(e: TouchEvent): void {
      if (activeTouchId === null)
        return
      const t = Array.from(e.changedTouches).find(tt => tt.identifier === activeTouchId)
      if (!t)
        return
      activeTouchId = null

      const dy = t.clientY - touchStartRef.current.y
      const absDy = Math.abs(dy)

      if (absDy > 50) {
        // 縦スワイプ → ナビ
        if (dy < 0) {
          goTo(currentIndexRef.current + 1)
        }
        else {
          goTo(currentIndexRef.current - 1)
        }
      }
    }

    viewport.addEventListener('touchstart', onTouchStart, { passive: true })
    viewport.addEventListener('touchmove', onTouchMove, { passive: false })
    viewport.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      viewport.removeEventListener('touchstart', onTouchStart)
      viewport.removeEventListener('touchmove', onTouchMove)
      viewport.removeEventListener('touchend', onTouchEnd)
    }
  }, [goTo])

  // ─ ホイール (PC) ───────────────────────────────────────────
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport)
      return

    function onWheel(e: WheelEvent): void {
      e.preventDefault()
      const now = Date.now()
      if (now - lastWheelAtRef.current < 400)
        return
      lastWheelAtRef.current = now
      if (e.deltaY > 0) {
        goTo(currentIndexRef.current + 1)
      }
      else {
        goTo(currentIndexRef.current - 1)
      }
    }

    viewport.addEventListener('wheel', onWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', onWheel)
  }, [goTo])

  // ─ キーボード (PC) ─────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'button')
        return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        goTo(currentIndexRef.current + 1)
      }
      else if (e.key === 'ArrowUp') {
        e.preventDefault()
        goTo(currentIndexRef.current - 1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [goTo])

  // ─ ソートタブ変更 ──────────────────────────────────────────
  function handleSortChange(newSort: SortType): void {
    navigate(`/feed?sort=${newSort}`, { replace: true })
  }

  // カード高さクラス（SortTabs はオーバーレイのため高さに含めない）
  // モバイル: 100dvh - Header(48) - BottomTabs(56) = 104px
  // PC:       100dvh
  const cardHeightClass = 'h-[calc(100dvh-104px)] lg:h-screen'

  return (
    <div className="relative h-[calc(100dvh-104px)] lg:h-screen overflow-hidden">
      {/* ソートタブ：書影の上にオーバーレイ */}
      <div className="absolute top-0 left-0 right-0 z-20">
        <SortTabs current={sort} onChange={handleSortChange} />
      </div>

      {/* フィードビューポート */}
      <div
        ref={viewportRef}
        className="absolute inset-0 bg-black"
        style={{ touchAction: 'none' }}
      >
        {/* GSAP スライドコンテナ */}
        <div
          ref={containerRef}
          className="absolute top-0 left-0 w-full will-change-transform"
        >
          {shelfList.map((shelf, i) => (
            <FeedShelfCard
              key={`${shelf.id}-${sort}`}
              shelf={shelf}
              isActive={Math.abs(i - currentIndex) <= 1}
              isSignedIn={!!isSignedIn}
              onNeedLogin={() => {
                setGuestModalReason('action')
                setGuestModalOpen(true)
              }}
              isLiked={likedIds.has(shelf.id)}
              onLikeToggle={handleLikeToggle}
              isBookmarked={bookmarkedIds.has(shelf.id)}
              onBookmarkToggle={handleBookmarkToggle}
              heightClass={cardHeightClass}
            />
          ))}
          {/* ローディングスケルトン */}
          {isFetching && (
            <div className={`w-full bg-sunken animate-pulse ${cardHeightClass}`} />
          )}
        </div>

        {/* 初回スワイプヒント */}
        <div
          className={`pointer-events-none absolute inset-0 flex items-center justify-center z-40 transition-opacity duration-700 ${showHint ? 'opacity-100' : 'opacity-0'}`}
        >
          <div className="bg-black/60 text-white text-sm px-5 py-3 rounded-xl backdrop-blur-sm select-none">
            ↕ スワイプで次の本棚
          </div>
        </div>

        {/* 空状態 */}
        {shelfList.length === 0 && !isFetching && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-text-tertiary gap-3">
            <div className="text-4xl">📭</div>
            <p className="text-sm">表示できる本棚がありません</p>
          </div>
        )}
      </div>

      {/* ゲスト制限モーダル */}
      <GuestLimitModal
        isOpen={guestModalOpen}
        onClose={() => setGuestModalOpen(false)}
        reason={guestModalReason}
      />
    </div>
  )
}
