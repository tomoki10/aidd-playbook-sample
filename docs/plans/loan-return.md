# plan: 備品の返却（記入例）

- spec: [docs/specs/loan-return.md](../specs/loan-return.md)
- Issue: #（実装 Issue の番号）
- 状態: 承認済み（このコミットの後に実装を始める）

## 方針

ドメイン関数 `returnLoan` に認可と状態の判定を寄せ、ルートは「貸出を探す → ドメイン関数を呼ぶ → 結果を HTTP に変換する → 監査ログを書く」だけにする。

## 手順

1. `src/loans/domain/return.test.ts` に spec の受入条件 1〜5 をドメインのテストとして書く（失敗を確認）
2. `src/loans/domain/return.ts` に `returnLoan` を実装する
3. `src/loans/routes.test.ts` に API のテストを書く（受入条件 3 の 404 と監査ログ、6 の個人情報）
4. `src/loans/routes.ts` に `POST /:id/return` を追加する。`not_borrower` は 404 に変換する
5. `npm run lint && npm run typecheck && npm test` が通ることを確かめる

## 触るファイル

- `src/loans/domain/return.ts`、`src/loans/domain/return.test.ts`（新規）
- `src/loans/routes.ts`、`src/loans/routes.test.ts`
- `openapi.yaml`（パスの追加のみ。スキーマは既存の `LoanEnvelope` を使う）

## 触らないファイル

- `src/generated/`（スキーマを変えないので再生成しない）

## リスク

- 本人以外に 403 を返すと、貸出 ID の存在が分かる。spec どおり 404 にする
