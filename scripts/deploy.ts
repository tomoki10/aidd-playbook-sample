/**
 * 模擬デプロイ。実際にはどこにも配置せず、デプロイ記録を出力するだけ。
 *
 * 使い方:
 *   npx tsx scripts/deploy.ts staging
 *   npx tsx scripts/deploy.ts production
 *
 * GITHUB_STEP_SUMMARY があれば Job Summary に、なければ標準出力に記録を書く。
 */
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const ENVIRONMENTS = ["staging", "production"] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

export function isEnvironment(value: string | undefined): value is Environment {
  return ENVIRONMENTS.includes(value as Environment);
}

export type DeployRecord = {
  environment: Environment;
  commit: string;
  actor: string;
  deployedAt: string;
};

export function formatRecord(record: DeployRecord): string {
  return [
    `## 模擬デプロイ: ${record.environment}`,
    "",
    "| 項目 | 値 |",
    "|---|---|",
    `| 環境 | ${record.environment} |`,
    `| コミット | ${record.commit} |`,
    `| 実行者 | ${record.actor} |`,
    `| 日時 | ${record.deployedAt} |`,
    "",
    "（研修用の模擬デプロイです。実際の配置は行っていません）",
    "",
  ].join("\n");
}

function currentCommit(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function main(): void {
  const environment = process.argv[2];
  if (!isEnvironment(environment)) {
    console.error(`環境名を指定してください: ${ENVIRONMENTS.join(" | ")}`);
    process.exit(1);
  }

  const record = formatRecord({
    environment,
    commit: currentCommit(),
    actor: process.env.GITHUB_ACTOR ?? process.env.USER ?? "unknown",
    deployedAt: new Date().toISOString(),
  });

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, record);
    console.log(`${environment} への模擬デプロイを記録しました（Job Summary）`);
  } else {
    console.log(record);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
