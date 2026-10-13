import { describe, expect, it } from "vitest";
import { EXTENSION_DAYS, extendLoan, MAX_EXTENSIONS } from "./extension.ts";
import type { Loan } from "./loan.ts";

// 実装 Issue B1（docs/workshop/issues/loan-extension-b1.md）の「受入テスト」の観点と期待値をテストにしたもの。
// テスト名の [R番号] は docs/specs/loan-extension.md の要件
const base: Loan = {
  id: "L-1",
  itemId: "item-1",
  borrower: {
    id: "u-bob",
    name: "馬場 ボブ",
    email: "bob@example.com",
    phone: "090-0000-0002",
    department: "営業部",
  },
  loanedAt: "2026-09-20",
  dueDate: "2026-10-04",
  returnedAt: null,
  extensionCount: 0,
};

const loan = (overrides: Partial<Loan> = {}): Loan => ({ ...base, ...overrides });

describe("extendLoan", () => {
  it("[R1][R2] 延長の規則は1回まで・7日", () => {
    expect(MAX_EXTENSIONS).toBe(1);
    expect(EXTENSION_DAYS).toBe(7);
  });

  it("[R1] 期限内で延長0回の貸出を本人が延長すると、返却期限が7日後になり、延長回数が1になる", () => {
    const result = extendLoan(loan(), "u-bob", "2026-10-01");

    expect(result).toEqual({
      ok: true,
      loan: { ...base, dueDate: "2026-10-11", extensionCount: 1 },
    });
  });

  it("[R1] 返却済みは already_returned", () => {
    const result = extendLoan(loan({ returnedAt: "2026-09-30" }), "u-bob", "2026-10-01");

    expect(result).toEqual({ ok: false, reason: "already_returned" });
  });

  it("[R1] 引数の loan を書き換えない", () => {
    const original = loan();
    const snapshot = structuredClone(original);

    extendLoan(original, "u-bob", "2026-10-01");

    expect(original).toEqual(snapshot);
  });

  it("[R2] 延長回数が1の貸出は limit_reached", () => {
    const result = extendLoan(loan({ extensionCount: 1 }), "u-bob", "2026-10-01");

    expect(result).toEqual({ ok: false, reason: "limit_reached" });
  });

  it("[R3] 返却期限の当日は延長できる", () => {
    const result = extendLoan(loan({ dueDate: "2026-10-01" }), "u-bob", "2026-10-01");

    expect(result).toEqual({
      ok: true,
      loan: { ...base, dueDate: "2026-10-08", extensionCount: 1 },
    });
  });

  it("[R3] 返却期限の翌日は overdue で延長できない", () => {
    const result = extendLoan(loan({ dueDate: "2026-09-30" }), "u-bob", "2026-10-01");

    expect(result).toEqual({ ok: false, reason: "overdue" });
  });

  it("[R4] 本人以外は管理者も含めて not_borrower", () => {
    expect(extendLoan(loan(), "u-alice", "2026-10-01")).toEqual({
      ok: false,
      reason: "not_borrower",
    });
    expect(extendLoan(loan(), "u-admin", "2026-10-01")).toEqual({
      ok: false,
      reason: "not_borrower",
    });
  });

  it("[R1][R2][R3][R4] 複数に当てはまるときは、本人 → 返却済み → 期限超過 → 上限の順で先の理由を返す", () => {
    const all = loan({ returnedAt: "2026-09-30", dueDate: "2026-09-20", extensionCount: 1 });

    expect(extendLoan(all, "u-alice", "2026-10-01")).toEqual({
      ok: false,
      reason: "not_borrower",
    });
    expect(extendLoan(all, "u-bob", "2026-10-01")).toEqual({
      ok: false,
      reason: "already_returned",
    });
    expect(
      extendLoan(loan({ dueDate: "2026-09-20", extensionCount: 1 }), "u-bob", "2026-10-01"),
    ).toEqual({ ok: false, reason: "overdue" });
  });
});
