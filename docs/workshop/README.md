# 研修の進め方

研修「Claude Code チーム開発実践〜AI-native な開発サイクルを体験する〜」の進め方です。題材のアプリ（備品貸出 API）の説明、API の一覧、ディレクトリ構成は、リポジトリ直下の [README.md](../../README.md) にあります。

備品貸出 API に、Anthropic の AI-native SDLC Playbook の6工程（Plan → Design → Build → Test → Deploy → Maintain）に沿って機能を追加します。

- 1周目（Day1）: 機能 A「備品の空き状況と自分の貸出の確認」（機能名 `borrowing-status`）を Plan → Design → Build で作る。A1 は備品の絞り込み（`GET /items?category=&available=`）、A2 は自分の貸出の一覧（`GET /loans/me`）で、互いの関数を呼ばない2つの作業を並行に実装する
- 2周目（Day2）: 機能 B「貸出の延長 API」（`POST /loans/:id/extend`）を、検証の仕組みを先に仕込んでから Build し、Deploy まで通す。B2（API）は B1（ドメイン関数）を呼ぶので、境目の関数を決めてから並行に実装する。最後に Maintain で次の周の `intent.md` をつくる

GitHub 上では Claude を実行しません。AI レビューや診断は、すべてローカルの Claude Code で行います。

## 準備

### 必要なもの

- Node.js 22 以上と npm
- `claude`（Claude Code）が使えること
- `gh`（GitHub CLI）が認証済みであること
- `jq`（Hook のスクリプトが使う）

### テンプレートから自分のリポジトリを作る

```bash
gh repo create aidd-playbook-sample \
  --template tomoki10/aidd-playbook-sample \
  --include-all-branches --public --clone
cd aidd-playbook-sample
git branch -r   # origin/stage-1-done 〜 origin/stage-8-done が見えれば OK
```

ブラウザで作る場合は「Use this template」→「Create a new repository」を選び、**「Include all branches」にチェックを入れます**。追いつき用の `stage-N-done` ブランチを使うためです。

### ラベルを作る

テンプレートからはラベルがコピーされないので、最初に作ります。`gh label list` で確かめ、無いものだけ作ります。

```bash
gh label create intent --color 1D76DB --description "要望・次の周の intent の起点"
gh label create ready-for-agent --color 0E8A16 --description "spec がマージ済みで、エージェントに渡せる実装 Issue"
gh label create triage --color D93F0B --description "Maintain の検知で起票された Issue"
```

### 動作確認

`npm ci` から `npm run dev` までの手順と、API の呼び方は [README.md](../../README.md) の「セットアップ」にあります。

## 研修の流れ

各ワークは「作業ブランチで作る → PR を出す → 役を切り替えてセルフレビュー → マージ」で進めます。マージは merge commit で行います（squash しない）。チェックリストは [checklists.md](checklists.md) にあります。

| ワーク | 工程 | 作るもの | 置き場所 |
|---|---|---|---|
| 1 | Plan | 要望 Issue を起票し、Claude と壁打ちして intent を書く | Issue（`request.yml`）、`docs/intents/borrowing-status.md` |
| 2 | Design | marketplace を登録して `secure-api` Skill を有効にし、spec を書く | `.claude/settings.json`、`docs/specs/borrowing-status.md` |
| 3 | Build（土台） | CLAUDE.md を整え、Biome と生成物保護の Hook を入れる | `CLAUDE.md`、`.claude/settings.json` |
| 4 | Build（並行実装） | spec から実装 Issue を2つ（`implementation.md`）起票し、worktree 2本で plan → 実装。A1 と A2 は互いの関数を呼ばないので、スタブもマージの順番も要らない | `docs/plans/borrowing-status-a1-search.md` / `-a2-my-loans.md`、`src/items/routes.ts`、`src/loans/routes.ts`、`openapi.yaml` |
| 5 | Test | CI とテスト保護 Hook を main に入れ、機能 B の実装 Issue を起票し、受入テストを feat ブランチにコミット | `.github/workflows/ci.yml`、`.claude/settings.json`、`src/loans/domain/extension.test.ts`、`src/loans/routes.extension.test.ts` |
| 6 | Build（2周目） | 受入テストを起点に worktree 2本で plan → 実装 | `docs/plans/loan-extension-b1-logic.md` / `-b2-api.md`、`src/loans/domain/extension.ts`、`src/loans/routes.ts` |
| 7 | Deploy | REVIEW.md、ローカルでの AI レビュー、deploy ワークフロー、Environments、branch protection、リリース承認 Hook | `REVIEW.md`、`.github/workflows/deploy.yml`、`.claude/settings.json` |
| 8 | Maintain | maintain ワークフローを main にマージし、3σ を超える値を追加したブランチで手動起動して、起票された Issue をローカルで診断して intent を書く | `.github/workflows/maintain.yml`、`docs/intents/error-rate-spike.md` |

