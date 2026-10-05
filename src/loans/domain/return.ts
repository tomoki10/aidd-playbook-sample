import type { ISODate } from "../../lib/date.ts";
import type { Loan } from "./loan.ts";

export type ReturnActor = { id: string; role: "member" | "admin" };

export type ReturnResult =
  | { ok: true; loan: Loan }
  | { ok: false; reason: "not_borrower" | "already_returned" };

/**
 * 貸出を返却済みにする。
 * 返却できるのは借り手本人と管理者（窓口で代理返却する）。
 * 返却期限を過ぎていても返却はできる。
 */
export function returnLoan(loan: Loan, actor: ReturnActor, today: ISODate): ReturnResult {
  if (actor.role !== "admin" && loan.borrower.id !== actor.id) {
    return { ok: false, reason: "not_borrower" };
  }
  if (loan.returnedAt !== null) {
    return { ok: false, reason: "already_returned" };
  }
  return { ok: true, loan: { ...loan, returnedAt: today } };
}
