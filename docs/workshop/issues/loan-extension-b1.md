## spec

`docs/specs/loan-extension.md`（R1〜R4 の延長の規則）

## タスク ID

B1（貸出延長のドメイン関数 `extendLoan`）

## 範囲

- 触る: `src/loans/domain/extension.ts`（main にあるスタブの本体）、`src/loans/domain/extension.test.ts`（実装と同じ PR で新しく作るテスト）
- 触らない: `src/loans/routes.ts`、`src/loans/routes.extension.test.ts`、`openapi.yaml`、`src/generated/`（B2 の範囲）
- ブランチ: `worktree-b1-logic`（`claude --worktree b1-logic` で main から作る）

延長の規則（本人か、返却済みか、期限超過か、上限か）は、この B1 のドメイン関数だけで判定します。B2 のルートには判定を書きません。

## 境目の関数

B2 のルートは、この関数を次のシグネチャで呼びます。main にはシグネチャだけを持つスタブ（本体は `throw new Error("not implemented")`）を置いてあります。B1 と B2 を並行して実装している間は、シグネチャと結果の型を変えません。

`src/loans/domain/extension.ts`

```ts
export const MAX_EXTENSIONS = 1;
export const EXTENSION_DAYS = 7;

export type ExtendResult =
  | { ok: true; loan: Loan }
  | { ok: false; reason: "not_borrower" | "already_returned" | "overdue" | "limit_reached" };

export function extendLoan(loan: Loan, userId: string, today: ISODate): ExtendResult;
```

- 成功時の `loan` は、`dueDate` を7日後にし、`extensionCount` を1増やした新しいオブジェクト。引数の `loan` は書き換えない
- `today` は `YYYY-MM-DD`。期限超過は `today > loan.dueDate`（当日は期限内）
- 延長できない理由が複数あるときは、「本人でない → 返却済み → 期限超過 → 上限」の順で先の理由を返す

## 受入テスト

テストの設計です。spec の要件（R 番号）ごとに、確かめる観点と期待値を書きます。受講者は PO・エンジニア役でこの表を読み、足りない観点や食い違う期待値があれば Issue に足して合意してから、`ready-for-agent` を付けます。

テストコードはこの Issue には書きません。エージェントが実装と同じ PR（同じブランチ）で `src/loans/domain/extension.test.ts` に書き、テスト名に R 番号を付けます（例: `[R1] 期限内で延長0回の貸出を本人が延長すると、返却期限が7日後になり、延長回数が1になる`）。

前提: 借り手が `u-bob`、返却期限が 2026-10-04、延長回数が0の返却前の貸出。今日は 2026-10-01。

| 要件 | 観点 | 期待値 |
|---|---|---|
| R1・R2 | 延長の日数と上限 | `EXTENSION_DAYS` が7、`MAX_EXTENSIONS` が1 |
| R1 | 期限内・延長0回の貸出を本人が延長する | `ok: true`。返却期限が現在の返却期限の7日後（2026-10-11）、延長回数が1 |
| R1 | 返却済みの貸出を本人が延長する | `ok: false`、理由は `already_returned` |
| R1 | 延長したあとの引数の `loan` | 書き換わっていない（延長後の貸出は新しいオブジェクトで返す） |
| R2 | 延長回数が1の貸出を本人が延長する | `ok: false`、理由は `limit_reached` |
| R3 | 返却期限の当日に延長する（返却期限 2026-10-01） | `ok: true`。返却期限が 2026-10-08 |
| R3 | 返却期限の翌日に延長する（返却期限 2026-09-30） | `ok: false`、理由は `overdue` |
| R4 | 本人以外の利用者（`u-alice`）と管理者（`u-admin`）が延長する | どちらも `ok: false`、理由は `not_borrower` |
| R1〜R4 | 延長できない理由が複数あてはまる | 「本人でない → 返却済み → 期限超過 → 上限」の順で、先の理由を1つだけ返す |

## 完了の確かめ方

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`（`src/loans/domain/extension.test.ts` がすべて通る）
- [ ] 上の受入テストの観点と期待値が、すべてテストになっている。テスト名に R 番号が付いている

## マージの順番

B2 が B1 の `extendLoan` を呼ぶので、B1 を先にマージします。
