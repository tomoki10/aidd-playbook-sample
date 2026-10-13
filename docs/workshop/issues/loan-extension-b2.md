## spec

`docs/specs/loan-extension.md`（R1〜R4 を HTTP の応答で満たす）

## タスク ID

B2（`POST /loans/:id/extend`）

## 範囲

- 触る: `src/loans/routes.ts`、`src/loans/routes.extension.test.ts`（実装と同じ PR で新しく作るテスト）、`openapi.yaml`（パスの追加のみ）
- 触らない: `src/loans/domain/extension.ts`、`src/loans/domain/extension.test.ts`（B1 の範囲）、`src/generated/`（応答は既存の `LoanEnvelope` を使うので、スキーマを変えず再生成もしない）
- ブランチ: `worktree-b2-api`（`claude --worktree b2-api` で main から作る）

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

テストの設計です。spec の要件（R 番号）ごとに、確かめる観点と期待値を書きます。受講者は PO・エンジニア役でこの表を読み、足りない観点や食い違う期待値があれば Issue に足して合意してから、`ready-for-agent` を付けます。

テストコードはこの Issue には書きません。エージェントが実装と同じ PR（同じブランチ）で `src/loans/routes.extension.test.ts` に書き、テスト名に R 番号を付けます。テストでは `extendLoan` を差し替え、「ドメイン関数の結果を HTTP にどう変換するか」だけを確かめます。延長の規則そのものは B1 のテストで確かめます。

前提: `createTestApp()` の初期データの L-0002（借り手が `u-bob`、備品が `monitor-01`）。サーバーの今日は 2026-10-01。

| 要件 | 観点 | 期待値 |
|---|---|---|
| R1 | `u-bob` が L-0002 を延長する | `extendLoan` が、保存されている L-0002、`u-bob`、`2026-10-01` で呼ばれる |
| R1 | `extendLoan` が `ok: true`（返却期限 2026-10-11、延長回数1）を返す | 200。応答の `loan` が延長後の貸出になり、保存されている L-0002 も同じ値に変わる。監査ログに `loan.extend` の `success` が残る |
| R1 | `extendLoan` が `already_returned` を返す | 409、`code` は `LOAN_ALREADY_RETURNED`。監査ログに `failure` が残る |
| R2 | `extendLoan` が `limit_reached` を返す | 409、`code` は `EXTENSION_LIMIT_REACHED`。監査ログに `failure` が残る |
| R3 | `extendLoan` が `overdue` を返す | 409、`code` は `LOAN_OVERDUE`。監査ログに `failure` が残る |
| R4 | `u-alice` が延長し、`extendLoan` が `not_borrower` を返す | 404、`code` は `NOT_FOUND`。L-0002 は変わらない。監査ログに `denied` が残る |
| R4 | 存在しない貸出（L-9999）を延長する／認証なしで延長する | それぞれ 404 と 401。どちらも `extendLoan` を呼ばない |
| 設計（secure-api） | 延長できたときの応答 | 借り手は `{ id, name }` だけで、`email` と `phone` を含まない |

## 完了の確かめ方

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`（`src/loans/routes.extension.test.ts` がすべて通る）
- [ ] 上の受入テストの観点と期待値が、すべてテストになっている。テスト名に R 番号が付いている
- [ ] B1 のマージ後に main を取り込み、`npm test` がすべて通る
- [ ] `npm run dev` で起動し、`u-bob` で L-0002 を延長すると返却期限が7日延び、もう一度延長すると 409（`EXTENSION_LIMIT_REACHED`）になる

## マージの順番

B1 を先にマージします。B2 は B1 のマージ後に main を取り込み、CI が緑になってからマージします。
