import type { BookSearchResult } from "../types/book";
import type { Route } from "./+types/api.books.search";
import { searchGoogleBooks } from "../lib/google-books";
import { searchRakutenBooks } from "../lib/rakuten";

// GET /api/books/search?q={query}
// 楽天ブックス + Google Books を並列検索し、ISBN で重複排除（楽天優先）
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  if (!q) return Response.json({ error: "query is required" }, { status: 400 });

  const [rakutenResult, googleResult] = await Promise.allSettled([
    searchRakutenBooks(q),
    searchGoogleBooks(q),
  ]);

  const rakutenBooks: BookSearchResult[] =
    rakutenResult.status === "fulfilled" ? rakutenResult.value : [];
  const googleBooks: BookSearchResult[] =
    googleResult.status === "fulfilled" ? googleResult.value : [];

  // ISBN をキーに重複排除（楽天優先）
  const seen = new Set<string>();
  const books: BookSearchResult[] = [];

  for (const book of rakutenBooks) {
    if (!seen.has(book.isbn)) {
      seen.add(book.isbn);
      books.push(book);
    }
  }
  for (const book of googleBooks) {
    if (!seen.has(book.isbn)) {
      seen.add(book.isbn);
      books.push(book);
    }
  }

  return Response.json({ books });
}
