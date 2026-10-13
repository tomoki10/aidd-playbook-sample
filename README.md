# aidd-playbook-sample

研修「Claude Code チーム開発実践〜AI-native な開発サイクルを体験する〜」の題材リポジトリです。社内備品の貸出を管理する小さな Web API（TypeScript / Hono）に、Anthropic の AI-native SDLC Playbook の6工程（Plan → Design → Build → Test → Deploy → Maintain）に沿って機能を追加します。

- 1周目（Day1）: 機能 A「備品の空き状況と自分の貸出の確認」（機能名 `borrowing-status`）を Plan → Design → Build で作る。A1 は備品の絞り込み（`GET /items?category=&available=`）、A2 は自分の貸出の一覧（`GET /loans/me`）で、互いの関数を呼ばない2つの作業を並行に実装する
- 2周目（Day2）: 機能 B「貸出の延長 API」（`POST /loans/:id/extend`）を作る。CI とテスト保護 Hook を入れ、実装 Issue で受入テストの観点と期待値に合意してから Build し、Deploy まで通す。B2（API）は B1（ドメイン関数）を呼ぶので、境目の関数を決めてから並行に実装する。最後に Maintain で次の周の `intent.md` をつくる

GitHub 上では Claude を実行しません。AI レビューや診断は、すべてローカルの Claude Code で行います。

## セットアップ

### 必要なもの

- Node.js 22 以上と npm
- `claude`（Claude Code）が使えること
- `gh`（GitHub CLI）が認証済みであること
- `jq`（Hook のスクリプトが使う）

### テンプレートから自分のリポジトリを作る

リポジトリは private で作ります。

```bash
gh repo create aidd-playbook-sample \
  --template tomoki10/aidd-playbook-sample \
  --include-all-branches --private --clone
cd aidd-playbook-sample
git branch -r              # origin/stage-1-done 〜 origin/stage-8-done が見えれば OK
gh auth refresh -s workflow   # .github/workflows/ のファイルを push するための権限を足す
```

ブラウザで作る場合は「Use this template」→「Create a new repository」を選び、Private にして、**「Include all branches」にチェックを入れます**（追いつき用の `stage-N-done` ブランチを使うため）。

ワーク5とワーク8では `.github/workflows/` にファイルを足して push します。`gh` のトークンに `workflow` の権限がないと push が拒否されるので、最初に `gh auth refresh -s workflow` で足しておきます。

private リポジトリ（GitHub Free）では、branch protection と Environments が使えません。ワーク7の deploy ワークフロー、Environments の承認、branch protection は講師のデモで見ます。deploy ワークフロー（`templates/workflows/deploy.yml`）は自分のリポジトリに入れません。

### ラベルを作る

テンプレートからはラベルがコピーされないので、最初に作ります。`gh label list` で確かめ、無いものだけ作ります。

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
npm test      # Tests  42 passed
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

`npm run dev` の初期データは実行日に合わせて日付をずらすので、いつ起動しても「期限超過」「今日が期限」「期限内」「返却済み」の貸出がそろいます。貸出中の備品は起動日によらず同じで、いま借りられる備品は `monitor-02` と `camera-01` の2つ、`u-alice` の貸出中は L-0001（`pc-01`）と L-0006（`camera-02`）の2件です。テストは基準日 2026-10-01 に固定しています。

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
│   ├── items/routes.ts        # 備品の API（ワーク4の A1 で絞り込みを足す）
│   ├── loans/
│   │   ├── routes.ts          # 貸出の API（ワーク4の A2 で自分の貸出の一覧を足す）
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
    └── workshop/              # 講師用の要望文、チェックリスト、機能 B の実装 Issue の本文（issues/）
