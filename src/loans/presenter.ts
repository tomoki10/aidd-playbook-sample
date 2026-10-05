import type { Loan as LoanResponse } from "../generated/types.ts";
import type { Loan } from "./domain/loan.ts";

/**
 * ドメインの Loan を API の応答に変換する。
 * 借り手は id と name だけを返し、email / phone / department は返さない。
 */
export function toLoanResponse(loan: Loan): LoanResponse {
  return {
    id: loan.id,
    itemId: loan.itemId,
    borrower: { id: loan.borrower.id, name: loan.borrower.name },
    loanedAt: loan.loanedAt,
    dueDate: loan.dueDate,
    returnedAt: loan.returnedAt,
    extensionCount: loan.extensionCount,
  };
}
