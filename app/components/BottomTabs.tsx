import type { JSX } from 'react'
import { Link, useLocation } from 'react-router'

interface Tab {
  label: string
  to: string
  icon: (active: boolean) => JSX.Element
  disabled?: boolean
}

const TABS: Tab[] = [
  {
    label: '検索',
    to: '/search',
    icon: active => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.2' : '1.8'} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    ),
  },
  {
    label: '投稿',
    to: '/shelf/new',
    icon: _active => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    ),
  },
  {
    label: 'フィード',
    to: '/feed',
    icon: active => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    label: 'マイページ',
    to: '/me',
    icon: active => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
]

/**
 * スマホ専用下部タブ (lg以上では非表示)
 */
export function BottomTabs(): JSX.Element {
  const { pathname } = useLocation()

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface border-t border-border"
      aria-label="メインナビゲーション"
    >
      <ul className="flex h-14">
        {TABS.map((tab) => {
          const active = pathname === tab.to || (tab.to !== '/feed' && pathname.startsWith(tab.to))

          if (tab.disabled) {
            return (
              <li key={tab.to} className="flex-1">
                <span className="flex flex-col items-center justify-center h-full gap-0.5 text-text-disabled cursor-not-allowed select-none">
                  {tab.icon(false)}
                  <span className="text-[10px] leading-none">{tab.label}</span>
                </span>
              </li>
            )
          }

          return (
            <li key={tab.to} className="flex-1">
              <Link
                to={tab.to}
                prefetch="intent"
                className={`flex flex-col items-center justify-center h-full gap-0.5 transition-colors ${
                  active ? 'text-text' : 'text-text-tertiary'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                {tab.icon(active)}
                <span className="text-[10px] leading-none">{tab.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