```

テストは対象と同じディレクトリに `*.test.ts` で置きます。

## 研修の流れ

各ワークは「作業ブランチで作る → PR を出す → 役を切り替えてセルフレビュー → マージ」で進めます。マージは merge commit で行います（squash しない）。チェックリストは `docs/workshop/checklists.md` にあります。

| ワーク | 工程 | 作るもの | 置き場所 |
|---|---|---|---|
| 1 | Plan | 要望 Issue を起票し、Claude と壁打ちして intent を書く | Issue（`request.yml`）、`docs/intents/borrowing-status.md` |
| 2 | Design | marketplace を登録して `secure-api` Skill を有効にし、spec を書く | `.claude/settings.json`、`docs/specs/borrowing-status.md` |
| 3 | Build（土台） | CLAUDE.md を整え、Biome と生成物保護の Hook を入れる | `CLAUDE.md`、`.claude/settings.json` |
| 4 | Build（並行実装） | spec から実装 Issue を2つ（`implementation.md`）起票し、worktree 2本で plan → 実装。A1 と A2 は互いの関数を呼ばないので、スタブもマージの順番も要らない | `docs/plans/borrowing-status-a1-search.md` / `-a2-my-loans.md`、`src/items/routes.ts`、`src/loans/routes.ts`、`openapi.yaml` |
| 5 | Test | CI とテスト保護 Hook を入れ、機能 B の実装 Issue を起票して受入テストの観点と期待値に合意する | `.github/workflows/ci.yml`、`.claude/settings.json`、Issue（`docs/workshop/issues/loan-extension-b1.md` / `-b2.md` の本文） |
| 6 | Build（2周目） | main から worktree 2本、plan → 実装とテストを同じ PR で | `docs/plans/loan-extension-b1-logic.md` / `-b2-api.md`、`src/loans/domain/extension.ts` / `extension.test.ts`、`src/loans/routes.ts` / `routes.extension.test.ts`、`openapi.yaml` |
| 7 | Deploy | REVIEW.md、ローカルでの AI レビュー、リリース承認 Hook。deploy ワークフロー、Environments、branch protection は講師のデモで見る | `REVIEW.md`、`.claude/settings.json` |
| 8 | Maintain | maintain ワークフローを main にマージし、3σ を超える値を追加したブランチで手動起動して、起票された Issue をローカルで診断して intent を書く | `.github/workflows/maintain.yml`、`docs/intents/error-rate-spike.md` |

ワーク1の要望文は `docs/workshop/requests.md` にあります。機能 B の intent と spec、B1・B2 の実装 Issue の本文は講師が用意済みです（`docs/intents/loan-extension.md`、`docs/specs/loan-extension.md`、`docs/workshop/issues/loan-extension-b1.md` / `-b2.md`）。

### spec

spec（`docs/specs/<機能名>.md`）の冒頭には、元の intent、状態、適用した Skill を書きます。見出しは「要件／設計／intent の制約をどう満たすか／intent で解決しない問い／懸念点」です。

- 要件は R 番号を付けて、利用者から見た振る舞いとして書く
- 設計は方針（どこに何を足すか、何を持たないか）に留める
- リクエストとレスポンスの項目、エラーのステータスや code、関数のシグネチャ、型は spec に書かない。実装 Issue、plan、テストの側で決める

### 実装 Issue

Build の最初に、spec から実装 Issue（`.github/ISSUE_TEMPLATE/implementation.md`）を起票し、作業単位の分け方を決めます。項目は「spec／タスク ID／範囲（触る・触らない）／境目の関数／受入テスト／完了の確かめ方」です。

- 範囲は、並行するほかの Issue と同じファイルを触らないように書く。Day1 の A1・A2 が共有するのは `openapi.yaml` と `src/generated/`（`npm run generate` で再生成）だけ
- 境目の関数は、互いの関数を呼ぶ場合だけ書く。Day1 の A1・A2 は「なし」。Day2 の B2 は B1 の `extendLoan` を呼ぶので、シグネチャを書き、main にスタブ（`src/loans/domain/extension.ts`）を置く
- API を足す・変えるときは、応答とエラーコードの一覧を本文に足す。マージの順番が必要なら（Day2 は B1 が先）、本文に書く

- 受入テストには、spec の要件（R 番号）ごとの観点と期待値を書く。テストコードは書かない

ワーク4では Claude に下書きさせて起票し、`ready-for-agent` ラベルを付けます。ワーク5では、用意済みの本文から起票し、PO・エンジニア役で受入テストの観点と期待値を読みます。足りない観点や食い違う期待値があれば Issue を編集して足し、合意してから `ready-for-agent` を付けます。

```bash
gh issue create --title "[実装] B1: 貸出延長のドメイン関数 extendLoan" \
  --body-file docs/workshop/issues/loan-extension-b1.md
