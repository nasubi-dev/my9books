import type { JSX } from 'react'
import { useClerk, useUser } from '@clerk/react-router'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { AuthorModal } from './AuthorModal'

interface NavItem {
  label: string
  to: string
  disabled?: boolean
  icon: (active: boolean) => JSX.Element
}

const NAV_ITEMS: NavItem[] = [
  {
    label: '検索',
    to: '/search',
    icon: active => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.2' : '1.8'} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    ),
  },
  {
    label: '新規投稿',
    to: '/shelf/new',
    icon: active => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.2' : '1.8'} strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    ),
  },
  {
    label: 'フィード',
    to: '/feed',
    icon: active => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    label: 'マイページ',
    to: '/me',
    icon: active => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
  {
    label: '通知',
    to: '/notifications',
    disabled: true,
    icon: _active => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
    ),
  },
]

/**
 * PC専用左サイドバー (lg未満では非表示)
 * スマホ下部タブ5本 ＋ アカウント操作を包含する
 */
export function SideNav(): JSX.Element {
  const { pathname } = useLocation()
  const { isSignedIn, user } = useUser()
  const { signOut } = useClerk()
  const navigate = useNavigate()
  const [authorOpen, setAuthorOpen] = useState(false)

  async function handleSignOut(): Promise<void> {
    await signOut()
    navigate('/')
  }

  return (
    <>
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-60 bg-surface border-r border-border z-30">
        {/* ロゴ */}
        <div className="px-5 pt-6 pb-4">
          <Link
            to="/feed"
            className="font-black text-lg tracking-tight text-text"
            prefetch="intent"
          >
            my9books
          </Link>
        </div>

        {/* ナビリンク */}
        <nav className="flex-1 px-3 space-y-0.5" aria-label="メインナビゲーション">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.to || (item.to !== '/feed' && pathname.startsWith(item.to))

            if (item.disabled) {
              return (
                <span
                  key={item.to}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-disabled cursor-not-allowed select-none"
                >
                  {item.icon(false)}
                  {item.label}
                  <span className="ml-auto text-[10px] bg-sunken text-text-disabled px-1.5 py-0.5 rounded-full">近日</span>
                </span>
              )
            }

            return (
              <Link
                key={item.to}
                to={item.to}
                prefetch="intent"
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-sunken text-text font-medium'
                    : 'text-text-secondary hover:bg-surface-hover hover:text-text'
                }`}
              >
                {item.icon(active)}
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* 下部: アカウント */}
        <div className="px-3 pb-5 pt-3 border-t border-border space-y-1">
          {isSignedIn && user
            ? (
                <>
                  {/* ユーザー情報 */}
                  <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
                    {user.imageUrl
                      ? (
                          <img
                            src={user.imageUrl}
                            alt={user.firstName ?? 'アカウント'}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                        )
                      : (
                          <div className="w-7 h-7 rounded-full bg-sunken flex items-center justify-center text-xs text-text-secondary">
                            {(user.firstName ?? 'U').charAt(0)}
                          </div>
                        )}
                    <span className="text-sm text-text font-medium truncate max-w-[130px]">
                      {user.firstName ?? 'ユーザー'}
                    </span>
                  </div>

                  {/* 登録情報の変更（Clerk UserProfile） */}
                  <a
                    href="/user-profile"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-surface-hover hover:text-text transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                    登録情報の変更
                  </a>

                  {/* ログアウト */}
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-surface-hover hover:text-text transition-colors w-full text-left"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    ログアウト
                  </button>
                </>
              )
            : (
                <Link
                  to="/sign-in"
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm bg-action text-action-fg hover:bg-action-hover transition-colors w-full"
                >
                  ログイン
                </Link>
              )}

          {/* 製作者情報 */}
          <button
            type="button"
            onClick={() => setAuthorOpen(true)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-tertiary hover:bg-surface-hover hover:text-text-secondary transition-colors w-full text-left"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            製作者情報
          </button>
        </div>
      </aside>

      <AuthorModal isOpen={authorOpen} onClose={() => setAuthorOpen(false)} />
    </>
  )
}
