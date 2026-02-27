/**
 * UI文言・コピー管理
 * すべての表示テキストをここで一元管理する
 */

export const COPY = {
  // ─── サイト情報 ─────────────────────────────────────────────
  site: {
    name: 'my9books',
    hashtag: '#my9books',
    catchcopy: 'あなたを作った9冊を、シェアしよう。',
    subcopy:
      '人生に影響を与えた本、今の自分を形作った本。\n9冊という制限が、あなたの「本棚」を語る。',
    ogDescription: '私を構成する9冊の本を選んでシェアしよう',
  },

  // ─── SNS共有 ────────────────────────────────────────────────
  share: {
    /** ツイート本文 */
    tweetText: (shelfName: string): string =>
      `「${shelfName}」\n私を構成する9冊の本 #my9books`,
    /** OGタイトル */
    ogTitle: (shelfName: string): string => `${shelfName} | my9books`,
    /** URLコピー完了トースト */
    urlCopied: 'URLをコピーしました',
    tweetButtonLabel: 'ツイート',
    copyButtonLabel: 'URLをコピー',
  },

  // ─── トップページ ───────────────────────────────────────────
  top: {
    howToTitle: 'はじめ方',
    steps: [
      { title: '本を選ぶ', body: 'タイトルや著者名で検索して、9冊を選ぼう' },
      { title: '感想を添える', body: '一言コメントとネタバレ設定で本を紹介' },
      { title: 'シェアする', body: 'URLをシェアして、あなたの本棚を届けよう' },
    ],
  },

  // ─── 未ログイン誘導 ─────────────────────────────────────────
  auth: {
    /** 本棚閲覧ページ下部の未ログイン向けCTA */
    ctaTitle: 'あなたの9冊を作ってみませんか？',
    ctaButton: 'ログインして本棚を作る',
    /** 新規登録ボタン */
    signUpButton: '無料ではじめる',
    /** いいね・ブックマーク（v2） */
    likePrompt: 'ログインするといいねができます',
    bookmarkPrompt: '気になる本棚をブックマーク',
    /** 投稿誘導 */
    createPrompt: 'ログインして本棚を作成',
  },

  // ─── 空状態 ─────────────────────────────────────────────────
  empty: {
    shelf: 'まだ本棚がありません',
    shelfSub: '最初の9冊を選んでみよう',
    slot: '本を追加する',
  },

  // ─── 確認・アクション ────────────────────────────────────────
  action: {
    deleteShelfTitle: 'この本棚を削除しますか？',
    deleteShelfBody: 'この操作は元に戻せません。',
    deleteConfirm: '削除する',
    cancel: 'キャンセル',
    save: '保存する',
    saving: '保存中...',
    creating: '作成中...',
    create: '本棚を作成',
    edit: '編集',
    delete: '削除',
    back: '戻る',
    close: '閉じる',
  },

  // ─── 書籍・本棚 ─────────────────────────────────────────────
  book: {
    /** ネタバレ */
    spoilerLabel: 'ネタバレを含む感想です',
    spoilerReveal: 'タップして表示する',
    /** モーダル */
    amazonButton: 'Amazonで見る',
    rakutenButton: '楽天ブックスで見る',
    rakutenSearchButton: '楽天ブックスで検索',
  },

  // ─── フォーム ────────────────────────────────────────────────
  form: {
    shelfNameLabel: 'Shelf名',
    shelfNamePlaceholder: '例: 2024年に読んだベスト本',
    addBookLabel: '本を追加',
    searchPlaceholder: 'タイトルや著者名で検索...',
    reviewPlaceholder: '感想・紹介文（任意）',
    spoilerCheckbox: 'ネタバレを含む',
    dragHint: 'ドラッグで並び替えができます',
    confirmLessThan9Title: '9冊に満たない状態です',
    confirmLessThan9Body: (count: number): string =>
      `${count}冊が選択されています。このまま作成しますか？`,
    confirmCreateButton: 'このまま作成',
    backToAddButton: '戻って追加',
  },

  // ─── 状態・フィードバック ────────────────────────────────────
  status: {
    searching: '検索中...',
    loading: '読み込み中...',
    viewCount: (count: number): string => `${count.toLocaleString()} 閲覧`,
    bookCount: (current: number, max: number): string =>
      `(${current}/${max}冊)`,
    shelfCount: (count: number): string => `${count}件`,
  },
} as const
