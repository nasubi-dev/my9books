import type { LoaderFunctionArgs } from "react-router";
import type { Route } from "./+types/api.shelves.$id.books.$isbn";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { shelfBooks, shelves } from "../db/schema";
import { requireAuthApi } from "../lib/auth.server";

// PATCH /api/shelves/:id/books/:isbn - 感想・ネタバレ・順番を更新
// DELETE /api/shelves/:id/books/:isbn - 本を削除
export async function action(args: Route.ActionArgs) {
  const { userId } = await requireAuthApi(
    args as unknown as LoaderFunctionArgs,
  );
  const { id, isbn } = args.params;
  const method = args.request.method.toUpperCase();

  const [shelf] = await db
    .select()
    .from(shelves)
    .where(eq(shelves.id, id))
    .limit(1);
  if (!shelf) return Response.json({ error: "not found" }, { status: 404 });
  if (shelf.userId !== userId)
    return Response.json({ error: "forbidden" }, { status: 403 });

  if (method === "PATCH") {
    const body = (await args.request.json()) as {
      review?: string;
      isSpoiler?: boolean;
      position?: number;
    };
    const set: Partial<{
      review: string | null;
      isSpoiler: number;
      position: number;
    }> = {};
    if (body.review !== undefined) set.review = body.review;
    if (body.isSpoiler !== undefined) set.isSpoiler = body.isSpoiler ? 1 : 0;
    if (body.position !== undefined) set.position = body.position;

    await db
      .update(shelfBooks)
      .set(set)
      .where(and(eq(shelfBooks.shelfId, id), eq(shelfBooks.isbn, isbn)));
    return Response.json({ ok: true });
  }

  if (method === "DELETE") {
    await db
      .delete(shelfBooks)
      .where(and(eq(shelfBooks.shelfId, id), eq(shelfBooks.isbn, isbn)));
    return Response.json({ ok: true });
  }

  return Response.json({ error: "method not allowed" }, { status: 405 });
}
