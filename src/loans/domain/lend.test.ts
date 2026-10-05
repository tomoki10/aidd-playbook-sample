import { describe, expect, it } from "vitest";
import { lendItem } from "./lend.ts";
import type { Borrower, Loan } from "./loan.ts";

const borrower: Borrower = {
  id: "u-alice",
  name: "青木 アリス",
  email: "alice@example.com",
  phone: "090-0000-0001",
  department: "開発部",
};

describe("lendItem", () => {
  it("貸出日から14日後を返却期限にし、延長回数0で貸し出す", () => {
    const result = lendItem({
      loanId: "L-100",
      itemId: "item-1",
      borrower,
      today: "2026-10-01",
      activeLoanOfItem: undefined,
    });

    expect(result).toEqual({
      ok: true,
      loan: {
        id: "L-100",
        itemId: "item-1",
        borrower,
        loanedAt: "2026-10-01",
        dueDate: "2026-10-15",
        returnedAt: null,
        extensionCount: 0,
      },
    });
  });

  it("同じ備品が未返却なら貸し出せない", () => {
    const active: Loan = {
      id: "L-1",
      itemId: "item-1",
      borrower,
      loanedAt: "2026-09-25",
      dueDate: "2026-10-09",
      returnedAt: null,
      extensionCount: 0,
    };

    const result = lendItem({
      loanId: "L-100",
      itemId: "item-1",
      borrower,
      today: "2026-10-01",
      activeLoanOfItem: active,
    });

    expect(result).toEqual({ ok: false, reason: "item_on_loan" });
  });
});
