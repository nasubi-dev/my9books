/**
 * UI文言・コピー管理
 * すべての表示テキストをここで一元管理する
 */

export const COPY = {
  // ─── サイト情報 ─────────────────────────────────────────────
  site: {
    name: 'my9books',
    hashtag: '#my9books',
    catchcopy: 'あなたをかたちづくる\n9冊を、シェアしよう。',
    subcopy:
      '読んできた本が、思考をつくる。\n出会った言葉が、価値観をつくる。\nあなたをかたちづくってきた9冊を選んで、\nあなたという人を、誰かに届けよう。',
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
    feedButton: 'みんなの本棚を見てみる',
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

  // ─── 作者情報 ─────────────────────────────────────────────────
  author: {
    name: 'なすび',
    handle: '@nasubi_dev',
    bio: 'my9books を作っています。本が好きで、それを誰かに伝えたくてこのサービスを作りました。',
    githubUrl: 'https://github.com/nasubi-dev/my9books',
    githubLinkText: 'ソースコードを見る',
    twitterUrl: 'https://x.com/nasubi_dev',
    twitterLinkText: 'X (Twitter) でフォロー',
    modalAriaLabel: '製作者情報',
    iconUrl: '/nasubi.webp',
  },

  // ─── ゲスト制限モーダル ──────────────────────────────────────
  guestModal: {
    ariaLabel: 'ログイン誘導',
    actionTitle: 'ログインが必要です',
    limitTitle: 'もっと本棚を見るには',
    actionBody1: 'いいね・ブックマークを保存するには',
    actionBody2: 'ログインが必要です。',
    limitBody1: 'ログインするとブックマーク保存や、',
    limitBody2: '続きのフィードが楽しめます。',
    loginButton: 'ログイン / 新規登録',
    closeAction: '閉じる',
    closeLimit: '閉じる（スワイプ不可のまま）',
  },

  // ─── ページタイトル・メタ ────────────────────────────────────
  meta: {
    feed: 'フィード | my9books',
    searchDefault: '検索 | my9books',
    searchQuery: (q: string): string => `「${q}」の検索結果 | my9books`,
    shelfFallback: 'my9books',
  },

  // ─── マイページ系 ────────────────────────────────────────────
  myPage: {
    loggedInSub: 'マイページから本棚を管理しよう',
    guestSub: 'ログインしてあなたの9冊を選ぼう',
    button: 'マイページへ',
  },
  // ─── フッター ───────────────────────────────────────
  footer: {
    copyright: '© 2025 my9books',
    affiliate: '本サービスはアフィリエイトプログラムを利用しています',
    githubLinkText: 'GitHub',
  },
} as const
