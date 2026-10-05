# spec: 貸出の延長

- intent: [docs/intents/loan-extension.md](../intents/loan-extension.md)
- 状態: マージ済み（PO サインオフ）。講師が用意した spec で、2周目はここから Build に入る

## 決めたこと

- 延長は1回まで（`extensionCount` が 1 以上なら延長できない）
- 延長すると、返却期限を**現在の返却期限から**7日後にする（今日からではない）
- 返却期限の当日は期限内として延長できる。翌日以降は期限超過で延長できない
- 延長できるのは借り手本人だけ。管理者を含め、本人以外には貸出が存在しない場合と同じ 404 を返す
- 判定の順序は「本人か → 返却済みか → 期限超過か → 上限か」。複数に当てはまるときは先の理由を返す
- 延長の成否を監査ログに残す

## インタフェース

B1（ドメイン）と B2（API）を並行に実装するため、ここで決めたシグネチャと入出力を変えない。

main には、このシグネチャと型だけを持つスタブ `src/loans/domain/extension.ts`（本体は `throw new Error("not implemented")`）を置いてある。B1 はスタブの本体を実装する。B2 はスタブのシグネチャに沿ってルートを書き、API のテストでは `vi.mock` で `extendLoan` を差し替える。これにより B2 は B1 のマージを待たずに CI を緑にできる。

### ドメイン関数（B1）

`src/loans/domain/extension.ts`

```ts
export const MAX_EXTENSIONS = 1;
export const EXTENSION_DAYS = 7;

export type ExtendResult =
  | { ok: true; loan: Loan }
  | { ok: false; reason: "not_borrower" | "already_returned" | "overdue" | "limit_reached" };

export function extendLoan(loan: Loan, userId: string, today: ISODate): ExtendResult;
```

- 成功時の `loan` は、`dueDate` を7日後にし、`extensionCount` を 1 増やした新しいオブジェクト。引数の `loan` は書き換えない
- `today` は `YYYY-MM-DD`。期限超過は `today > loan.dueDate`

### API（B2）

`POST /loans/:id/extend`（`src/loans/routes.ts`）

- 認証: `Authorization: Bearer <token>` 必須
- リクエスト本文: なし
- 今日の日付はサーバーの時計（`deps.now()`）から求める。クライアントから日付を受け取らない
- `extendLoan` を呼び、結果を次の表のとおり HTTP に変換する

| 状況 | `extendLoan` の結果 | ステータス | 本文 |
|---|---|---|---|
| 延長できた | `ok: true` | 200 | `{ "loan": Loan }`（借り手は `id` と `name` のみ） |
| 認証なし・不明なトークン | （呼ばない） | 401 | `{ "error": { "code": "UNAUTHORIZED", ... } }` |
| 貸出がない | （呼ばない） | 404 | `{ "error": { "code": "NOT_FOUND", ... } }` |
| 本人以外 | `not_borrower` | 404 | `{ "error": { "code": "NOT_FOUND", ... } }` |
| 返却済み | `already_returned` | 409 | `{ "error": { "code": "LOAN_ALREADY_RETURNED", ... } }` |
| 期限超過 | `overdue` | 409 | `{ "error": { "code": "LOAN_OVERDUE", ... } }` |
| 上限に達した | `limit_reached` | 409 | `{ "error": { "code": "EXTENSION_LIMIT_REACHED", ... } }` |

監査ログ: `action: "loan.extend"`。成功は `success`、本人以外は `denied`、それ以外の失敗は `failure`。

## 受入条件

テストの基準日は 2026-10-01（`src/test-support/app.ts` の既定値）。貸出 ID は `src/data/sample-data.ts` の初期データ。

### B1: ドメイン（`src/loans/domain/extension.test.ts`）

1. 期限内で延長回数 0 の貸出を本人が延長すると、`dueDate` が7日後になり、`extensionCount` が 1 になる
2. 返却期限の当日（`today === dueDate`）は延長できる
3. 期限の翌日は `overdue` で延長できない
4. `extensionCount` が 1 の貸出は `limit_reached`
5. 本人以外は `not_borrower`
6. 返却済みは `already_returned`
7. 返却済みかつ期限超過のように複数当てはまるときは、判定順で先の理由を返す
8. 引数の `loan` を書き換えない

### B2: API（`src/loans/routes.extension.test.ts`）

B2 のテストは `vi.mock("./domain/extension.ts")` で `extendLoan` を差し替え、「ドメイン関数の結果を HTTP にどう変換するか」だけを確かめる。延長の規則そのものは B1 のテストで確かめる。

1. `extendLoan` を、保存されている貸出、ログイン中の利用者の ID、サーバーの今日の日付（テストでは `2026-10-01`）で呼ぶ
2. `extendLoan` が `ok: true` を返すと 200 で、返された貸出を保存し、応答の `loan` にする。監査ログに `success` が残る
3. `not_borrower` なら 404（`NOT_FOUND`）で、貸出は変わらず、監査ログに `denied` が残る
4. `already_returned` / `overdue` / `limit_reached` なら 409 で、`code` はそれぞれ `LOAN_ALREADY_RETURNED` / `LOAN_OVERDUE` / `EXTENSION_LIMIT_REACHED`。監査ログに `failure` が残る
5. 存在しない貸出は 404、認証なしは 401。どちらも `extendLoan` を呼ばない
6. 応答の `borrower` は `{ id, name }` だけで、`email` と `phone` を含まない

### B1・B2 のマージ後

`npm run dev` で起動し、`u-bob` で L-0002 を延長すると返却期限が7日延び、もう一度延長すると 409（`EXTENSION_LIMIT_REACHED`）になることを確かめる。

## セキュリティ観点（secure-api）

| 観点 | 対応 |
|---|---|
| 認証・認可 | 認証必須。借り手本人だけ。認可の判定はドメイン関数で行い、ルートで重複させない |
| 入力検証 | パスパラメータの `id` だけ。本文と日付をクライアントから受け取らない |
| 個人情報の最小化 | 借り手は `id` と `name` のみ返す（既存の `toLoanResponse` を使う） |
| 監査ログ | `loan.extend` を記録。個人情報は記録しない |
| エラー | 共通のエラー形式。本人以外には貸出の有無を推測させない 404 |

## 範囲外

- 予約機能との連携
- 延長の取り消し
- 管理者による延長回数のリセット
