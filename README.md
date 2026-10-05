# aidd-playbook-sample

研修「Claude Code チーム開発実践〜AI-native な開発サイクルを体験する〜」の題材リポジトリです。社内備品の貸出を管理する小さな Web API（TypeScript / Hono）に、Anthropic の AI-native SDLC Playbook の6工程（Plan → Design → Build → Test → Deploy → Maintain）に沿って機能を追加します。

- 1周目（Day1）: 機能 A「返却期限超過一覧 API」（`GET /loans/overdue`）を Plan → Design → Build で作る
- 2周目（Day2）: 機能 B「貸出の延長 API」（`POST /loans/:id/extend`）を、検証の仕組みを先に仕込んでから Build し、Deploy まで通す。最後に Maintain で次の周の `intent.md` をつくる

GitHub 上では Claude を実行しません。AI レビューや診断は、すべてローカルの Claude Code で行います。

## セットアップ

### 必要なもの

- Node.js 22 以上と npm
- `claude`（Claude Code）が使えること
- `gh`（GitHub CLI）が認証済みであること
- `jq`（Hook のスクリプトが使う）

### テンプレートから自分のリポジトリを作る

1. このリポジトリの「Use this template」→「Create a new repository」を選ぶ
2. **「Include all branches」にチェックを入れる**（追いつき用の `stage-N-done` ブランチを使うため）
3. 作成したリポジトリをクローンする

`gh` で作る場合は次のとおりです。

```bash
gh repo create <自分のリポジトリ名> --template <講師の org>/aidd-playbook-sample --include-all-branches --public --clone
cd <自分のリポジトリ名>
```

### ラベルを作る

テンプレートからはラベルがコピーされないので、最初に作ります。

```bash
gh label create intent --color 1D76DB --description "要望・次の周の intent の起点"
gh label create ready-for-agent --color 0E8A16 --description "spec がマージ済みで、エージェントに渡せる実装 Issue"
gh label create triage --color D93F0B --description "Maintain の検知で起票された Issue"
```

### 動作確認

```bash
npm ci
npm run lint
npm run typecheck
npm test
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

## 既存の機能

| API | 内容 | 認可 |
|---|---|---|
| `GET /items` | 備品の一覧と貸出可否 | 不要 |
| `POST /loans` | 備品を借りる（返却期限は14日後） | ログイン中の利用者が借り手になる |
| `POST /loans/:id/return` | 返却する | 借り手本人または管理者。それ以外は 404 |

貸出（`src/loans/domain/loan.ts` の `Loan`）は、借り手の個人情報（`email`、`phone`、`department`）、返却期限 `dueDate`、延長回数 `extensionCount`（初期値0）を持ちます。API の応答では借り手を `{ id, name }` に絞っています（`src/loans/presenter.ts`）。

`npm run dev` の初期データは実行日に合わせて日付をずらすので、いつ起動しても「期限超過」「今日が期限」「期限内」「返却済み」の貸出がそろいます。テストは基準日 2026-10-01 に固定しています。

## ディレクトリ構成

```text
.
├── CLAUDE.md                  # コマンドだけの最小版（ワーク3で整える）
├── openapi.yaml               # API 定義。src/generated/ の生成元
├── src/
│   ├── app.ts                 # Hono アプリの組み立て（依存を注入）
│   ├── server.ts              # npm run dev の起動点
│   ├── auth/                  # 簡易認証（固定のトークン表）
│   ├── audit/                 # 監査ログ（インメモリ）
│   ├── items/                 # 備品
│   ├── loans/
│   │   ├── routes.ts          # 貸出の API
│   │   ├── presenter.ts       # 応答への変換（個人情報を落とす）
│   │   └── domain/            # ドメイン関数（lend.ts / return.ts、機能 B のスタブ extension.ts）
│   ├── generated/types.ts     # openapi.yaml から生成。直接編集しない（Hook で保護する）
│   └── test-support/          # テスト用のアプリ生成
├── scripts/
│   ├── generate-types.ts      # npm run generate
│   ├── deploy.ts              # 模擬デプロイ
│   └── detect-anomaly.ts      # Maintain の異常検知
├── metrics/error-rate.json    # 日次の擬似メトリクス（60日分、平常）
├── maintain/tiers.yml         # σ の段階と応答
├── templates/workflows/       # ワークで .github/workflows/ にコピーする雛形
├── .claude/hooks/             # Hook の雛形スクリプト（ワークで settings.json に登録する）
├── .github/ISSUE_TEMPLATE/    # 要望（request.yml）と実装タスク（implementation.md）
└── docs/
    ├── intents/               # intent.md（返却機能の記入例、機能 B）
    ├── specs/                 # spec.md（返却機能の記入例、機能 B）
    ├── plans/                 # plan.md（返却機能の記入例）
    └── workshop/              # 講師用の要望文とチェックリスト