gh issue create --title "[実装] B2: POST /loans/:id/extend" \
  --body-file docs/workshop/issues/loan-extension-b2.md
# 受入テストの観点と期待値に合意してから
gh issue edit <番号> --add-label ready-for-agent
```

### テスト

- 新しい機能では、テストコードを実装の前に用意しません。テストの設計（spec の要件 R 番号ごとの観点と期待値）は、人が実装 Issue の「受入テスト」に書いて合意します
- テストコードは、エージェントが実装と同じ PR（同じブランチ）で書き、テスト名に R 番号を付けます（例: `[R3] 返却期限の当日は延長できる`）。レビューでは、テストが Issue の観点と期待値を満たしているかを見ます
- 実装の前に失敗するテストを用意するのは、バグを直すときの再現テストだけです
- テスト保護 Hook（`protect-tests.sh`）は、既存のテスト（回帰）とバグ修正の再現テストを守ります。エージェントが書いてコミットしたテストを、実装に合わせて書き換えるのも止めます。新しいテストファイルは作れます

### plan

`plan.md` 1本 = worktree 1本 = PR 1本です。Issue ごとに、それぞれの worktree の Plan モードで `docs/plans/<機能名>-<タスク ID>-<内容>.md` を作り、実装より先にコミットします（例: `docs/plans/borrowing-status-a1-search.md`）。

見出しは Approach（進め方。番号付きで数行）／Risks（リスク）／Verification（確かめ方）の3つで、数行ずつの粗い粒度です。spec の要件をその作業でどう満たし、どう確かめるかの言葉で書き、ファイル名、関数の中身、テストの一覧は書きません。触ってよい範囲と境目の関数は Issue で決まっているので、plan では繰り返しません。記入例は `docs/plans/loan-return.md` です。

### worktree での並行開発

ワーク4・6では worktree を2本立てます。worktree は `.claude/worktrees/` に置き、`.gitignore` で除外しています。

```bash
# ワーク4: 実装 Issue を2つ起票してから、main から新しいブランチで2本始める
claude --worktree a1-search     # ブランチは worktree-a1-search
claude --worktree a2-my-loans   # 別のターミナルで

