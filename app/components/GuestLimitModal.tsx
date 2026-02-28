import type { JSX } from 'react'
import { useEffect } from 'react'
import { Link } from 'react-router'
import { COPY } from '../lib/copy'

interface GuestLimitModalProps {
  isOpen: boolean
  onClose: () => void
  /** 'limit': スワイプ上限到達 | 'action': いいね/ブックマーク操作 */
  reason?: 'limit' | 'action'
}

export function GuestLimitModal({ isOpen, onClose, reason = 'limit' }: GuestLimitModalProps): JSX.Element | null {
  // ESC で閉じる
  useEffect(() => {
    if (!isOpen)
      return
    function handleKey(e: KeyboardEvent): void {
      if (e.key === 'Escape')
        onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen)
    return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={COPY.guestModal.ariaLabel}
    >
      <div
        className="w-full sm:max-w-sm bg-surface rounded-t-2xl sm:rounded-2xl p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* アイコン */}
        <div className="text-center text-5xl mb-4">📚</div>

        {/* テキスト */}
        <h2 className="text-center text-lg font-bold text-text mb-2">
          {reason === 'action' ? COPY.guestModal.actionTitle : COPY.guestModal.limitTitle}
        </h2>
        <p className="text-center text-sm text-text-secondary mb-6">
          {reason === 'action'
            ? (
                <>
                  {COPY.guestModal.actionBody1}
                  <br />
                  {COPY.guestModal.actionBody2}
                </>
              )
            : (
                <>
                  {COPY.guestModal.limitBody1}
                  <br />
                  {COPY.guestModal.limitBody2}
                </>
              )}
        </p>

        {/* ボタン */}
        <div className="flex flex-col gap-3">
          <Link
            to="/sign-in"
            className="w-full text-center py-3 rounded-lg bg-action text-action-fg font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            {COPY.guestModal.loginButton}
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="w-full text-center py-2 text-sm text-text-secondary hover:text-text transition-colors"
          >
            {reason === 'action' ? COPY.guestModal.closeAction : COPY.guestModal.closeLimit}
          </button>
        </div>
      </div>
    </div>
  )
}
