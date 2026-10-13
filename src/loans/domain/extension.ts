import { addDays, type ISODate } from "../../lib/date.ts";
import type { Loan } from "./loan.ts";

/** 貸出の延長（機能 B）。docs/specs/loan-extension.md */
export const MAX_EXTENSIONS = 1;
export const EXTENSION_DAYS = 7;

export type ExtendResult =
  | { ok: true; loan: Loan }
  | { ok: false; reason: "not_borrower" | "already_returned" | "overdue" | "limit_reached" };

/**
 * 借り手本人が、返却期限の当日までに1回だけ、返却期限を7日延ばす。
 * 判定順は「本人か → 返却済みか → 期限超過か → 上限か」。引数の loan は書き換えない。
 */
export function extendLoan(loan: Loan, userId: string, today: ISODate): ExtendResult {
  if (loan.borrower.id !== userId) {
    return { ok: false, reason: "not_borrower" };
  }
  if (loan.returnedAt !== null) {
    return { ok: false, reason: "already_returned" };
  }
  if (today > loan.dueDate) {
    return { ok: false, reason: "overdue" };
  }
  if (loan.extensionCount >= MAX_EXTENSIONS) {
    return { ok: false, reason: "limit_reached" };
  }
  return {
    ok: true,
    loan: {
      ...loan,
      dueDate: addDays(loan.dueDate, EXTENSION_DAYS),
      extensionCount: loan.extensionCount + 1,
    },
  };
}
