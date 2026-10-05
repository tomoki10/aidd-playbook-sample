import { Hono } from "hono";
import { AuditLog } from "./audit/audit-log.ts";
import { errorBody } from "./http/errors.ts";
import { type Item, ItemStore } from "./items/item.ts";
import { itemRoutes } from "./items/routes.ts";
import type { Loan } from "./loans/domain/loan.ts";
import { loanRoutes } from "./loans/routes.ts";
import { LoanStore } from "./loans/store.ts";

/** ルートが使う依存。テストでは固定の日付と初期データを渡す */
export type Deps = {
  items: ItemStore;
  loans: LoanStore;
  audit: AuditLog;
  /** 現在時刻。今日の日付はここから求める */
  now: () => Date;
};

export type CreateAppOptions = {
  items?: readonly Item[];
  loans?: readonly Loan[];
  now?: () => Date;
};

export function createDeps(options: CreateAppOptions = {}): Deps {
  const now = options.now ?? (() => new Date());
  return {
    items: new ItemStore(options.items),
    loans: new LoanStore(options.loans),
    audit: new AuditLog(now),
    now,
  };
}

export function createApp(deps: Deps): Hono {
  const app = new Hono();

  app.route("/items", itemRoutes(deps));
  app.route("/loans", loanRoutes(deps));

  app.notFound((c) => c.json(errorBody("NOT_FOUND", "リソースが見つかりません"), 404));

  // 想定外のエラーでも、スタックトレースや内部の値を応答に含めない
  app.onError((err, c) => {
    console.error(err);
    return c.json(errorBody("INTERNAL_ERROR", "サーバー内部でエラーが発生しました"), 500);
  });

  return app;
}
