import { Hono } from "hono";
import { z } from "zod";
import type { Deps } from "../app.ts";
import type { ItemCategory, ItemList } from "../generated/types.ts";
import { errorBody } from "../http/errors.ts";

const CATEGORIES = [
  "pc",
  "monitor",
  "camera",
  "projector",
  "other",
] as const satisfies readonly ItemCategory[];

/** GET /items のクエリ。どちらも省略できる。未知の種類や true / false 以外は 400 にする */
const listQuerySchema = z.object({
  category: z.enum(CATEGORIES).optional(),
  available: z.enum(["true", "false"]).optional(),
});

export function itemRoutes(deps: Deps): Hono {
  const app = new Hono();

  // GET /items: 備品の一覧と、いま借りられるか。借り手の情報は返さない。docs/specs/borrowing-status.md（R1〜R3）
  app.get("/", (c) => {
    const parsed = listQuerySchema.safeParse(c.req.query());
    if (!parsed.success) {
      return c.json(
        errorBody(
          "INVALID_REQUEST",
          "category は備品の種類、available は true か false で指定してください",
        ),
        400,
      );
    }
    const { category, available } = parsed.data;

    const items = deps.items
      .list()
      .filter((item) => category === undefined || item.category === category)
      .map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        // 返却されていない貸出があれば、返却期限を過ぎていても貸出中として扱う
        available: deps.loans.findActiveByItem(item.id) === undefined,
      }))
      .filter((item) => available === undefined || String(item.available) === available);

    const body: ItemList = { items };
    return c.json(body);
  });

  return app;
}
