import type { JSX } from 'react'
import { useEffect, useRef } from 'react'
import { COPY } from '../lib/copy'

interface AuthorModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AuthorModal({ isOpen, onClose }: AuthorModalProps): JSX.Element | null {
  const dialogRef = useRef<HTMLDivElement>(null)

  // フォーカストラップ & ESC で閉じる
  useEffect(() => {
    if (!isOpen)
      return
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape')
        onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  // 背景スクロールをロック
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen)
    return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={COPY.author.modalAriaLabel}
    >
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-text/30"
        onClick={onClose}
        onKeyDown={e => e.key === 'Enter' && onClose()}
        role="button"
        tabIndex={-1}
        aria-label="閉じる"
      />

      {/* モーダル本体 */}
      <div
        ref={dialogRef}
        className="relative z-10 w-full sm:max-w-sm bg-surface rounded-t-xl sm:rounded-xl shadow-overlay mx-0 sm:mx-4 p-6"
      >
        {/* 閉じるボタン */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-md text-text-secondary hover:bg-sunken transition-colors"
          aria-label="閉じる"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        {/* プロフィール */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 border rounded-full bg-sunken flex items-center justify-center text-xl">
            <img src={COPY.author.iconUrl} alt={COPY.author.name} className="w-full h-full rounded-full object-cover" />
          </div>
          <div>
            <p className="font-semibold text-text text-sm">{COPY.author.name}</p>
            <p className="text-text-secondary text-xs">{COPY.author.handle}</p>
          </div>
        </div>

        <p className="text-text-secondary text-sm leading-relaxed mb-5">
          {COPY.author.bio}
        </p>

        {/* GitHub リンク */}
        <a
          href={COPY.author.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border hover:bg-sunken transition-colors text-sm text-text w-full"
        >
          {/* GitHub icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
          {COPY.author.githubLinkText}
        </a>

        {/* X (Twitter) リンク */}
        <a
          href={COPY.author.twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border hover:bg-sunken transition-colors text-sm text-text w-full mt-2"
        >
          {/* X icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          {COPY.author.twitterLinkText}
        </a>
        {' '}

      </div>
    </div>
  )
}
