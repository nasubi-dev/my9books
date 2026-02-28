import type { JSX } from 'react'
import { useLocation } from 'react-router'
import { BottomTabs } from './BottomTabs'
import { Header } from './Header'
import { SideNav } from './SideNav'

interface AppShellProps {
  children: React.ReactNode
}

/** ナビゲーションを非表示にするパス（完全一致） */
const NO_NAV_PATHS = ['/']

/**
 * レイアウト切替コンテナ
 * - `/` (トップ): ナビなし
 * - その他:
 *   - スマホ (< lg): 上部Header + 下部BottomTabs
 *   - PC (≥ lg): 左固定SideNav、Header/BottomTabs は非表示
 */
export function AppShell({ children }: AppShellProps): JSX.Element {
  const { pathname } = useLocation()
  const showNav = !NO_NAV_PATHS.includes(pathname)

  if (!showNav) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* PC: 左サイドバー */}
      <SideNav />

      {/* スマホ: 上部ヘッダー */}
      <Header />

      {/* メインコンテンツ */}
      {/*
        lg以上: SideNavの幅(w-60=240px)分オフセット
        スマホ: Header(h-12=48px) + BottomTabs(h-14=56px) 分のパディング
      */}
      <main className="lg:ml-60 pt-0 pb-14 lg:pb-0">
        {children}
      </main>

      {/* スマホ: 下部タブ */}
      <BottomTabs />
    </div>
  )
}
