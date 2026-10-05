import { describe, expect, it } from "vitest";
import type { Loan } from "./loan.ts";
import { returnLoan } from "./return.ts";

const loan: Loan = {
  id: "L-1",
  itemId: "item-1",
  borrower: {
    id: "u-alice",
    name: "青木 アリス",
    email: "alice@example.com",
    phone: "090-0000-0001",
    department: "開発部",
  },
  loanedAt: "2026-09-20",
  dueDate: "2026-10-04",
  returnedAt: null,
  extensionCount: 0,
};

describe("returnLoan", () => {
  it("借り手本人は返却できる。返却日に今日が入る", () => {
    const result = returnLoan(loan, { id: "u-alice", role: "member" }, "2026-10-01");
    expect(result).toEqual({ ok: true, loan: { ...loan, returnedAt: "2026-10-01" } });
  });

  it("管理者は代理で返却できる", () => {
    const result = returnLoan(loan, { id: "u-admin", role: "admin" }, "2026-10-01");
    expect(result.ok).toBe(true);
  });

  it("本人以外の利用者は返却できない", () => {
    const result = returnLoan(loan, { id: "u-bob", role: "member" }, "2026-10-01");
    expect(result).toEqual({ ok: false, reason: "not_borrower" });
  });

  it("返却済みの貸出は返却できない", () => {
    const returned = { ...loan, returnedAt: "2026-09-30" };
    const result = returnLoan(returned, { id: "u-alice", role: "member" }, "2026-10-01");
    expect(result).toEqual({ ok: false, reason: "already_returned" });
  });

  it("返却期限を過ぎていても返却できる", () => {
    const result = returnLoan(loan, { id: "u-alice", role: "member" }, "2026-10-10");
    expect(result).toEqual({ ok: true, loan: { ...loan, returnedAt: "2026-10-10" } });
  });
});
