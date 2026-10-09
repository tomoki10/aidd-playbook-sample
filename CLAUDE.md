# aidd-playbook-sample

社内備品の貸出を管理する Web API（TypeScript / Hono / Vitest / Biome / npm）。データはインメモリで、DB は使わない。

## コマンド

| 目的 | コマンド | 正常時の出力（末尾） |
|---|---|---|
| 依存の導入 | `npm ci` | `found 0 vulnerabilities` |
| 開発サーバー | `npm run dev` | `備品貸出 API: http://localhost:3000` |
| テスト | `npm test` | `Test Files  N passed` / `Tests  N passed` |
| lint と整形の確認 | `npm run lint` | `Checked N files in Nms. No fixes applied.` |
| lint と整形の自動修正 | `npm run format` | `Checked N files ...` |
| 型検査 | `npm run typecheck` | 何も出ずに終了コード 0 |
| 生成物の再生成 | `npm run generate` | `generated: .../src/generated/types.ts` |

変更を終えたら `npm run lint && npm run typecheck && npm test` がすべて通ることを確かめる。

## 構成

- API の構造は `openapi.yaml` を確認する。`src/generated/types.ts` はそこから生成する
- `src/app.ts`: アプリの組み立て。依存（`Deps`: items / loans / audit / now）を注入する
- `src/items/routes.ts`: 備品の API（認証不要）。借り手の情報を返さない
- `src/loans/routes.ts`: 貸出の API。ルートは「取得 → ドメイン関数 → HTTP への変換 → 監査ログ」だけを書く
- `src/loans/domain/`: ドメイン関数。HTTP やストアに依存しない純粋な関数にする
- `src/loans/presenter.ts`: ドメインの `Loan` を応答に変換する。借り手は `{ id, name }` だけ
- `src/auth/`: 簡易認証。`requireAuth`（401）と `requireAdmin`（403）
- `docs/intents/` → `docs/specs/` → 実装 Issue → `docs/plans/`: 成果物の連鎖。実装は spec、実装 Issue、plan に従う。作業単位の分け方、触ってよい範囲、境目の関数、応答とエラーコードは実装 Issue に書いてある（`gh issue view <番号>` で読む）
- plan は `docs/plans/<機能名>-<タスク ID>-<内容>.md` に、Approach／Risks／Verification の3つの見出しで数行ずつ書き、実装より先にコミットする

## 規約

- 日付は `YYYY-MM-DD` の文字列（`src/lib/date.ts`）。今日は `deps.now()` から求め、クライアントから受け取らない
- エラー応答は `errorBody(code, message)` の共通形式。内部の例外内容を返さない
- 他人のリソースへのアクセスは、存在しない場合と同じ 404 を返す
- 個人情報（借り手の email / phone / department）を応答と監査ログに出さない
- テストは対象と同じディレクトリに `*.test.ts` で置く。API のテストは `src/test-support/app.ts` の `createTestApp()` を使う（今日は 2026-10-01 に固定）
- import には拡張子 `.ts` を付ける

## 繰り返し直している間違い

- `src/generated/` を直接編集する → `openapi.yaml` を直して `npm run generate`（Hook でブロックされる）
- ドメインの `Loan` をそのまま `c.json()` に渡して email / phone が漏れる → `toLoanResponse` などの変換を通す
- 今日の日付を `new Date()` で直接取る → テストで固定できなくなる。`deps.now()` を使う
- Issue の範囲の外のファイルを変える → 並行しているもう一方の作業と衝突する。必要になったら止まって理由を説明する
- 実装 Issue で決めた境目の関数のシグネチャを実装中に変える → 呼ぶ側の作業が壊れる。変えるなら Issue で合意してから
