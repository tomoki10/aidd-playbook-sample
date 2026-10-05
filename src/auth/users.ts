/**
 * 研修用の簡易認証。
 * `Authorization: Bearer <token>` のトークンを固定の表で利用者に対応づける。
 * 本番では IdP が発行したトークンを検証する想定で、この表はその代わり。
 */
export type Role = "member" | "admin";

export type User = {
  id: string;
  name: string;
  role: Role;
};

export const USERS: readonly User[] = [
  { id: "u-alice", name: "青木 アリス", role: "member" },
  { id: "u-bob", name: "馬場 ボブ", role: "member" },
  { id: "u-carol", name: "近藤 キャロル", role: "member" },
  { id: "u-admin", name: "総務 管理者", role: "admin" },
];

/** トークン → 利用者 ID。研修ではトークンを利用者 ID と同じ文字列にしている */
const TOKENS: ReadonlyMap<string, string> = new Map(USERS.map((u) => [u.id, u.id]));

export function findUserByToken(token: string): User | undefined {
  const userId = TOKENS.get(token);
  return USERS.find((u) => u.id === userId);
}