ワーク1の要望文は [requests.md](requests.md) にあります。機能 B の intent と spec、B1・B2 の実装 Issue の本文は講師が用意済みです。置き場所は `docs/intents/loan-extension.md`、`docs/specs/loan-extension.md`、`issues/loan-extension-b1.md` / `-b2.md` です。

ワーク2で `.claude/settings.json` に登録する marketplace の `repo` は `tomoki10/aidd-playbook-marketplace` を指しています。

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

ワーク4では Claude に下書きさせて起票し、`ready-for-agent` ラベルを付けます。ワーク5では、用意済みの本文から起票します。

```bash
gh issue create --label ready-for-agent --title "[実装] B1: 貸出延長のドメイン関数 extendLoan" \
  --body-file docs/workshop/issues/loan-extension-b1.md
gh issue create --label ready-for-agent --title "[実装] B2: POST /loans/:id/extend" \
  --body-file docs/workshop/issues/loan-extension-b2.md
```

### plan

`plan.md` 1本 = worktree 1本 = PR 1本です。Issue ごとに、それぞれの worktree の Plan モードで `docs/plans/<機能名>-<タスク ID>-<内容>.md` を作り、実装より先にコミットします。ファイル名の例は `docs/plans/borrowing-status-a1-search.md` です。

見出しは Approach（進め方。番号付きで数行）／Risks（リスク）／Verification（確かめ方）の3つで、数行ずつの粗い粒度です。spec の要件をその作業でどう満たし、どう確かめるかの言葉で書き、ファイル名、関数の中身、テストの一覧は書きません。触ってよい範囲と境目の関数は Issue で決まっているので、plan では繰り返しません。記入例は `docs/plans/loan-return.md` です。

### worktree での並行開発

ワーク4・6では worktree を2本立てます。worktree は `.claude/worktrees/` に置き、`.gitignore` で除外しています。

```bash
# ワーク4: 実装 Issue を2つ起票してから、main から新しいブランチで2本始める
claude --worktree a1-search     # ブランチは worktree-a1-search
claude --worktree a2-my-loans   # 別のターミナルで

# ワーク6: ワーク5で受入テストをコミットした既存ブランチを起点にする
git switch main && git fetch origin
git worktree add .claude/worktrees/b1 feat/b1-extend-domain
git worktree add .claude/worktrees/b2 feat/b2-extend-api
```

worktree ごとに `npm ci` が必要です。`npm run dev` を両方で起動するときは `PORT=3001 npm run dev` のようにポートを分けます。

ワーク4の A1 と A2 は、どちらを先にマージしてもかまいません。あとからマージする側は main を取り込みます（`git fetch origin && git merge origin/main`）。`openapi.yaml` で衝突したら両方の変更を残して、`npm run generate` で `src/generated/` を作り直します。マージ後に `npm run dev` で起動し、次の結果になることを確かめます。

```bash
curl -H 'Authorization: Bearer u-alice' 'http://localhost:3000/items?category=camera&available=true'   # camera-01 の1件
curl -H 'Authorization: Bearer u-alice' 'http://localhost:3000/items?available=true'                   # monitor-02 と camera-01 の2件
curl -H 'Authorization: Bearer u-alice' http://localhost:3000/loans/me                                 # L-0001 と L-0006 の2件
```

ワーク7では、B2 が B1 の `extendLoan` を呼ぶので、B1 → B2 の順にマージします。

## Hook を登録するワーク

`.claude/hooks/` のスクリプトは、テンプレートの main の時点では `.claude/settings.json` に登録していません。次のワークで参加者が登録します。各スクリプトの内容と登録の書き方は [README.md](../../README.md) の「Hook の雛形」にあります。

| スクリプト | 登録するワーク |
|---|---|
| `block-generated.sh` | 3 |
| `biome.sh` | 3 |
| `protect-tests.sh` | 5 |
| `require-release-approval.sh` | 7 |

## ワーク8: Maintain の手順

ワーク8では、まず `maintain.yml` を main にマージします。`workflow_dispatch` は、既定ブランチにあるワークフローしか起動できないためです。次に、3σ を超える値を追加した作業ブランチを push し、`gh workflow run maintain.yml --ref <ブランチ>` で手動起動します。現在のデータで 3σ を超える値は、`npx tsx scripts/detect-anomaly.ts --report` の平均と標準偏差から求められます（目安は 1.18 以上）。

## 追いつき用ブランチ

