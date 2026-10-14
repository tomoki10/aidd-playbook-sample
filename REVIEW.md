# REVIEW.md

PR のレビュー方針です。人のレビューと、ローカルの Claude Code による AI レビューの両方がこの方針に従います。AI レビューは機能面とセキュリティ面を別々のサブエージェント（またはセッション）で実行し、結果を `gh pr comment` で PR に残します。

## レビューのパス

1回のレビューで全部を見ず、次のパスに分けます。

| パス | 見ること | 実行するセッション |
|---|---|---|
| バグ | 境界値（期限当日、延長回数の上限）、null の扱い、日付の計算、エラー時の状態の変化 | 機能面 |
| spec / plan との整合 | spec の要件（R 番号）ごとのテスト、Issue の範囲・境目の関数・応答・受入テスト、plan の Approach。テストが Issue の受入テストの観点と期待値を満たしているか（観点の漏れ、期待値の食い違い、テスト名の R 番号）。差分が Issue の範囲（触る・触らない）に収まり、境目の関数のシグネチャと応答（ステータス、code）が Issue のとおりか | 機能面 |
| セキュリティ | secure-api の5観点（認証・認可、入力検証、個人情報の最小化、監査ログ、エラー応答） | セキュリティ面 |

## 指摘の重み

- **MUST**: マージ前に直す。バグ、spec の要件やセキュリティの観点を満たさない、テストがない、テストが Issue の受入テストの観点と期待値を満たさない
- **NIT**: 直さなくてもマージしてよい。命名、コメント、好みの書き方

指摘には必ず MUST か NIT を付けます。NIT だけなら、レビュアーは approve してかまいません。

## 除外するパス

次のファイルはレビューの対象にしません。

- `src/generated/`（`openapi.yaml` から生成。`openapi.yaml` の差分を見る）
- `package-lock.json`
- `metrics/`（擬似データ）

## AI レビューの実行例

対話中の Claude Code から頼む場合は、サブエージェントに分けさせます。

```text
サブエージェントを2つ使い、PR #12 を機能面とセキュリティ面で別々にレビューして。
それぞれの結果を、見出しを付けて gh pr comment で PR に残して。コードは変更しないこと。
```

発展として、main を pull したチェックアウトで別々に実行する方法もあります（先に `git fetch origin`）。PR の差分は `gh pr diff`、まだ main にない plan は `git show origin/<ブランチ>:docs/plans/...`、Issue は `gh issue view` で読ませます。

```bash
# 機能面（バグ、spec / plan との整合）
claude -p "REVIEW.md の『バグ』と『spec / plan との整合』のパスで PR #12 をレビューして。差分は gh pr diff 12、
plan は git show origin/worktree-b1-logic:docs/plans/loan-extension-b1-logic.md、Issue は PR 本文の Closes の番号を
gh issue view で読むこと。docs/specs/loan-extension.md の要件、Issue の範囲・境目の関数・応答・受入テストの観点と期待値、plan の Approach に照らすこと。
指摘は MUST と NIT に分け、根拠の行を付けて Markdown で出力して。コードは変更しないこと" \
  --allowedTools "Read,Grep,Glob,Bash(gh pr diff:*),Bash(gh pr view:*),Bash(gh issue view:*),Bash(git show:*)" > /tmp/review-func-12.md

# セキュリティ面（別のセッションで実行する）
claude -p "REVIEW.md の『セキュリティ』のパスで、secure-api の観点から PR #12 をレビューして。指摘は MUST と NIT に分けること。コードは変更しないこと" \
  --allowedTools "Read,Grep,Glob,Skill,Bash(gh pr diff:*),Bash(gh pr view:*),Bash(gh issue view:*),Bash(git show:*)" > /tmp/review-sec-12.md

gh pr comment 12 --body-file /tmp/review-func-12.md
gh pr comment 12 --body-file /tmp/review-sec-12.md
```

## 承認

- エージェントは自分の書いたコードを承認できません。マージは PR を通し、`ci` が緑になってから行います
- 研修の private リポジトリでは branch protection が使えないため、`ci` が緑かどうかは `gh pr checks` で自分で確かめます。実際のチームでは branch protection で PR と `ci` を必須にし、approve を1以上必須にします（講師のデモで見ます）
- マージは merge commit で行います（squash しない）。`plan.md` が実装より前にコミットされ、テストが実装と同じ PR に入った記録を残すためです
