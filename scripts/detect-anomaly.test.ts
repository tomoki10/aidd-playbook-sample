import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import {
  detect,
  type MetricFile,
  type MetricPoint,
  type TierConfig,
  toReportMarkdown,
} from "./detect-anomaly.ts";

const config: TierConfig = {
  metric: "metrics/error-rate.json",
  window_days: 28,
  tiers: [
    { sigma: 1, action: "record" },
    { sigma: 2, action: "diagnose" },
    { sigma: 3, action: "propose" },
  ],
};

/** 平均 1.0、標準偏差 0.1 になる28日分（0.9 と 1.1 を交互）と、当日の値 */
function series(today: number): MetricPoint[] {
  const points: MetricPoint[] = [];
  for (let i = 0; i < 28; i++) {
    const day = String(i + 1).padStart(2, "0");
    points.push({ date: `2026-09-${day}`, value: i % 2 === 0 ? 0.9 : 1.1 });
  }
  points.push({ date: "2026-09-29", value: today });
  return points;
}

describe("detect", () => {
  it.each([
    [1.05, 0, "none"],
    [1.15, 1, "record"],
    [1.25, 2, "diagnose"],
    [1.35, 3, "propose"],
  ])("当日の値 %s は tier %s（%s）", (value, tier, action) => {
    const result = detect(series(value), config);
    expect(result.tier).toBe(tier);
    expect(result.action).toBe(action);
  });

  it("基準に当日の値を含めない", () => {
    const result = detect(series(5), config);
    expect(result.mean).toBeCloseTo(1.0);
    expect(result.stddev).toBeCloseTo(0.1);
    expect(result.z).toBeCloseTo(40);
  });

  it("直近 window_days 日だけを基準にする", () => {
    const old = Array.from({ length: 10 }, (_, i) => ({
      date: `2026-08-${String(i + 1).padStart(2, "0")}`,
      value: 100,
    }));
    const result = detect([...old, ...series(1.0)], config);
    expect(result.mean).toBeCloseTo(1.0);
  });

  it("日付順に並んでいなくても最新の日を当日として扱う", () => {
    const points = series(1.35).reverse();
    expect(detect(points, config).date).toBe("2026-09-29");
  });

  it("--report 用の Markdown に判定の数値と直近7日の値を含める", () => {
    const points = series(1.35);
    const report = toReportMarkdown(
      detect(points, config),
      { metric: "error_rate", points },
      config,
    );
    expect(report).toContain("## 判定結果: error_rate");
    expect(report).toContain("| tier | 3（propose） |");
    expect(report).toContain("| 2026-09-29 | 1.35 |");
    expect(report).toContain("| 2026-09-23 | 0.9 |");
    expect(report).not.toContain("| 2026-09-22 |");
  });

  it("リポジトリのメトリクスは平常（tier 0）", () => {
    const metrics = JSON.parse(readFileSync("metrics/error-rate.json", "utf8")) as MetricFile;
    const tiers = parse(readFileSync("maintain/tiers.yml", "utf8")) as TierConfig;
    expect(detect(metrics.points, tiers).tier).toBe(0);
  });
});