各ワークの完了状態を `stage-N-done` ブランチとして用意しています。遅れたときは、作業ブランチで次を実行して PR を出し、マージしてから次のワークに合流します（N はワーク番号）。

```bash
git fetch origin && git switch -c catch-up/stage-N origin/main
git checkout origin/stage-N-done -- .
git commit -m "chore: stage-N-done に追いつく"
git push -u origin catch-up/stage-N && gh pr create --fill && gh pr merge --merge
```

ワーク7で `ci` を必須チェックにしたあとは、CI が緑になってから `gh pr merge --merge` します。

テンプレートから作ったリポジトリでは、ブランチ間の履歴が必ずしもつながっていません。`git merge` で取り込まないのはそのためです。PR 経由にすると、ワーク7で branch protection を入れたあとも同じ手順で合流できます。

`git checkout <ブランチ> -- .` はファイルを追加・上書きするだけで、削除はしません。自分で作ったファイルが残る場合は、PR の差分を見て不要なものを消してください。

| ブランチ | 含まれるもの | 単体で `npm test` |
|---|---|---|
| `stage-1-done` | `docs/intents/borrowing-status.md` | 緑 |
| `stage-2-done` | `docs/specs/borrowing-status.md`、`.claude/settings.json`（marketplace 登録） | 緑 |
| `stage-3-done` | CLAUDE.md の整備、`block-generated.sh` / `biome.sh` の Hook 登録 | 緑 |
| `stage-4-done` | A1 の plan（`docs/plans/borrowing-status-a1-search.md`）→ A1 の実装（`GET /items` の絞り込み）→ A2 の plan（`docs/plans/borrowing-status-a2-my-loans.md`）→ A2 の実装（`GET /loans/me`）の順に積んだ状態 | 緑 |
| `stage-5-done` | `.github/workflows/ci.yml`、`protect-tests.sh` の Hook 登録、B1 / B2 の受入テスト | **赤**（受入テストが実装前のため意図どおり失敗。lint と typecheck は緑） |
| `stage-6-done` | `docs/plans/loan-extension-b1-logic.md` / `-b2-api.md`、機能 B の実装 | 緑 |
| `stage-7-done` | `REVIEW.md`、`.github/workflows/deploy.yml`、`require-release-approval.sh` の Hook 登録 | 緑 |
| `stage-8-done` | `.github/workflows/maintain.yml`、Maintain の診断例 `docs/intents/error-rate-spike.md` | 緑 |

実装 Issue は stage ブランチでは作られません。ワーク4の Issue は自分で起票し、ワーク5で起票する B1・B2 の Issue は `issues/` の本文を使います。

`stage-5-done` だけは、`git checkout origin/stage-5-done -- .` で丸ごと取り込まないでください。失敗する受入テストが main に入り、CI が赤になります。前半（CI と Hook）は main への PR に、後半（受入テスト）は feat ブランチに分けて取り込みます。

```bash
# 前半: CI とテスト保護 Hook を main に入れる（PR を出し、CI が緑になったら自分でマージ）
git fetch origin && git switch -c catch-up/stage-5 origin/main
git checkout origin/stage-5-done -- .github/workflows/ci.yml .claude/settings.json
git commit -m "chore: stage-5-done の CI と Hook に追いつく" && git push -u origin catch-up/stage-5
gh pr create --fill

# 後半: 前半のマージ後、受入テストをそれぞれの feat ブランチに置く（main には入れない。PR は出さない）
git fetch origin && git switch -c feat/b1-extend-domain origin/main
git checkout origin/stage-5-done -- src/loans/domain/extension.test.ts
git commit -m "test: B1 の受入テストを追加" && git push -u origin feat/b1-extend-domain
git switch -c feat/b2-extend-api origin/main
git checkout origin/stage-5-done -- src/loans/routes.extension.test.ts
git commit -m "test: B2 の受入テストを追加" && git push -u origin feat/b2-extend-api
git switch main && git pull     # ワーク6で2本を worktree に出すため、main に戻る
```

`stage-6-done` に追いつくときは、通常どおり `git checkout origin/stage-6-done -- .` で取り込めます（受入テストと実装の両方が入り、緑になります）。

## このディレクトリにあるもの

| ファイル | 内容 |
|---|---|
| [checklists.md](checklists.md) | 承認ゲートのセルフレビュー用チェックリスト |
| [requests.md](requests.md) | 講師用。ワーク1で起票する要望文 |
| [request-borrowing-status.md](request-borrowing-status.md) | `gh issue create --body-file` で使う要望の本文 |
| [issues/](issues/) | 機能 B の実装 Issue（B1・B2）の本文 |
