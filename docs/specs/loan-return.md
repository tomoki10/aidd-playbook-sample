# spec: 備品の返却（記入例）

- intent: [docs/intents/loan-return.md](../intents/loan-return.md)
- 状態: マージ済み（PO サインオフ）

## 決めたこと

- 返却できるのは借り手本人と管理者
- 本人以外の利用者には、貸出が存在しない場合と同じ 404 を返す（他人の貸出 ID が有効かどうかを推測させない）
- 返却済みの貸出をもう一度返却すると 409
- 期限超過でも返却できる
- 返却の成否を監査ログに残す（本人以外の試行は `denied`）

## インタフェース

### ドメイン関数

`src/loans/domain/return.ts`

```ts
export type ReturnActor = { id: string; role: "member" | "admin" };

export type ReturnResult =
  | { ok: true; loan: Loan }
  | { ok: false; reason: "not_borrower" | "already_returned" };

export function returnLoan(loan: Loan, actor: ReturnActor, today: ISODate): ReturnResult;
```

### API

`POST /loans/:id/return`（`src/loans/routes.ts`）

- 認証: `Authorization: Bearer <token>` 必須
- リクエスト本文: なし

| 状況 | ステータス | 本文 |
|---|---|---|
| 返却できた | 200 | `{ "loan": Loan }`（借り手は `id` と `name` のみ） |
| 認証なし・不明なトークン | 401 | `{ "error": { "code": "UNAUTHORIZED", ... } }` |
| 貸出がない、または本人・管理者以外 | 404 | `{ "error": { "code": "NOT_FOUND", ... } }` |
| 返却済み | 409 | `{ "error": { "code": "LOAN_ALREADY_RETURNED", ... } }` |

## 受入条件

1. 借り手本人が返却すると 200 で、`returnedAt` に今日の日付が入る
2. 管理者が他人の貸出を返却すると 200
3. 本人以外の利用者が返却すると 404 で、貸出は未返却のまま。監査ログに `result: "denied"` が残る
4. 返却済みの貸出を返却すると 409、`code` は `LOAN_ALREADY_RETURNED`
5. 期限を過ぎた貸出も返却できる
6. 応答の `borrower` は `{ id, name }` だけで、`email` と `phone` を含まない

## セキュリティ観点（secure-api）

| 観点 | 対応 |
|---|---|
| 認証・認可 | 認証必須。本人または管理者だけ |
| 入力検証 | パスパラメータの `id` だけ。存在しなければ 404 |
| 個人情報の最小化 | 借り手は `id` と `name` のみ返す |
| 監査ログ | `loan.return` を成功・拒否・失敗で記録。個人情報は記録しない |
| エラー | 共通のエラー形式。内部の例外内容は返さない |

## 範囲外

- 返却時の備品の状態の記録
