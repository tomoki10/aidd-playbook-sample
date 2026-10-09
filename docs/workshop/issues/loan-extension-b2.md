## spec

`docs/specs/loan-extension.md`（R1〜R4 を HTTP の応答で満たす）

## タスク ID

B2（`POST /loans/:id/extend`）

## 範囲

- 触る: `src/loans/routes.ts`、`src/loans/routes.extension.test.ts`（受入テスト）、`openapi.yaml`（パスの追加のみ）
- 触らない: `src/loans/domain/extension.ts`、`src/loans/domain/extension.test.ts`（B1 の範囲）、`src/generated/`（応答は既存の `LoanEnvelope` を使うので、スキーマを変えず再生成もしない）
- ブランチ: `feat/b2-extend-api`

ルートは返却 API と同じ形（貸出を探す → ドメイン関数を呼ぶ → 結果を HTTP に変換する → 監査ログを書く）にし、延長の規則は持ちません。

## 境目の関数

B1 が実装する `extendLoan` を、次のシグネチャで呼びます（main にスタブがあります）。B2 のテストは `vi.mock("./domain/extension.ts")` でこの関数を差し替えるので、B1 のマージを待たずにブランチ単体で CI を緑にできます。

```ts
export type ExtendResult =
  | { ok: true; loan: Loan }
  | { ok: false; reason: "not_borrower" | "already_returned" | "overdue" | "limit_reached" };

export function extendLoan(loan: Loan, userId: string, today: ISODate): ExtendResult;
```

`extendLoan` には、保存されている貸出、ログイン中の利用者の ID、`deps.now()` から求めた今日の日付を渡します。

## 応答とエラーコード

認証は既存の `requireAuth`（`Authorization: Bearer <token>`）を使い、リクエスト本文は受け取りません。エラーの本文は共通の形式 `{ "error": { "code": ..., "message": ... } }`（`errorBody`）です。

| 状況 | `extendLoan` の結果 | ステータス | 本文 | 監査ログ（`loan.extend`） |
|---|---|---|---|---|
| 延長できた | `ok: true` | 200 | `{ "loan": ... }`（`toLoanResponse` で借り手を `{ id, name }` に絞る） | `success` |
| 認証なし・不明なトークン | （呼ばない） | 401 | `UNAUTHORIZED` | なし |
| 貸出がない | （呼ばない） | 404 | `NOT_FOUND` | なし |
| 本人以外 | `not_borrower` | 404 | `NOT_FOUND` | `denied` |
| 返却済み | `already_returned` | 409 | `LOAN_ALREADY_RETURNED` | `failure` |
| 期限超過 | `overdue` | 409 | `LOAN_OVERDUE` | `failure` |
| 上限に達した | `limit_reached` | 409 | `EXTENSION_LIMIT_REACHED` | `failure` |

本人以外に 403 を返すと、貸出 ID が有効かどうかが分かってしまうので、存在しない場合と同じ 404 にします。

## 受入テスト

`src/loans/routes.extension.test.ts` に、次の観点を書きます。`extendLoan` は差し替え、「ドメイン関数の結果を HTTP にどう変換するか」だけを確かめます。延長の規則そのものは B1 のテストで確かめます。括弧内は対応する spec の要件です。

1. `extendLoan` を、保存されている貸出、ログイン中の利用者の ID、サーバーの今日の日付（テストでは `2026-10-01`）で呼ぶ（R1）
2. `ok: true` なら 200 で、返された貸出を保存して応答の `loan` にし、監査ログに `success` を残す（R1）
3. `not_borrower` なら 404（`NOT_FOUND`）で、貸出は変わらず、監査ログに `denied` を残す（R4）
4. `already_returned` / `overdue` / `limit_reached` なら 409 で、`code` はそれぞれ `LOAN_ALREADY_RETURNED` / `LOAN_OVERDUE` / `EXTENSION_LIMIT_REACHED`。監査ログに `failure` を残す（R1、R2、R3）
5. 存在しない貸出は 404、認証なしは 401。どちらも `extendLoan` を呼ばない（R4）
6. 応答の借り手は `{ id, name }` だけで、`email` と `phone` を含まない（spec の設計、secure-api）

## 完了の確かめ方

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`（`src/loans/routes.extension.test.ts` がすべて通る）
- [ ] B1 のマージ後に main を取り込み、`npm test` がすべて通る
- [ ] `npm run dev` で起動し、`u-bob` で L-0002 を延長すると返却期限が7日延び、もう一度延長すると 409（`EXTENSION_LIMIT_REACHED`）になる

## マージの順番

B1 を先にマージします。B2 は B1 のマージ後に main を取り込み、CI が緑になってからマージします。
