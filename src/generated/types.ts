// このファイルは openapi.yaml から `npm run generate` で生成しています。
// 直接編集しないでください。型を変えるときは openapi.yaml を直して再生成します。

export type Item = {
  id: string;
  name: string;
  category: "pc" | "monitor" | "camera" | "projector" | "other";
  available: boolean;
};

export type ItemList = {
  items: Item[];
};

/** API で返す借り手の情報。email と phone は含めない */
export type BorrowerSummary = {
  id: string;
  name: string;
};

export type Loan = {
  id: string;
  itemId: string;
  borrower: BorrowerSummary;
  loanedAt: string;
  dueDate: string;
  returnedAt: string | null;
  extensionCount: number;
};

export type LoanEnvelope = {
  loan: Loan;
};

export type CreateLoanRequest = {
  itemId: string;
};

export type ErrorResponse = {
  error: {
    code: string;
    message: string;
  };
};
