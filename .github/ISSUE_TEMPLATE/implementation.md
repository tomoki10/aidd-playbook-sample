---
name: 実装タスク
about: マージ済みの spec.md から切り出した、エージェントに渡す実装 Issue
title: "[実装] "
labels: ready-for-agent
---

<!--
spec.md がマージされ、並行に着手できる粒度に分けたものだけを起票します。
着手したら Plan モードで docs/plans/<機能名>-<タスクID>.md を作ってコミットし、承認してから実装に入ります。
-->

## spec

docs/specs/<機能名>.md

## タスク ID

A1 / A2 / B1 / B2

## 範囲

- 触る: （例）src/loans/domain/overdue.ts、src/loans/domain/overdue.test.ts
- 触らない: （例）src/loans/routes.ts（別タスク）

## インタフェース

spec で決めたシグネチャや API の入出力を貼る。並行するタスクとの約束になるので、実装中に変えない。

## 受入条件

spec の受入条件のうち、このタスクで満たすもの。

## 完了の確かめ方

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
