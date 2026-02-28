# Phase 15: /feed タイムライン 実装計画

Instagram Reels ライクなフルスクリーン縦スワイプ型タイムライン。

---

## 実装概要

```
┌─────────────────────────┐
│  ソートタブ (固定上部)    │  ← 新着順 / 保存数順 / おすすめ
├─────────────────────────┤
│                         │
│   FeedShelfCard         │  ← viewport 1枚 = 本棚1件
│   (書影グリッド9枚)      │
│   (タイトル・保存数)      │
│                         │
│   ← 左スワイプで解除     │
│   右スワイプで保存 →     │
├─────────────────────────┤
│  下部タブ (既存)         │
└─────────────────────────┘
```

- 縦スワイプ / ホイール / ↑↓キー で次の本棚へ (GSAP Y軸スライド)
- 左右スワイプでブックマーク (GSAP ハートアニメーション)
- 未ログインは 30回まで縦スワイプ可 → 上限でログイン誘導モーダル
- 末尾に近づいたら次ページを自動フェッチ (無限スクロール)

---

## STEP 1: 環境・API 準備

### 1-1. gsap インストール
- [ ] `bun add gsap` を実行
- [ ] `bun add -d @types/gsap` (型がなければスキップ)

### 1-2. .env に定数追加
- [ ] `.env` に `FEED_GUEST_SWIPE_LIMIT=30` を追加
- [ ] `.env.example` にも同じ行を追加

### 1-3. GET /api/feed エンドポイント新規作成
> shelves の GET は POST と共存が難しいため専用ルートを作る

- [ ] `app/routes/api.feed.ts` を新規作成
- [ ] クエリパラメータ:
  - `sort=latest|bookmarks|random` (default: `latest`)
  - `limit=20` (固定)
  - `offset=0`
- [ ] DB クエリ:
  - `latest` → `ORDER BY shelves.created_at DESC`
  - `bookmarks` → `ORDER BY shelves.bookmarks_count DESC`
  - `random` → `ORDER BY RANDOM()`
- [ ] レスポンス: `{ shelves: ShelfRow[], hasMore: boolean }`
  - `ShelfRow` = `{ id, name, userId, bookmarksCount, isbns: string[] }`
  - `isbns` は各 shelf の `shelf_books` から position 順で最大 9 件
- [ ] `routes.ts` に `route('api/feed', 'routes/api.feed.ts')` を追加

---

## STEP 2: FeedShelfCard コンポーネント

> `app/components/FeedShelfCard.tsx` を新規作成  
> このステップでは静的表示のみ。インタラクションは後のステップで追加する。

### 2-1. カードのレイアウト
- [ ] 高さ: `h-[calc(100dvh-48px-56px)]` (Header48px + BottomTabs56px を除いた全高)
  - PC: `lg:h-screen`（ヘッダー・タブなし）
- [ ] 幅: `w-full max-w-sm mx-auto`（スマホ幅基準）
- [ ] 背景: `bg-surface`、角丸なし

### 2-2. 書影グリッド (3×3)
- [ ] ISBNリストを受け取り、各セルで `/api/books/cache-status` → `/api/books/search` の  
  既存 2フェーズfetch パターンを使って書影を表示
- [ ] セルは正方形、書影は `object-cover`
- [ ] 書影取得中はスケルトン表示 (bg-sunken でフェード)

### 2-3. 情報エリア (カード下部オーバーレイ)
- [ ] 本棚名 (font-bold)
- [ ] 保存数アイコン + カウント
- [ ] 「この本棚を見る」→ `/shelf/:id` へのリンク

### 2-4. スワイプヒント (初回のみ)
- [ ] 初回訪問時のみ「↕ スワイプで次の本棚」をうっすら表示  
  → localStorage `feedHintShown` フラグで制御、表示後 2秒で fade-out

---

## STEP 3: feed.tsx Loader & 基本 UI

### 3-1. loader 実装
- [ ] `GET /api/feed?sort=latest&limit=20&offset=0` を SSR で fetch (server loader)
- [ ] 取得した初期データを `{ shelves, sort }` でクライアントに渡す
- [ ] sort は URL の `?sort=xxx` から読む (loader 内)

### 3-2. ソートタブ UI
- [ ] 画面最上部に固定配置 (`sticky top-12 lg:top-0 z-20`)
  - スマホ: Header(48px) の直下
  - PC: top-0
- [ ] タブ: `新着順` / `保存数順` / `おすすめ`
- [ ] タブクリックで URL `?sort=xxx` に変更 → loader が再実行

### 3-3. カードリスト State 管理
- [ ] `useState<ShelfRow[]>` で本棚リストを管理 (loader データで初期化)
- [ ] `currentIndex: number` で現在表示中のカードを管理
- [ ] `isFetching: boolean` で追加フェッチ中を管理

---

## STEP 4: 縦スワイプナビゲーション (GSAP)

