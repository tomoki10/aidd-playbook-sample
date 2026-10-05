#!/usr/bin/env bash
# PostToolUse（Edit|Write|MultiEdit）: 編集したファイルに Biome をかける。
# 直せない指摘が残ったときは exit 2 で Claude に指摘を返し、直させる。
file=$(jq -r '.tool_input.file_path // empty')
case "$file" in
  *.ts | *.json) ;;
  *) exit 0 ;; # Biome の対象外のファイルは何もしない
esac
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
npx --no-install biome check --write "$file" >&2 || exit 2
