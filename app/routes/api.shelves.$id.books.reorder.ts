import type { LoaderFunctionArgs } from "react-router";
import type { Route } from "./+types/api.shelves.$id.books.reorder";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { shelfBooks, shelves } from "../db/schema";
import { requireAuthApi } from "../lib/auth.server";

// PATCH /api/shelves/:id/books/reorder - 並び順一括更新
export async function action(args: Route.ActionArgs) {
  const { userId } = await requireAuthApi(
    args as unknown as LoaderFunctionArgs,
  );
  const { id } = args.params;

  const [shelf] = await db
    .select()
    .from(shelves)
    .where(eq(shelves.id, id))
    .limit(1);
  if (!shelf) return Response.json({ error: "not found" }, { status: 404 });
  if (shelf.userId !== userId)
    return Response.json({ error: "forbidden" }, { status: 403 });

  const body = (await args.request.json()) as {
    items?: { isbn: string; position: number }[];
  };
  if (!Array.isArray(body.items) || body.items.length === 0)
    return Response.json({ error: "items is required" }, { status: 400 });

  await Promise.all(
    body.items.map(({ isbn, position }) =>
      db
        .update(shelfBooks)
        .set({ position })
        .where(and(eq(shelfBooks.shelfId, id), eq(shelfBooks.isbn, isbn))),
    ),
  );

  return Response.json({ ok: true });
}
