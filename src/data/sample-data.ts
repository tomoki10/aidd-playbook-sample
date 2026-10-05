import { findEmployee } from "../directory/employees.ts";
import type { Item } from "../items/item.ts";
import { addDays, daysBetween, type ISODate } from "../lib/date.ts";
import type { Loan } from "../loans/domain/loan.ts";

/**
 * 初期データ。基準日 2026-10-01 に対して書いておき、渡した today に合わせて日付をずらす。
 * テストは today = 2026-10-01 で使う。npm run dev では実行日に合わせてずらすので、
 * いつ起動しても「期限超過」「今日が期限」「期限内」「返却済み」の貸出がそろう。
 */
export const BASE_DATE: ISODate = "2026-10-01";

export const SAMPLE_ITEMS: readonly Item[] = [
  { id: "pc-01", name: "ノート PC 14インチ #1", category: "pc" },
  { id: "pc-02", name: "ノート PC 14インチ #2", category: "pc" },
  { id: "monitor-01", name: "27インチモニター #1", category: "monitor" },
  { id: "monitor-02", name: "27インチモニター #2", category: "monitor" },
  { id: "camera-01", name: "Web 会議用カメラ #1", category: "camera" },
  { id: "camera-02", name: "Web 会議用カメラ #2", category: "camera" },
  { id: "projector-01", name: "小型プロジェクター", category: "projector" },
];

type LoanSeed = Omit<Loan, "borrower"> & { borrowerId: string };

const LOAN_SEEDS: readonly LoanSeed[] = [
  // 期限超過 7日
  {
    id: "L-0001",
    itemId: "pc-01",
    borrowerId: "u-alice",
    loanedAt: "2026-09-10",
    dueDate: "2026-09-24",
    returnedAt: null,
    extensionCount: 0,
  },
  // 期限内（期限は3日後）
  {
    id: "L-0002",
    itemId: "monitor-01",
    borrowerId: "u-bob",
    loanedAt: "2026-09-20",
    dueDate: "2026-10-04",
    returnedAt: null,
    extensionCount: 0,
  },
  // 返却済み
  {
    id: "L-0003",
    itemId: "camera-01",
    borrowerId: "u-carol",
    loanedAt: "2026-09-01",
    dueDate: "2026-09-15",
    returnedAt: "2026-09-14",
    extensionCount: 0,
  },
  // 期限超過 1日
  {
    id: "L-0004",
    itemId: "projector-01",
    borrowerId: "u-bob",
    loanedAt: "2026-09-16",
    dueDate: "2026-09-30",
    returnedAt: null,
    extensionCount: 0,
  },
  // 今日が期限（期限超過ではない）
  {
    id: "L-0005",
    itemId: "pc-02",
    borrowerId: "u-carol",
    loanedAt: "2026-09-17",
    dueDate: "2026-10-01",
    returnedAt: null,
    extensionCount: 0,
  },
  // 1回延長したうえで期限超過 5日
  {
    id: "L-0006",
    itemId: "camera-02",
    borrowerId: "u-alice",
    loanedAt: "2026-09-05",
    dueDate: "2026-09-26",
    returnedAt: null,
    extensionCount: 1,
  },
];

export function sampleLoans(today: ISODate = BASE_DATE): Loan[] {
  const shift = daysBetween(BASE_DATE, today);
  return LOAN_SEEDS.map(({ borrowerId, ...seed }) => {
    const borrower = findEmployee(borrowerId);
    if (!borrower) throw new Error(`unknown employee: ${borrowerId}`);
    return {
      ...seed,
      borrower,
      loanedAt: addDays(seed.loanedAt, shift),
      dueDate: addDays(seed.dueDate, shift),
      returnedAt: seed.returnedAt === null ? null : addDays(seed.returnedAt, shift),
    };
  });
}