```

テストは対象と同じディレクトリに `*.test.ts` で置きます。

## 研修の流れ

各ワークは「作業ブランチで作る → PR を出す → 役を切り替えてセルフレビュー → マージ」で進めます。チェックリストは `docs/workshop/checklists.md` にあります。

| ワーク | 工程 | 作るもの | 置き場所 |
|---|---|---|---|
| 1 | Plan | 要望 Issue を起票し、Claude と壁打ちして intent を書く | Issue（`request.yml`）、`docs/intents/overdue-loans.md` |
| 2 | Design | marketplace を登録して `secure-api` Skill を有効にし、spec を書く | `.claude/settings.json`、`docs/specs/overdue-loans.md` |
| 3 | Build（土台） | CLAUDE.md を整え、Biome と生成物保護の Hook を入れる | `CLAUDE.md`、`.claude/settings.json` |
| 4 | Build（並行実装） | Issue を2つ（`implementation.md`）起票し、spec のシグネチャで `listOverdue` のスタブを main にコミットしてから、worktree 2本で plan → 実装。A2 のテストは `vi.mock` でスタブを差し替える | `docs/plans/overdue-loans-a1.md` / `-a2.md`、`src/loans/domain/overdue.ts`、`src/loans/routes.ts`、`src/loans/routes.overdue.test.ts` |
| 5 | Test | CI とテスト保護 Hook を入れ、機能 B の受入テストを feat ブランチにコミット | `.github/workflows/ci.yml`、`.claude/settings.json`、`src/loans/domain/extension.test.ts`、`src/loans/routes.extension.test.ts` |
| 6 | Build（2周目） | 受入テストを起点に worktree 2本で plan → 実装 | `docs/plans/loan-extension-b1.md` / `-b2.md`、`src/loans/domain/extension.ts`、`src/loans/routes.ts` |
| 7 | Deploy | REVIEW.md、ローカルでの AI レビュー、deploy ワークフロー、Environments、branch protection、リリース承認 Hook | `REVIEW.md`、`.github/workflows/deploy.yml`、`.claude/settings.json` |
| 8 | Maintain | maintain ワークフローを main にマージし、3σ を超える値を追加したブランチで手動起動して、起票された Issue をローカルで診断して intent を書く | `.github/workflows/maintain.yml`、`docs/intents/<診断>.md` |

ワーク1の要望文は `docs/workshop/requests.md` にあります。機能 B の intent と spec は講師が用意済みです（`docs/intents/loan-extension.md`、`docs/specs/loan-extension.md`）。main には spec のシグネチャだけを持つスタブ `src/loans/domain/extension.ts` を置いてあり、B2 のテストは `vi.mock` でこれを差し替えるので、B1 と B2 をそれぞれ単独で CI 緑にできます。

### worktree での並行開発

ワーク4・6では worktree を2本立てます。worktree は `.claude/worktrees/` に置き、`.gitignore` で除外しています。

```bash
# ワーク4: listOverdue のスタブを main にコミットしてから、新しいブランチで2本始める
claude --worktree a1-domain
claude --worktree a2-api
# ワーク6: ワーク5で受入テストをコミットした既存ブランチを起点にする
git worktree add .claude/worktrees/b1 feat/b1-extend-domain
git worktree add .claude/worktrees/b2 feat/b2-extend-api
```

worktree ごとに `npm ci` が必要です。`npm run dev` を両方で起動するときは `PORT=3001 npm run dev` のようにポートを分けます。

## Hook の雛形

`.claude/hooks/` のスクリプトは、main の時点では `.claude/settings.json` に登録していません。ワークで参加者が登録します。どのスクリプトも標準入力の JSON を `jq` で読み、ブロックするときは exit 2 で理由を標準エラーに出します。

| スクリプト | 種類 | matcher | 内容 | 登録するワーク |
|---|---|---|---|---|
| `block-generated.sh` | PreToolUse | `Edit\|Write\|MultiEdit` | `src/generated/` への編集をブロック | 3 |
| `biome.sh` | PostToolUse | `Edit\|Write\|MultiEdit` | 編集した `*.ts` / `*.json` に Biome をかける | 3 |
| `protect-tests.sh` | PreToolUse | `Edit\|Write\|MultiEdit` | HEAD にコミット済みの `*.test.ts` への編集をブロック（新規テストは許可） | 5 |
| `require-release-approval.sh` | PreToolUse | `Bash` | `deploy.ts ... production` を `RELEASE_APPROVAL` なしでブロック | 7 |

登録の例（ワーク7まで終えた状態）です。PreToolUse には要素を**追記**し、既存の要素を上書きしないでください。

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

## 模擬デプロイと Maintain

```bash
npx tsx scripts/deploy.ts staging          # デプロイ記録を出力する（Actions では Job Summary）
npx tsx scripts/detect-anomaly.ts          # tier=0〜3 などを key=value で出力する
npx tsx scripts/detect-anomaly.ts --report # 判定結果を Issue 本文に使える Markdown で出力する
```

`detect-anomaly.ts` は `maintain/tiers.yml` を読み、`metrics/error-rate.json` の最新日の値を、当日を除く直近28日の平均と標準偏差で判定します。1σ 超は記録、2σ 超は読み取り専用の診断、3σ 超は提案（`triage` ラベルの Issue を起票）です。`templates/workflows/maintain.yml` は検知と `gh issue create --label triage` だけを行い、Claude は使いません。

ワーク8では、`maintain.yml` を main にマージしてから（`workflow_dispatch` は既定ブランチにあるワークフローしか起動できないため）、3σ を超える値を追加した作業ブランチを push し、`gh workflow run maintain.yml --ref <ブランチ>` で手動起動します。現在のデータで 3σ を超える値は、`--report` の平均と標準偏差から求められます（目安は 1.18 以上）。

## 追いつき用ブランチ

各ワークの完了状態を `stage-N-done` ブランチとして用意しています。遅れたときは、作業ブランチで次を実行して PR を出し、マージしてから次のワークに合流します。

```bash
git fetch origin
git switch -c catch-up/stage-4 origin/main
git checkout origin/stage-4-done -- .
git commit -m "chore: stage-4-done に追いつく"
git push -u origin catch-up/stage-4
gh pr create --fill
```

`git merge` で取り込まないのは、テンプレートから作ったリポジトリではブランチ間の履歴がつながらない可能性があるためです。PR 経由にすると、ワーク7で branch protection を入れたあとも同じ手順で合流できます。

`git checkout <ブランチ> -- .` はファイルを追加・上書きするだけで、削除はしません。自分で作ったファイルが残る場合は、PR の差分を見て不要なものを消してください。

| ブランチ | 含まれるもの | 単体で `npm test` |
|---|---|---|
| `stage-1-done` | `docs/intents/overdue-loans.md` | 緑 |
| `stage-2-done` | `docs/specs/overdue-loans.md`、`.claude/settings.json`（marketplace 登録） | 緑 |
| `stage-3-done` | CLAUDE.md の整備、`block-generated.sh` / `biome.sh` の Hook 登録 | 緑 |
| `stage-4-done` | `listOverdue` のスタブ → A1（`docs/plans/overdue-loans-a1.md`、ドメイン関数）→ A2（`docs/plans/overdue-loans-a2.md`、API と `vi.mock` を使うテスト）の順に積んだ状態 | 緑 |
| `stage-5-done` | `.github/workflows/ci.yml`、`protect-tests.sh` の Hook 登録、B1 / B2 の受入テスト | **赤**（受入テストが実装前のため意図どおり失敗。lint と typecheck は緑） |
| `stage-6-done` | `docs/plans/loan-extension-b1.md` / `-b2.md`、機能 B の実装 | 緑 |
| `stage-7-done` | `REVIEW.md`、`.github/workflows/deploy.yml`、`require-release-approval.sh` の Hook 登録 | 緑 |
| `stage-8-done` | `.github/workflows/maintain.yml`、Maintain の診断例 `docs/intents/error-rate-spike.md` | 緑 |

`stage-5-done` だけは、`git checkout origin/stage-5-done -- .` で丸ごと取り込まないでください。失敗する受入テストが main に入り、CI が赤になります。前半（CI と Hook）は main への PR に、後半（受入テスト）は feat ブランチに分けて取り込みます。

```bash
# 前半: CI とテスト保護 Hook を main に入れる
git switch -c catch-up/stage-5 origin/main
git checkout origin/stage-5-done -- .github/workflows/ci.yml .claude/settings.json
git commit -m "chore: stage-5-done の CI と Hook に追いつく"
git push -u origin catch-up/stage-5
gh pr create --fill   # マージしてから後半へ

# 後半: 受入テストを feat ブランチの起点にする（main には入れない）
git fetch origin
git switch -c feat/b1-extend-domain origin/main
git checkout origin/stage-5-done -- src/loans/domain/extension.test.ts
git commit -m "test: B1 の受入テストを追加"
git push -u origin feat/b1-extend-domain

git switch -c feat/b2-extend-api origin/main
git checkout origin/stage-5-done -- src/loans/routes.extension.test.ts
git commit -m "test: B2 の受入テストを追加"
git push -u origin feat/b2-extend-api
```

`stage-6-done` に追いつくときは、通常どおり `git checkout origin/stage-6-done -- .` で取り込めます（受入テストと実装の両方が入り、緑になります）。

ワーク2の `.claude/settings.json` にある marketplace の `repo` は講師の org を指しています。講師が当日提示する値に合わせてください。
