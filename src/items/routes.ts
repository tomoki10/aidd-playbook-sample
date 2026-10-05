import { Hono } from "hono";
import type { Deps } from "../app.ts";
import type { ItemList } from "../generated/types.ts";

export function itemRoutes(deps: Deps): Hono {
  const app = new Hono();

  // GET /items: 備品の一覧と、いま借りられるか。借り手の情報は返さない
  app.get("/", (c) => {
    const body: ItemList = {
      items: deps.items.list().map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        available: deps.loans.findActiveByItem(item.id) === undefined,
      })),
    };
    return c.json(body);
  });

  return app;
}
