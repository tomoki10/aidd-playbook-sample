/**
 * メトリクスの異常を決定論的に検知する。モデルは使わない。
 *
 * 使い方:
 *   npx tsx scripts/detect-anomaly.ts                     # maintain/tiers.yml の metric を判定
 *   npx tsx scripts/detect-anomaly.ts --metrics <path>    # 別のメトリクスファイルを判定
 *   npx tsx scripts/detect-anomaly.ts >> "$GITHUB_OUTPUT" # GitHub Actions で出力を渡す
 *   npx tsx scripts/detect-anomaly.ts --report > report.md # Issue 本文に使える Markdown を出す
 *
 * 既定では、標準出力に `key=value` の行だけを出す（tier, date, value, mean, stddev, z, action）。
 * --report を付けると、標準出力に判定結果の Markdown を出す。
 * どちらの場合も、人が読む説明は標準エラーに出し、GITHUB_STEP_SUMMARY があれば Job Summary にも書く。
 */
import { appendFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

export type MetricPoint = { date: string; value: number };

export type MetricFile = {
  metric: string;
  unit?: string;
  points: MetricPoint[];
};

export type TierRule = { sigma: number; action: string };

export type TierConfig = {
  metric: string;
  window_days: number;
  tiers: TierRule[];
};

export type Detection = {
  date: string;
  value: number;
  mean: number;
  stddev: number;
  z: number;
  /** 超えた σ の段階。どれも超えていなければ 0 */
  tier: number;
  action: string;
};

/**
 * 最新の点（当日）を、その直前 window_days 点の平均と標準偏差で判定する。
 * 当日の値を基準に含めると、急増した値そのものが平均と σ を押し上げるため除く。
 */
export function detect(points: readonly MetricPoint[], config: TierConfig): Detection {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const current = sorted.at(-1);
  if (!current) throw new Error("メトリクスが空です");
  const baseline = sorted.slice(0, -1).slice(-config.window_days);
  if (baseline.length < 2) throw new Error("基準にする過去のデータが2日分以上必要です");

  const values = baseline.map((p) => p.value);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  const stddev = Math.sqrt(variance);
  const diff = current.value - mean;
  const z =
    stddev === 0 ? (diff === 0 ? 0 : Math.sign(diff) * Number.POSITIVE_INFINITY) : diff / stddev;

  const exceeded = [...config.tiers]
    .sort((a, b) => a.sigma - b.sigma)
    .filter((rule) => z > rule.sigma)
    .at(-1);

  return {
    date: current.date,
    value: current.value,
    mean,
    stddev,
    z,
    tier: exceeded ? exceeded.sigma : 0,
    action: exceeded ? exceeded.action : "none",
  };
}

const round = (n: number) => (Number.isFinite(n) ? Number(n.toFixed(4)) : n);

export function toOutputLines(d: Detection): string {
  return [
    `tier=${d.tier}`,
    `action=${d.action}`,
    `date=${d.date}`,
    `value=${round(d.value)}`,
    `mean=${round(d.mean)}`,
    `stddev=${round(d.stddev)}`,
    `z=${round(d.z)}`,
  ].join("\n");
}

export function toSummaryMarkdown(d: Detection, metric: string): string {
  return [
    `## 異常検知: ${metric}`,
    "",
    "| 項目 | 値 |",
    "|---|---|",
    `| 判定日 | ${d.date} |`,
    `| 当日の値 | ${round(d.value)} |`,
    `| 基準の平均 | ${round(d.mean)} |`,
    `| 基準の標準偏差 | ${round(d.stddev)} |`,
    `| z | ${round(d.z)} |`,
    `| tier | ${d.tier}（${d.action}） |`,
    "",
  ].join("\n");
}

/**
 * Issue 本文に使える判定結果の Markdown。
 * 判定の数値、直近7日の値、次の対応（ローカルでの読み取り専用の診断）を含める。
 */
export function toReportMarkdown(
  d: Detection,
  metrics: MetricFile,
  config: TierConfig,
  recentDays = 7,
): string {
  const recent = [...metrics.points]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-recentDays)
    .map((p) => `| ${p.date} | ${p.value} |`);
  const unit = metrics.unit ? `（${metrics.unit}）` : "";
  return [
    `## 判定結果: ${metrics.metric}${unit}`,
    "",
    `\`scripts/detect-anomaly.ts\` が、当日の値を当日を除く直近${config.window_days}日の平均と標準偏差で判定しました。検知にモデルは使っていません。`,
    "",
    "| 項目 | 値 |",
    "|---|---|",
    `| 判定日 | ${d.date} |`,
    `| 当日の値 | ${round(d.value)} |`,
    `| 基準の平均 | ${round(d.mean)} |`,
    `| 基準の標準偏差 | ${round(d.stddev)} |`,
    `| z | ${round(d.z)} |`,
    `| tier | ${d.tier}（${d.action}） |`,
    "",
    `### 直近${recentDays}日の値`,
    "",
    "| 日付 | 値 |",
    "|---|---|",
    ...recent,
    "",
    "### 次の対応",
    "",
    "- 担当者がローカルの Claude Code に、この Issue と `metrics/error-rate.json` を読み取り専用で読ませて診断する",
    "- 診断は `docs/intents/` に intent.md 形式（問題／期待する結果／影響を受ける利用者とシステム／制約／未解決の問い）で書き、PR を出す",
    "- 誤検知だった場合は、`maintain/tiers.yml` の閾値を PR で見直す",
    "",
  ].join("\n");
}

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function main(): void {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const configPath = resolve(root, argValue("--config") ?? "maintain/tiers.yml");
  const config = parse(readFileSync(configPath, "utf8")) as TierConfig;
  const metricsPath = resolve(root, argValue("--metrics") ?? config.metric);
  const metrics = JSON.parse(readFileSync(metricsPath, "utf8")) as MetricFile;

  const detection = detect(metrics.points, config);
  if (process.argv.includes("--report")) {
    console.log(toReportMarkdown(detection, metrics, config));
  } else {
    console.log(toOutputLines(detection));
  }

  const summary = toSummaryMarkdown(detection, metrics.metric);
  console.error(summary);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
