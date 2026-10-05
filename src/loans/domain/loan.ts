import type { ISODate } from "../../lib/date.ts";

/** 借り手。社員名簿から複製した情報で、email と phone は個人情報として扱う */
export type Borrower = {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
};

export type Loan = {
  id: string;
  itemId: string;
  borrower: Borrower;
  /** 貸出日 */
  loanedAt: ISODate;
  /** 返却期限。この日のうちに返せば期限内 */
  dueDate: ISODate;
  /** 返却日。未返却なら null */
  returnedAt: ISODate | null;
  /** 延長した回数。貸出時は 0 */
  extensionCount: number;
};

/** 貸出期間の日数 */
export const LOAN_PERIOD_DAYS = 14;
