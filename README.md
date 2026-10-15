# aidd-playbook-sample

社内備品の貸出を管理する小さな Web API です。TypeScript と Hono で書いています。備品の一覧、貸出、返却、返却期限の延長ができ、データはすべてインメモリで持ちます。

このリポジトリは研修「Claude Code チーム開発実践〜AI-native な開発サイクルを体験する〜」の題材です。研修の進め方、ワークの一覧、追いつき用ブランチの使い方は [docs/workshop/README.md](docs/workshop/README.md) にあります。

## セットアップ

### 必要なもの

- Node.js 22 以上と npm
- `jq`（`.claude/hooks/` のスクリプトが使う）

### 動作確認

```bash
npm ci
npm run lint
npm run typecheck
npm test      # Tests  101 passed
npm run dev   # http://localhost:3000
```

別のターミナルから API を呼べます。認証は `Authorization: Bearer <利用者 ID>` です。

```bash
curl http://localhost:3000/items
curl -X POST -H 'Authorization: Bearer u-alice' -H 'Content-Type: application/json' \
  -d '{"itemId":"monitor-02"}' http://localhost:3000/loans
```

| トークン（利用者 ID） | 名前 | 役割 |
|---|---|---|
| `u-alice` | 青木 アリス | member |
| `u-bob` | 馬場 ボブ | member |
| `u-carol` | 近藤 キャロル | member |
| `u-admin` | 総務 管理者 | admin |

## API

API の定義は `openapi.yaml` にあります。`components.schemas` を変えたら `npm run generate` で `src/generated/types.ts` を作り直します。

| API | 内容 | 認可 |
|---|---|---|
| `GET /items` | 備品の一覧と貸出可否。`category` で種類を絞り、`limit` と `offset` でページングする | 不要 |
| `GET /loans` | 自分がいま借りている備品の一覧（返却期限の昇順） | ログイン中の利用者の貸出だけを返す |
| `POST /loans` | 備品を借りる（返却期限は14日後） | ログイン中の利用者が借り手になる |
| `POST /loans/:id/return` | 返却する | 借り手本人または管理者。それ以外は 404 |
| `POST /loans/:id/extend` | 返却期限を現在の期限から7日延ばす（1回まで） | 借り手本人のみ。それ以外は 404 |

貸出（`src/loans/domain/loan.ts` の `Loan`）は、借り手の個人情報（`email`、`phone`、`department`）、返却期限 `dueDate`、延長回数 `extensionCount`（初期値0）を持ちます。API の応答では借り手を `{ id, name }` に絞っています（`src/loans/presenter.ts`）。

貸出の規則はドメイン関数（`src/loans/domain/`）が持ち、ルートは入力の検証と応答への変換だけを行います。延長は、返却済み・期限超過・延長済みの貸出に 409 を返し、理由を `code` で区別します。他人の貸出かどうかを推測させないため、本人以外の貸出には存在しない場合と同じ 404 を返します。

`npm run dev` の初期データは実行日に合わせて日付をずらすので、いつ起動しても「期限超過」「今日が期限」「期限内」「返却済み」の貸出がそろいます。貸出中の備品は起動日によらず同じで、いま借りられる備品は `monitor-02` と `camera-01` の2つ、`u-alice` の貸出中は L-0001（`pc-01`）と L-0006（`camera-02`）の2件です。テストは基準日 2026-10-01 に固定しています。

## ディレクトリ構成

