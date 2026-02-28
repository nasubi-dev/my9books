import type { JSX } from 'react'
import type { Route } from './+types/feed'

// ─── Meta ────────────────────────────────────────────────────

export function meta(): Route.MetaDescriptors {
  return [
    { title: 'フィード | my9books' },
    { name: 'description', content: 'みんなの本棚をスワイプして発見しよう' },
  ]
}

// ─── Page ────────────────────────────────────────────────────

export default function FeedPage(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="text-4xl mb-4">📚</div>
      <h1 className="text-xl font-bold text-text mb-2">フィード</h1>
      <p className="text-text-secondary text-sm">
        みんなの本棚が並ぶタイムラインです。
        <br />
        coming soon…
      </p>
    </div>
  )
}
