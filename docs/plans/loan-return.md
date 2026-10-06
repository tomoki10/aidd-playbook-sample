# plan: 備品の返却（記入例）

- spec: [docs/specs/loan-return.md](../specs/loan-return.md)
- Issue: #（実装 Issue の番号）
- 状態: 承認済み（このコミットの後に実装を始める）

## 変更するファイル

- `src/loans/domain/return.ts`、`src/loans/domain/return.test.ts`（新規）
- `src/loans/routes.ts`、`src/loans/routes.test.ts`
- `openapi.yaml`（パスの追加のみ。スキーマは既存の `LoanEnvelope` を使う）

### 触らないファイル

- `src/generated/`（スキーマを変えないので再生成しない）

### 応答とエラー

`POST /loans/:id/return` の応答は次のとおり。認証は既存の `requireAuth`、本文は共通のエラー形式 `errorBody(code, message)` を使う。

| 状況 | ステータス | 本文 | 監査ログ |
|---|---|---|---|
| 返却できた | 200 | `{ "loan": ... }`（`toLoanResponse` で借り手を `{ id, name }` に絞る） | `success` |
| 認証なし・不明なトークン | 401 | `UNAUTHORIZED` | なし |
| 貸出がない | 404 | `NOT_FOUND` | なし |
| 本人・管理者以外 | 404 | `NOT_FOUND` | `denied` |
| 返却済み | 409 | `LOAN_ALREADY_RETURNED` | `failure` |

## 作業順

方針: ドメイン関数 `returnLoan` に認可と状態の判定を寄せ、ルートは「貸出を探す → ドメイン関数を呼ぶ → 結果を HTTP に変換する → 監査ログを書く」だけにする。

1. `src/loans/domain/return.test.ts` に spec の要件 R1〜R5 をドメインのテストとして書く（失敗を確認）
2. `src/loans/domain/return.ts` に `returnLoan` を実装する
3. `src/loans/routes.test.ts` に API のテストを書く（R3 の 404 と監査ログ、R6 の個人情報）
4. `src/loans/routes.ts` に `POST /:id/return` を追加する。`not_borrower` は 404 に変換する

## リスク

- 本人以外に 403 を返すと、貸出 ID の存在が分かる。spec の R3 のとおり 404 にする

## 成功を示すテスト

- `src/loans/domain/return.test.ts` と `src/loans/routes.test.ts` が、spec の要件 R1〜R6 をそれぞれ確かめている
- `npm run lint && npm run typecheck && npm test` が通る
