---
name: 実装タスク
about: spec.md から切り出した、エージェントに渡す実装 Issue
title: "[実装] "
labels: ready-for-agent
---

<!--
spec.md がマージされたあと、Build の最初に起票します。並行に実装するときは、作業単位ごとに1つずつ起票し、範囲が重ならないように分けます。
API を足したり変えたりするときは、応答とエラーコード（ステータスと code）の一覧を本文に足します。
互いの関数を呼ぶ作業でマージの順番を決める必要があるときは、範囲か本文に書きます。
着手したら Plan モードで docs/plans/<機能名>-<タスク ID>-<内容>.md を Approach／Risks／Verification の3つの見出しで作ってコミットし、承認してから実装に入ります。
-->

## spec

docs/specs/<機能名>.md（この Issue で満たす要件の R 番号）

## タスク ID

A1 / A2 / B1 / B2

## 範囲

- 触る: （例）src/items/routes.ts、src/items/routes.test.ts
- 触らない: （例）src/loans/（別の Issue の範囲）
- 共有する: （例）openapi.yaml と src/generated/（npm run generate で再生成する）

## 境目の関数

互いの関数を呼ぶ場合だけ書きます。呼ばれる関数のシグネチャと戻り値の型を貼り、呼ぶ側と呼ばれる側の約束として実装中は変えません。呼ばない場合は「なし」と書きます。

## 受入テスト

spec の要件（R 番号）に対応づけて、この Issue で確かめる観点を書きます。

## 完了の確かめ方

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