# ワーク6: 受入テストに合意した実装 Issue を2つ用意してから、同じく main から2本始める
claude --worktree b1-logic      # ブランチは worktree-b1-logic
claude --worktree b2-api        # 別のターミナルで
```

ワーク6では、どちらの worktree でも plan をコミットしてから、実装とテストを同じブランチで書かせ、1本の PR にします。B2 のテストは B1 の `extendLoan` を `vi.mock` で差し替えるので、B1 のマージを待たずに CI を緑にできます。

worktree ごとに `npm ci` が必要です。`npm run dev` を両方で起動するときは `PORT=3001 npm run dev` のようにポートを分けます。

ワーク4の A1 と A2 は、どちらを先にマージしてもかまいません。あとからマージする側は main を取り込み（`git fetch origin && git merge origin/main`）、`openapi.yaml` で衝突したら両方の変更を残して、`npm run generate` で `src/generated/` を作り直します。マージ後に `npm run dev` で起動し、次の結果になることを確かめます。

```bash
curl -H 'Authorization: Bearer u-alice' 'http://localhost:3000/items?category=camera&available=true'   # camera-01 の1件
curl -H 'Authorization: Bearer u-alice' 'http://localhost:3000/items?available=true'                   # monitor-02 と camera-01 の2件
curl -H 'Authorization: Bearer u-alice' http://localhost:3000/loans/me                                 # L-0001 と L-0006 の2件
```

ワーク7では、B2 が B1 の `extendLoan` を呼ぶので、B1 → B2 の順にマージします。

## Hook の雛形

`.claude/hooks/` のスクリプトは、main の時点では `.claude/settings.json` に登録していません。ワークで参加者が登録します。どのスクリプトも標準入力の JSON を `jq` で読み、ブロックするときは exit 2 で理由を標準エラーに出します。

| スクリプト | 種類 | matcher | 内容 | 登録するワーク |
|---|---|---|---|---|
| `block-generated.sh` | PreToolUse | `Edit\|Write\|MultiEdit` | `src/generated/` への編集をブロック | 3 |
| `biome.sh` | PostToolUse | `Edit\|Write\|MultiEdit` | 編集した `*.ts` / `*.json` に Biome をかける | 3 |
| `protect-tests.sh` | PreToolUse | `Edit\|Write\|MultiEdit` | HEAD にコミット済みの `*.test.ts` への編集をブロック（新規テストは許可）。既存のテスト（回帰）とバグ修正の再現テストを守る。エージェントが書いてコミットしたテストを、実装に合わせて書き換えるのも止める | 5 |
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

各ワークの完了状態を `stage-N-done` ブランチとして用意しています。遅れたときは、作業ブランチで次を実行して PR を出し、マージしてから次のワークに合流します（N はワーク番号）。

```bash
git fetch origin && git switch -c catch-up/stage-N origin/main
git checkout origin/stage-N-done -- .
git commit -m "chore: stage-N-done に追いつく"
git push -u origin catch-up/stage-N && gh pr create --fill && gh pr merge --merge
```

ワーク5で CI を入れたあとは、`gh pr checks --watch` で CI が緑になったのを確かめてから `gh pr merge --merge` します（private リポジトリでは branch protection で必須チェックにできないため、自分で確かめます）。

`stage-7-done` と `stage-8-done` を取り込むときは、deploy ワークフローを自分のリポジトリに入れないよう、`.github/workflows/deploy.yml` を除外します。

```bash
git checkout origin/stage-7-done -- . ':!.github/workflows/deploy.yml'   # stage-8-done も同じ形で取り込む
```

`git merge` で取り込まないのは、テンプレートから作ったリポジトリではブランチ間の履歴がつながらない可能性があるためです。PR 経由にすると、CI の結果を見てからマージできます。

`git checkout <ブランチ> -- .` はファイルを追加・上書きするだけで、削除はしません。自分で作ったファイルが残る場合は、PR の差分を見て不要なものを消してください。

| ブランチ | 含まれるもの | 単体で `npm test` |
|---|---|---|
| `stage-1-done` | `docs/intents/borrowing-status.md` | 緑 |
| `stage-2-done` | `docs/specs/borrowing-status.md`、`.claude/settings.json`（marketplace 登録） | 緑 |
| `stage-3-done` | CLAUDE.md の整備、`block-generated.sh` / `biome.sh` の Hook 登録 | 緑 |
| `stage-4-done` | A1 の plan（`docs/plans/borrowing-status-a1-search.md`）→ A1 の実装（`GET /items` の絞り込み）→ A2 の plan（`docs/plans/borrowing-status-a2-my-loans.md`）→ A2 の実装（`GET /loans/me`）の順に積んだ状態 | 緑 |
| `stage-5-done` | `.github/workflows/ci.yml`、`protect-tests.sh` の Hook 登録 | 緑 |
| `stage-6-done` | B1 の plan（`docs/plans/loan-extension-b1-logic.md`）→ B1 の実装とテスト（`extendLoan`）→ B2 の plan（`docs/plans/loan-extension-b2-api.md`）→ B2 の実装とテスト（`POST /loans/:id/extend`）の順に積んだ状態 | 緑 |
| `stage-7-done` | `REVIEW.md`、`require-release-approval.sh` の Hook 登録（deploy ワークフローは含めない） | 緑 |
| `stage-8-done` | `.github/workflows/maintain.yml`、Maintain の診断例 `docs/intents/error-rate-spike.md` | 緑 |

実装 Issue は stage ブランチでは作られません。ワーク4の Issue は自分で起票し、ワーク5で起票する B1・B2 の Issue は `docs/workshop/issues/` の本文を使います。

ワーク2の `.claude/settings.json` にある marketplace の `repo` は `tomoki10/aidd-playbook-marketplace` を指しています。
