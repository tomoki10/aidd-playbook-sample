#!/usr/bin/env bash
# PreToolUse（Bash）: 本番への模擬デプロイを、リリース承認がなければブロックする。
# RELEASE_APPROVAL は Hook のプロセスの環境変数。承認者がセッション起動時に渡す
#   例: RELEASE_APPROVAL=sato claude
# Claude がコマンドの先頭に書いても Hook の環境には入らない。
# 文字列一致の判定なので、別名やラッパー経由では通り抜ける。正規ルートは Environments の承認で、
# この Hook は手元から直接叩く経路を塞ぐ二重目の防御。
cmd=$(jq -r '.tool_input.command // empty')
if printf '%s' "$cmd" | grep -Eq 'deploy\.ts[^|;&]*production'; then
  if [ -z "$RELEASE_APPROVAL" ]; then
    echo "本番デプロイにはリリース担当の承認が必要です（RELEASE_APPROVAL が未設定）" >&2
    exit 2
  fi
fi
exit 0
