## spec

`docs/specs/loan-extension.md`（R1〜R4 の延長の規則）

## タスク ID

B1（貸出延長のドメイン関数 `extendLoan`）

## 範囲

- 触る: `src/loans/domain/extension.ts`（main にあるスタブの本体）、`src/loans/domain/extension.test.ts`（受入テスト）
- 触らない: `src/loans/routes.ts`、`src/loans/routes.extension.test.ts`、`openapi.yaml`、`src/generated/`（B2 の範囲）
- ブランチ: `feat/b1-extend-domain`

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

`src/loans/domain/extension.test.ts` に、次の観点を書きます。括弧内は対応する spec の要件で、テスト名にも付けます。

1. 期限内で延長回数0の貸出を本人が延長すると、`dueDate` が7日後になり、`extensionCount` が1になる（R1）
2. 返却期限の当日（`today === dueDate`）は延長できる（R3）
3. 期限の翌日は `overdue` で延長できない（R3）
4. `extensionCount` が1の貸出は `limit_reached`（R2）
5. 本人以外（管理者を含む）は `not_borrower`（R4）
6. 返却済みは `already_returned`（R1）
7. 複数に当てはまるときは、判定順で先の理由を返す（R1〜R4）
8. 引数の `loan` を書き換えない（R1）

## 完了の確かめ方

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`（`src/loans/domain/extension.test.ts` がすべて通る）

## マージの順番

B2 が B1 の `extendLoan` を呼ぶので、B1 を先にマージします。
