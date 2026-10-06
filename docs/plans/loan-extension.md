# 分割計画: 貸出の延長

- spec: [docs/specs/loan-extension.md](../specs/loan-extension.md)
- 状態: 承認済み。講師が用意した分割計画で、2周目はこの計画に沿って B1 と B2 を並行に進める

spec を、並行に実装できる2つのタスクに分ける。各タスクの plan（`docs/plans/loan-extension-b1.md` / `-b2.md`）は、この計画を前提に書く。

## 変更するファイル

| タスク | 内容 | 変更するファイル | ブランチ |
|---|---|---|---|
| B1 | 延長の規則を判定するドメイン関数 `extendLoan` | `src/loans/domain/extension.ts`、`src/loans/domain/extension.test.ts` | `feat/b1-extend-domain` |
| B2 | `POST /loans/:id/extend` のルート | `src/loans/routes.ts`、`src/loans/routes.extension.test.ts`、`openapi.yaml` | `feat/b2-extend-api` |

B1 と B2 は同じファイルを触らない。認可（本人か）を含む延長の規則は B1 のドメイン関数で判定し、B2 のルートでは重複させない。

### 境目の関数

B2 のルートは、B1 のドメイン関数を次のシグネチャで呼ぶ。並行して実装している間は、このシグネチャと結果の型を変えない。

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

### B2 の応答とエラー

`POST /loans/:id/extend` は、認証に既存の `requireAuth`（`Authorization: Bearer <token>`）を使い、リクエスト本文を受け取らない。今日の日付は `deps.now()` から求める。

B2 は `extendLoan` の結果を次のとおり HTTP に変換する。エラーの本文は共通の形式 `{ "error": { "code": ..., "message": ... } }`。

| 状況 | `extendLoan` の結果 | ステータス | 本文 | 監査ログ（`loan.extend`） |
|---|---|---|---|---|
| 延長できた | `ok: true` | 200 | `{ "loan": ... }`（`toLoanResponse` で借り手を `{ id, name }` に絞る） | `success` |
| 認証なし・不明なトークン | （呼ばない） | 401 | `UNAUTHORIZED` | なし |
| 貸出がない | （呼ばない） | 404 | `NOT_FOUND` | なし |
| 本人以外 | `not_borrower` | 404 | `NOT_FOUND` | `denied` |
| 返却済み | `already_returned` | 409 | `LOAN_ALREADY_RETURNED` | `failure` |
| 期限超過 | `overdue` | 409 | `LOAN_OVERDUE` | `failure` |
| 上限に達した | `limit_reached` | 409 | `EXTENSION_LIMIT_REACHED` | `failure` |

応答の `loan` は既存の `LoanEnvelope` と同じ形なので、`openapi.yaml` にはパスだけを追加し、スキーマは変えない。

## 作業順

1. スタブ: 境目の関数のシグネチャと型だけを持つ `src/loans/domain/extension.ts`（本体は `throw new Error("not implemented")`）。講師が main に用意済み
2. B1 と B2 を worktree で並行に進める。B2 のテストは `vi.mock` で `extendLoan` を差し替えるので、B2 は B1 のマージを待たずにブランチ単体で CI を緑にできる
3. B1 を先にマージする
4. B2 は B1 のマージ後に main を取り込み、全テストが緑であることを確かめてからマージする

## リスク

- B2 が延長の規則（期限超過や上限の判定）をルートに書くと、B1 と判定が二重になり、食い違ったときに気づけない。ルートは変換だけにする
- 並行して実装している間に境目の関数を変えると、もう一方のタスクが壊れる。変えるときは、この分割計画の PR から変える
- B2 のテストは `extendLoan` を差し替えているので、B2 単体では延長の規則とつながっているかを確かめられない。B1 のマージ後に main を取り込んで確かめる

## 成功を示すテスト

spec の要件（R 番号）を、タスクごとのテストに分ける。括弧内は対応する要件で、テスト名にも付ける。

### B1: ドメイン（`src/loans/domain/extension.test.ts`）

1. 期限内で延長回数 0 の貸出を本人が延長すると、`dueDate` が7日後になり、`extensionCount` が 1 になる（R1）
2. 返却期限の当日（`today === dueDate`）は延長できる（R3）
3. 期限の翌日は `overdue` で延長できない（R3）
4. `extensionCount` が 1 の貸出は `limit_reached`（R2）
5. 本人以外は `not_borrower`（R4）
6. 返却済みは `already_returned`（R5）
7. 返却済みかつ期限超過のように複数当てはまるときは、判定順で先の理由を返す（R5）
8. 引数の `loan` を書き換えない（R1）

### B2: API（`src/loans/routes.extension.test.ts`）

`vi.mock("./domain/extension.ts")` で `extendLoan` を差し替え、「ドメイン関数の結果を HTTP にどう変換するか」だけを確かめる。延長の規則そのものは B1 のテストで確かめる。

1. `extendLoan` を、保存されている貸出、ログイン中の利用者の ID、サーバーの今日の日付（テストでは `2026-10-01`）で呼ぶ（R1）
2. `extendLoan` が `ok: true` を返すと 200 で、返された貸出を保存し、応答の `loan` にする。監査ログに `success` が残る（R1、R6）
3. `not_borrower` なら 404（`NOT_FOUND`）で、貸出は変わらず、監査ログに `denied` が残る（R4、R6）
4. `already_returned` / `overdue` / `limit_reached` なら 409 で、`code` はそれぞれ `LOAN_ALREADY_RETURNED` / `LOAN_OVERDUE` / `EXTENSION_LIMIT_REACHED`。監査ログに `failure` が残る（R2、R3、R5、R6）
5. 存在しない貸出は 404、認証なしは 401。どちらも `extendLoan` を呼ばない（R4）
6. 応答の `borrower` は `{ id, name }` だけで、`email` と `phone` を含まない（R6）

### 全体の確かめ方

- 各タスクのブランチで `npm run lint && npm run typecheck && npm test` が通る（B2 のブランチでは、B1 の受入テストは実装前のため失敗のままでよい）
- B1・B2 のマージ後、main で `npm test` が緑になる
- `npm run dev` で起動し、`u-bob` で L-0002 を延長すると返却期限が7日延び、もう一度延長すると 409（`EXTENSION_LIMIT_REACHED`）になる
