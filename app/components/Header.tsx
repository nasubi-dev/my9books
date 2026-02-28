import type { JSX } from 'react'
import { useState } from 'react'
import { Link } from 'react-router'
import { AuthorModal } from './AuthorModal'

/**
 * スマホ専用ヘッダー (lg以上では非表示)
 * ロゴ（左）＋ 製作者アイコン（右）＋ 通知アイコン（右端）
 */
export function Header(): JSX.Element {
  const [authorOpen, setAuthorOpen] = useState(false)

  return (
    <>
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between h-12 px-4 bg-surface border-b border-border">
        {/* ロゴ */}
        <Link
          to="/feed"
          className="font-black text-base tracking-tight text-text"
          prefetch="intent"
        >
          my9books
        </Link>

        {/* 右側アイコングループ */}
        <div className="flex items-center gap-0.5">
          {/* 製作者情報ボタン */}
          <button
            type="button"
            onClick={() => setAuthorOpen(true)}
            className="p-1.5 rounded-md text-text-secondary hover:bg-sunken transition-colors"
            aria-label="製作者情報"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </button>

          {/* 通知アイコン（v3 実装までは表示のみ） */}
          <button
            type="button"
            disabled
            className="p-1.5 rounded-md text-text-disabled cursor-not-allowed"
            aria-label="通知（準備中）"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </button>
        </div>
      </header>

      <AuthorModal isOpen={authorOpen} onClose={() => setAuthorOpen(false)} />
    </>
  )
}
