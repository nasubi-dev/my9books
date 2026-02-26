/** 書籍検索結果の共通型（楽天・Google Books 両方に対応） */
export interface BookSearchResult {
  /** ISBN-13（ハイフンなし） */
  isbn: string
  title: string
  author: string
  /** 書影URL */
  coverUrl: string | null
  /** データ取得元 */
  source: 'rakuten' | 'google'
}
