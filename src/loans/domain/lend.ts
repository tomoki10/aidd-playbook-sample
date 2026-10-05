import { addDays, type ISODate } from "../../lib/date.ts";
import { type Borrower, LOAN_PERIOD_DAYS, type Loan } from "./loan.ts";

export type LendInput = {
  loanId: string;
  itemId: string;
  borrower: Borrower;
  today: ISODate;
  /** 同じ備品の、未返却の貸出 */
  activeLoanOfItem: Loan | undefined;
};

export type LendResult = { ok: true; loan: Loan } | { ok: false; reason: "item_on_loan" };

/** 備品を貸し出す。同じ備品が未返却なら貸し出せない */
export function lendItem(input: LendInput): LendResult {
  if (input.activeLoanOfItem) {
    return { ok: false, reason: "item_on_loan" };
  }
  return {
    ok: true,
    loan: {
      id: input.loanId,
      itemId: input.itemId,
      borrower: input.borrower,
      loanedAt: input.today,
      dueDate: addDays(input.today, LOAN_PERIOD_DAYS),
      returnedAt: null,
      extensionCount: 0,
    },
  };
}