> インタラクションの核。丁寧に実装する。

### 4-1. GSAP でカード切替アニメーション
- [ ] `useRef<HTMLDivElement>` でコンテナを参照
- [ ] `goTo(nextIndex)` 関数を実装:
  ```
  gsap.to(container, {
    y: -nextIndex * cardHeight,
    duration: 0.35,
    ease: 'power2.out',
  })
  ```
- [ ] `currentIndex` を更新後、次カードが見えたら書影フェッチ開始

### 4-2. タッチスワイプ検出
- [ ] `touchstart` で `startY` を記録
- [ ] `touchend` で `deltaY` を計算
  - `|deltaY| > 50px` かつ `|deltaX| < |deltaY|` の場合のみ縦スワイプと判定
  - `deltaY < 0` (上スワイプ) → `goTo(currentIndex + 1)`
  - `deltaY > 0` (下スワイプ) → `goTo(currentIndex - 1)`
- [ ] スワイプ中は `touchmove` をキャンセル (`e.preventDefault()`)
- [ ] アニメーション中は多重スワイプを無効化 (`isAnimating` フラグ)

### 4-3. マウスホイール検出 (PC)
- [ ] `wheel` イベントで `deltaY` を判定
  - `deltaY > 0` → next / `deltaY < 0` → prev
- [ ] throttle: 350ms 以内の連続 wheel は無視 (`isAnimating` フラグ共用)

### 4-4. キーボード操作 (PC)
- [ ] `keydown` で `ArrowDown` → next、`ArrowUp` → prev
- [ ] `isAnimating` 中は無視

---

## STEP 5: 無限スクロール

### 5-1. 残り枚数で追加フェッチ
- [ ] `currentIndex >= shelves.length - 5` になったら次ページを fetch
- [ ] `GET /api/feed?sort=xxx&offset=shelves.length` を叩く
- [ ] `hasMore: false` の場合はフェッチしない
- [ ] 取得結果を `shelves` state に append

### 5-2. ローディング表示
- [ ] 最終カードの次にスケルトンカードを表示 (フェッチ中のみ)

---

## STEP 6: 左右スワイプでブックマーク

### 6-1. 水平スワイプ検出
- [ ] `touchstart` の `startX`, `startY` を記録
- [ ] `touchend` で判定:
  - `|deltaX| > 80px` かつ `|deltaX| > |deltaY|` のみ水平スワイプと判定
  - 縦スワイプと排他制御
- [ ] `deltaX > 0` (右スワイプ) → ブックマーク追加
- [ ] `deltaX < 0` (左スワイプ) → ブックマーク解除

### 6-2. ブックマーク API 呼び出し
- [ ] ログイン済み: `POST /api/shelves/:id/bookmarks` or `DELETE` を呼び出す
- [ ] 楽観的更新: API 完了前に UI を更新し、失敗時にロールバック
- [ ] 未ログイン: スワイプカウントを加算するが、API は叩かない

### 6-3. GSAP ブックマークアニメーション
- [ ] 右スワイプ時: ハートアイコン (❤️) をカード中央に出現させ  
  `gsap.fromTo('#heart', { scale: 0, opacity: 1 }, { scale: 1.4, opacity: 0, duration: 0.6, ease: 'back.out' })`
- [ ] 左スワイプ時: バツアイコン (✕) を同様に表示

---

## STEP 7: 未ログインスワイプ制限

### 7-1. カウンター管理
- [ ] `sessionStorage.getItem('feedGuestSwipeCount')` で現在のカウントを取得
- [ ] 縦スワイプするたびに `+1` して保存
- [ ] `FEED_GUEST_SWIPE_LIMIT` (= 30) と比較
  - 上限に達したら `goTo()` をブロックし、ログイン誘導モーダルを表示

### 7-2. ログイン誘導モーダル
- [ ] `GuestLimitModal.tsx` を新規作成
- [ ] 文言: 「もっと本棚を見るにはログインしてください」
- [ ] 「ログイン / 登録」ボタン → `/sign-in`
- [ ] 「閉じる」ボタン → モーダルを閉じるが、スワイプは引き続き不可
- [ ] ESC キーでも「閉じる」と同動作

### 7-3. Analytics イベント送信
- [ ] `track('feed_guest_limit_reached', { swipeCount: limit })` を送信

---

## STEP 8: lint・型チェック・動作確認

- [ ] `bun run check:fix` を実行し 0 errors を確認
- [ ] `bun run dev` で以下を手動確認:
  - [ ] スマホ幅: 縦スワイプでカード切替・GSAP アニメーション
  - [ ] スマホ幅: 右スワイプでハートアニメーション
  - [ ] PC 幅: ホイール・↑↓キーで切替
  - [ ] 30回スワイプでログイン誘導モーダルが出る
  - [ ] 末尾で次ページが自動ロードされる
  - [ ] ソートタブ切替で並び順が変わる
