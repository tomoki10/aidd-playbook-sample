import type { Borrower } from "../loans/domain/loan.ts";

/**
 * 社員名簿（研修用のダミーデータ）。貸出時に借り手の情報をここから複製する。
 * メールアドレスと電話番号は個人情報であり、API で他人に返してはいけない。
 */
const EMPLOYEES: readonly Borrower[] = [
  {
    id: "u-alice",
    name: "青木 アリス",
    email: "alice@example.com",
    phone: "090-0000-0001",
    department: "開発部",
  },
  {
    id: "u-bob",
    name: "馬場 ボブ",
    email: "bob@example.com",
    phone: "090-0000-0002",
    department: "営業部",
  },
  {
    id: "u-carol",
    name: "近藤 キャロル",
    email: "carol@example.com",
    phone: "090-0000-0003",
    department: "企画部",
  },
  {
    id: "u-admin",
    name: "総務 管理者",
    email: "admin@example.com",
    phone: "03-0000-0000",
    department: "総務部",
  },
];

export function findEmployee(id: string): Borrower | undefined {
  return EMPLOYEES.find((e) => e.id === id);
}
