#!/usr/bin/env bash
# PreToolUse（Edit|Write|MultiEdit）: コミット済みのテストファイルへの編集をブロックする。
# 新しく作るテストファイル（HEAD にまだないもの）は許可する。
# テストを変えてよいのは spec が変わったときだけ。そのときは人がこの Hook を外して編集する。
input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')
case "$file" in
  *.test.ts) ;;
  *) exit 0 ;;
esac
root="${CLAUDE_PROJECT_DIR:-$(printf '%s' "$input" | jq -r '.cwd // "."')}"
rel=${file#"$root"/}
if git -C "$root" cat-file -e "HEAD:$rel" 2>/dev/null; then
  echo "コミット済みのテスト ($rel) は編集できません。実装の側を直してください" >&2
  exit 2
fi
exit 0
