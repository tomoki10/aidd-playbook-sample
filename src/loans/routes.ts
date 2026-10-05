import { Hono } from "hono";
import { z } from "zod";
import type { Deps } from "../app.ts";
import { type AuthEnv, requireAuth } from "../auth/middleware.ts";
import { findEmployee } from "../directory/employees.ts";
import { errorBody } from "../http/errors.ts";
import { toISODate } from "../lib/date.ts";
import { lendItem } from "./domain/lend.ts";
import { returnLoan } from "./domain/return.ts";
import { toLoanResponse } from "./presenter.ts";

const createLoanSchema = z.object({
  itemId: z.string().min(1).max(64),
});

export function loanRoutes(deps: Deps): Hono<AuthEnv> {
  const app = new Hono<AuthEnv>();
  const today = () => toISODate(deps.now());

  app.use("*", requireAuth);

  // POST /loans: ログイン中の利用者が備品を借りる
  app.post("/", async (c) => {
    const user = c.get("user");
    const parsed = createLoanSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json(errorBody("INVALID_REQUEST", "itemId を指定してください"), 400);
    }
    const item = deps.items.get(parsed.data.itemId);
    const borrower = findEmployee(user.id);
    if (!item || !borrower) {
      return c.json(errorBody("NOT_FOUND", "備品が見つかりません"), 404);
    }

    const result = lendItem({
      loanId: deps.loans.nextId(),
      itemId: item.id,
      borrower,
      today: today(),
      activeLoanOfItem: deps.loans.findActiveByItem(item.id),
    });
    if (!result.ok) {
      deps.audit.record({
        actorId: user.id,
        action: "loan.create",
        targetId: item.id,
        result: "failure",
      });
      return c.json(errorBody("ITEM_ON_LOAN", "この備品は貸出中です"), 409);
    }

    deps.loans.save(result.loan);
    deps.audit.record({
      actorId: user.id,
      action: "loan.create",
      targetId: result.loan.id,
      result: "success",
    });
    return c.json({ loan: toLoanResponse(result.loan) }, 201);
  });

  // POST /loans/:id/return: 借り手本人または管理者が返却する
  app.post("/:id/return", (c) => {
    const user = c.get("user");
    const loan = deps.loans.get(c.req.param("id"));
    if (!loan) {
      return c.json(errorBody("NOT_FOUND", "貸出が見つかりません"), 404);
    }

    const result = returnLoan(loan, user, today());
    if (!result.ok) {
      deps.audit.record({
        actorId: user.id,
        action: "loan.return",
        targetId: loan.id,
        result: result.reason === "not_borrower" ? "denied" : "failure",
      });
      // 他人の貸出かどうかを推測させないため、本人以外には存在しない場合と同じ 404 を返す
      if (result.reason === "not_borrower") {
        return c.json(errorBody("NOT_FOUND", "貸出が見つかりません"), 404);
      }
      return c.json(errorBody("LOAN_ALREADY_RETURNED", "この貸出は返却済みです"), 409);
    }

    deps.loans.save(result.loan);
    deps.audit.record({
      actorId: user.id,
      action: "loan.return",
      targetId: loan.id,
      result: "success",
    });
    return c.json({ loan: toLoanResponse(result.loan) });
  });

  return app;
}
