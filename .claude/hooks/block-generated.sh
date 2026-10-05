#!/usr/bin/env bash
# PreToolUse（Edit|Write|MultiEdit）: src/generated/ の生成物への編集をブロックする。
# 標準入力の JSON から編集対象のパスを読み、ブロックするときは exit 2 で理由を標準エラーに出す。
file=$(jq -r '.tool_input.file_path // empty')
case "$file" in
  */src/generated/* | src/generated/*)
    echo "src/generated/ は生成物です。openapi.yaml を直して npm run generate を実行してください" >&2
    exit 2
    ;;
esac
exit 0