```text
.
├── CLAUDE.md                  # Claude Code 向けのコマンド一覧
├── REVIEW.md                  # PR レビューの観点と重み（AI レビューも人のレビューもこれに従う）
├── openapi.yaml               # API 定義。src/generated/ の生成元
├── src/
│   ├── app.ts                 # Hono アプリの組み立て（依存を注入）
│   ├── server.ts              # npm run dev の起動点
│   ├── auth/                  # 簡易認証（固定のトークン表）
│   ├── audit/                 # 監査ログ（インメモリ）
│   ├── data/                  # 初期データ（基準日 2026-10-01。起動日に合わせてずらす）
│   ├── directory/             # 社員名簿（借り手の個人情報の出どころ）
│   ├── http/                  # エラー応答の共通形式
│   ├── lib/                   # 日付の計算
│   ├── items/                 # 備品の型と API
│   ├── loans/
│   │   ├── routes.ts          # 貸出の API
│   │   ├── store.ts           # 貸出の保存先（インメモリ）
│   │   ├── presenter.ts       # 応答への変換（個人情報を落とす）
│   │   └── domain/            # ドメイン関数（lend.ts / return.ts / extension.ts）
│   ├── generated/types.ts     # openapi.yaml から生成。直接編集しない（Hook で保護する）
│   └── test-support/          # テスト用のアプリ生成
├── scripts/
│   ├── generate-types.ts      # npm run generate
│   ├── deploy.ts              # 模擬デプロイ
│   └── detect-anomaly.ts      # Maintain の異常検知
├── metrics/error-rate.json    # 日次の擬似メトリクス（60日分、平常）
├── maintain/tiers.yml         # σ の段階と応答
├── templates/workflows/       # ワークフローの雛形（ci.yml / deploy.yml）。.github/workflows/ にコピーして使う
├── .github/
│   ├── ISSUE_TEMPLATE/        # 要望（request.yml）と実装タスク（implementation.md）
│   └── workflows/             # ci.yml（lint / typecheck / test）と maintain.yml（異常検知と起票）
├── .claude/
│   ├── settings.json          # Claude Code の設定（plan の置き場所、marketplace）
│   └── hooks/                 # Hook の雛形スクリプト
└── docs/
    ├── intents/               # intent.md（何を解決したいか）
    ├── specs/                 # spec.md（要件と設計の方針）
    ├── plans/                 # plan.md（作業ごとの進め方）
    └── workshop/              # 研修の進め方、要望文、チェックリスト、実装 Issue の本文
```

テストは対象と同じディレクトリに `*.test.ts` で置きます。

## Hook の雛形

`.claude/hooks/` のスクリプトは、`.claude/settings.json` に登録して使います。どのスクリプトも標準入力の JSON を `jq` で読み、ブロックするときは exit 2 で理由を標準エラーに出します。

| スクリプト | 種類 | matcher | 内容 |
|---|---|---|---|
| `block-generated.sh` | PreToolUse | `Edit\|Write\|MultiEdit` | `src/generated/` への編集をブロック |
| `biome.sh` | PostToolUse | `Edit\|Write\|MultiEdit` | 編集した `*.ts` / `*.json` に Biome をかける |
| `protect-tests.sh` | PreToolUse | `Edit\|Write\|MultiEdit` | HEAD にコミット済みの `*.test.ts` への編集をブロック（新規テストは許可） |
| `require-release-approval.sh` | PreToolUse | `Bash` | `deploy.ts ... production` を `RELEASE_APPROVAL` なしでブロック |

登録の例（4つすべてを登録した状態）です。PreToolUse には要素を**追記**し、既存の要素を上書きしないでください。

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/block-generated.sh" },
          { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/protect-tests.sh" }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/require-release-approval.sh" }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [{ "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/biome.sh" }]
      }
    ]
  }
}
```

スクリプト単体の動作は、JSON をパイプで渡して確かめられます。

```bash
echo '{"tool_input":{"file_path":"'"$PWD"'/src/generated/types.ts"}}' | .claude/hooks/block-generated.sh; echo "exit=$?"
echo '{"tool_input":{"command":"npx tsx scripts/deploy.ts production"}}' | .claude/hooks/require-release-approval.sh; echo "exit=$?"
```

## CI、模擬デプロイ、Maintain

`.github/workflows/ci.yml` は、PR と main への push でローカルと同じ lint / typecheck / test を実行します。CI でも Maintain でも Claude は動かしません。AI レビューや診断は、すべてローカルの Claude Code で行います。

```bash
npx tsx scripts/deploy.ts staging          # デプロイ記録を出力する（Actions では Job Summary）
npx tsx scripts/detect-anomaly.ts          # tier=0〜3 などを key=value で出力する
npx tsx scripts/detect-anomaly.ts --report # 判定結果を Issue 本文に使える Markdown で出力する
```

`deploy.ts` は模擬デプロイで、実際にはどこにも配置せず、記録を出力するだけです。`templates/workflows/deploy.yml` は、main への push で staging に模擬デプロイし、production は Environments の承認を待ってから実行する雛形です。

`detect-anomaly.ts` は `maintain/tiers.yml` を読み、`metrics/error-rate.json` の最新日の値を、当日を除く直近28日の平均と標準偏差で判定します。1σ 超は記録、2σ 超は読み取り専用の診断、3σ 超は提案（`triage` ラベルの Issue を起票）です。`.github/workflows/maintain.yml` は検知と `gh issue create --label triage` だけを行います。
