# Analytics カスタムイベント ガイドライン

## 概要

my9books では **Vercel Analytics** の `track()` 関数を使ってユーザー行動をカスタムイベントとして計測しています。  
ページビューは `<Analytics />` コンポーネント（`app/root.tsx`）が自動収集します。  
ユーザーのインタラクション（ボタンクリック・検索・作成）は以下のカスタムイベントで追跡します。

---

## Vercel ダッシュボードでの確認方法

1. [vercel.com](https://vercel.com) にログイン
2. プロジェクト `my9books` を開く
3. 上部タブ **Analytics** をクリック
4. 左サイドバー **Events** を選択
5. イベント名でフィルタリングして確認

> **注意**: ローカル開発環境（`localhost`）では Vercel Analytics はイベントを送信しません。  
> 本番 / Vercel preview デプロイで動作を確認してください。

---

## カスタムイベント一覧

### `book_modal_open` — 書籍モーダルを開いた

| プロパティ | 型       | 説明                    |
| ---------- | -------- | ----------------------- |
| `isbn`     | `string` | 開いた本の ISBN         |
| `shelf_id` | `string` | 閲覧中の Shelf の UUID  |

**発火箇所**: [app/routes/shelf.$id.tsx](../app/routes/shelf.$id.tsx)  
グリッドの書影をタップ / クリックしたとき。

```tsx
onClick={() => {
  track('book_modal_open', { isbn: book.isbn, shelf_id: shelf.id })
  setModalBook(book)
}}
```

**活用例**: どの本がよく注目されているか、どの Shelf からモーダルが開かれているかを把握。

---

### `affiliate_click` — アフィリエイトリンクをクリックした

| プロパティ | 型                       | 説明                            |
| ---------- | ------------------------ | ------------------------------- |
| `service`  | `'amazon' \| 'rakuten'`  | クリックされたサービス          |
| `isbn`     | `string`                 | 対象の本の ISBN                 |
| `shelf_id` | `string`                 | 閲覧中の Shelf の UUID          |

**発火箇所**: [app/routes/shelf.$id.tsx](../app/routes/shelf.$id.tsx) — `BookModal` コンポーネント内  
「Amazonで見る」または「楽天ブックスで見る」ボタンをクリックしたとき。

```tsx
onClick={() => track('affiliate_click', { service: 'rakuten', isbn: book.isbn, shelf_id: shelfId })}
onClick={() => track('affiliate_click', { service: 'amazon',  isbn: book.isbn, shelf_id: shelfId })}
```

**活用例**: Amazon / 楽天どちらのリンクがクリックされやすいか、どの本が購買意欲を生んでいるかを把握。

---

### `share_twitter` — X（Twitter）共有ボタンをクリックした

| プロパティ | 型       | 説明                    |
| ---------- | -------- | ----------------------- |
| `shelf_id` | `string` | 共有された Shelf の UUID |

**発火箇所**: [app/routes/shelf.$id.tsx](../app/routes/shelf.$id.tsx)  
「ツイート」ボタン（X への Intent URL リンク）をクリックしたとき。

```tsx
onClick={() => track('share_twitter', { shelf_id: shelf.id })}
```

**活用例**: SNS 経由の拡散傾向を把握。

---

### `share_url_copy` — URLコピーボタンをクリックした

| プロパティ | 型       | 説明                    |
| ---------- | -------- | ----------------------- |
| `shelf_id` | `string` | コピーされた Shelf の UUID |

**発火箇所**: [app/routes/shelf.$id.tsx](../app/routes/shelf.$id.tsx)  
「URLをコピー」ボタンをクリックし、クリップボードへのコピーが成功したとき。

```tsx
navigator.clipboard.writeText(shelfUrl).then(() => {
  track('share_url_copy', { shelf_id: shelf.id })
  ...
})
```

**活用例**: ツイートとコピーのどちらが多く使われているかを比較。

---

### `shelf_created` — Shelf を新規作成した

| プロパティ | 型       | 説明                     |
| ---------- | -------- | ------------------------ |
| `shelf_id` | `string` | 作成された Shelf の UUID |

**発火箇所**: [app/routes/shelf.new.tsx](../app/routes/shelf.new.tsx)  
Shelf 作成が全て完了し、`/shelf/:id` へナビゲートする直前。

```tsx
track('shelf_created', { shelf_id: shelf.id })
navigate(`/shelf/${shelf.id}`)
```

**活用例**: 登録ユーザーが実際に Shelf を作成しているかの転換率を把握。

---

### `book_search` — 書籍を検索した

| プロパティ | 型       | 説明           |
| ---------- | -------- | -------------- |
| `query`    | `string` | 検索クエリ文字列 |

**発火箇所**:
- [app/routes/shelf.new.tsx](../app/routes/shelf.new.tsx) — Shelf 新規作成時の検索
- [app/routes/shelf.$id.edit.tsx](../app/routes/shelf.$id.edit.tsx) — Shelf 編集時の検索

デバウンス（400ms）後、実際に API リクエストが送信されるタイミングで発火。

```tsx
setIsSearching(true)
track('book_search', { query: debouncedQuery })
```

**活用例**: ユーザーがどんな本を探しているかを把握し、コンテンツ改善に活用。

---

## ページビュー（自動収集）

`@vercel/analytics/react` の `<Analytics />` コンポーネントが [app/root.tsx](../app/root.tsx) に設置されており、全ルートのページビューを自動収集しています。

Vercel Analytics の **Web Vitals** タブでは CLS・FID・LCP なども確認できます。

---

## ローカル開発でのデバッグ

本番環境以外でイベントが届いているか確認したい場合:

```ts
// 開発中は console.log で代替確認
if (import.meta.env.DEV) {
  console.log('[Analytics]', eventName, properties)
}
```

または Vercel CLI でプレビューデプロイ環境を使用してください:

```bash
vercel --prod  # 本番に直接デプロイ
vercel         # preview デプロイ（Analytics が有効）
```

---

## イベント追加時のルール

1. `import { track } from '@vercel/analytics'` を対象ファイルの先頭に追加
2. イベント名は `snake_case` で統一
3. `shelf_id` は常に一緒に送る（Shelf に紐づくイベントの場合）
4. [タスク計画書.md](./タスク計画書.md) の Phase 10 テーブルに追記
5. このガイドラインにも追記
