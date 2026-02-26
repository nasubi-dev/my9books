import type { Route } from "./+types/api.users.$userId.shelves";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { shelves } from "../db/schema";

// GET /api/users/:userId/shelves
export async function loader({ params }: Route.LoaderArgs) {
  const { userId } = params;
  const result = await db
    .select()
    .from(shelves)
    .where(eq(shelves.userId, userId));
  return Response.json({ shelves: result });
}
