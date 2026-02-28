# book-meta-cache 剥がし方ガイド

## 概要

楽天/Google Books API へのリクエスト過多によるエラーを抑制するために、以下の2点を実装しています。

1. **サーバーサイドインメモリキャッシュ**（`app/lib/book-meta-cache.ts`）  
   同一ISBNクエリの結果を TTL 24時間でメモリ保持。キャッシュヒット時は外部APIを叩かない。
2. **クライアント側の並列fetch + AbortController**  
   タイマー stagger を廃止し、全ISBNを同時発火。ページ離脱時は `controller.abort()` でキャンセル。

> **注意**: Vercel などサーバーレス環境ではリクエストごとにプロセスが異なるため、キャッシュが効かない場合があります。

---

## 変更されたファイル一覧

| ファイル | 変更内容 |
|---|---|
| `app/lib/book-meta-cache.ts` | キャッシュ本体 + `getBatchCacheStatus` 関数（新規作成） |
| `app/routes/api.books.search.ts` | キャッシュ参照・書き込み、env フラグ制御 |
| `app/routes/api.books.cache-status.ts` | 複数ISBNのキャッシュ一括チェックAPI（新規作成） |
| `app/routes/shelf.$id.tsx` | 2フェーズfetch（キャッシュ済み一括 / 未キャッシュ stagger） |
| `app/routes/me.tsx` | 同上 |
| `app/routes.ts` | `api/books/cache-status` ルート追加 |
| `.env` / `.env.example` | `BOOK_META_CACHE_ENABLED=true` を追加 |

---

## 即時無効化（キャッシュだけ止めたい場合）

`.env` の値を変更するだけでキャッシュを無効化できます。再デプロイ不要。

```
BOOK_META_CACHE_ENABLED=false
```

---

## 完全に剥がす手順

### Step 1: `api.books.search.ts` を元に戻す

```diff
- import {
-   getCachedBookSearch,
-   setCachedBookSearch,
- } from '../lib/book-meta-cache'

  // GET /api/books/search?q={query}
  // 楽天ブックス + Google Books を並列検索し、ISBN で重複排除（楽天優先）
- // ⚠️ サーバーサイドインメモリキャッシュ（TTL 24h）を使用してリクエスト数を削減
  export async function loader({ request }: Route.LoaderArgs) {
    ...
-   // キャッシュヒット時はそのまま返す（BOOK_META_CACHE_ENABLED=false で無効化可能）
-   const cacheEnabled = process.env.BOOK_META_CACHE_ENABLED !== 'false'
-   if (cacheEnabled) {
-     const cached = getCachedBookSearch(q)
-     if (cached)
-       return Response.json({ books: cached, cached: true })
-   }

    ...（楽天・Google の並列検索はそのまま）

-   // 書影ありの結果が1件以上ある場合のみキャッシュする
-   if (cacheEnabled && books.length > 0 && books.some(b => b.coverUrl !== null)) {
-     setCachedBookSearch(q, books)
-   }

    return Response.json({ books })
  }
```

### Step 2: `api.books.cache-status.ts` を削除

```bash
rm app/routes/api.books.cache-status.ts
```

### Step 3: `routes.ts` から cache-status ルートを削除

```diff
  route('api/books/search', 'routes/api.books.search.ts'),
- route('api/books/cache-status', 'routes/api.books.cache-status.ts'),
  route('api/books/:isbn/bookmarks', 'routes/api.books.$isbn.bookmarks.ts'),
```

### Step 4: キャッシュモジュール本体を削除

```bash
rm app/lib/book-meta-cache.ts
```

### Step 5: `.env` / `.env.example` から削除

```diff
- # 書影キャッシュ（true: 有効 / false: 無効）
- BOOK_META_CACHE_ENABLED=true
```

### Step 6: `shelf.$id.tsx` と `me.tsx` を単純並列fetchに戻す（任意）

現在は「cache-status チェック → キャッシュ済み一括表示 / 未キャッシュ stagger」の2フェーズ実装になっています。
キャッシュごと剥がす場合は、シンプルな全件並列に戻してください。

```diff
- // Phase 1: cache-status チェック
- fetch(`/api/books/cache-status?isbns=${isbns.join(',')}`, { signal: controller.signal })
-   .then(({ hits, misses }) => {
-     // キャッシュ済み一括反映
-     // 未キャッシュを 200ms stagger ...
-   })

+ // 全件同時発火
+ for (const { isbn } of shelf.books) {
+   fetch(`/api/books/search?q=${isbn}`, { signal: controller.signal })
+     .then(...)
+     .catch(...)
+ }
  return () => controller.abort()
```
+ return () => { for (const t of timers) clearTimeout(t) }
```

### Step 7: 動作確認

```bash
bun run check:fix
bun run build
```

---

## 代替案（将来的な対応）

| 方法 | メリット | デメリット |
|---|---|---|
| Vercel KV / Redis | サーバーレスでも有効 | 外部サービス費用 |
| DB（Turso）への書き込み | インフラ追加不要 | 楽天API利用規約の確認が必要 |
| stagger のみ（キャッシュなし） | 実装シンプル | 毎回APIを叩くため完全解決にならない |
