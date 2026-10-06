import type { ISODate } from "../../lib/date.ts";
import type { Loan } from "./loan.ts";

/**
 * 貸出の延長（機能 B）。分割計画 docs/plans/loan-extension.md で決めた境目の関数だけを先に置いたスタブ。
 * 本体は B1（feat/b1-extend-domain）で実装する。
 * B2（API）はこのシグネチャに沿ってルートを書き、テストでは vi.mock でこの関数を差し替える。
 */
export const MAX_EXTENSIONS = 1;
export const EXTENSION_DAYS = 7;

export type ExtendResult =
  | { ok: true; loan: Loan }
  | { ok: false; reason: "not_borrower" | "already_returned" | "overdue" | "limit_reached" };

export function extendLoan(_loan: Loan, _userId: string, _today: ISODate): ExtendResult {
  throw new Error("not implemented");
}
