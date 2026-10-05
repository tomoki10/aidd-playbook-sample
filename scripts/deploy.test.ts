import { describe, expect, it } from "vitest";
import { formatRecord, isEnvironment } from "./deploy.ts";

describe("deploy", () => {
  it("staging と production だけを環境名として受け付ける", () => {
    expect(isEnvironment("staging")).toBe(true);
    expect(isEnvironment("production")).toBe(true);
    expect(isEnvironment("prod")).toBe(false);
    expect(isEnvironment(undefined)).toBe(false);
  });

  it("環境、コミット、実行者、日時を記録に含める", () => {
    const text = formatRecord({
      environment: "staging",
      commit: "abc1234",
      actor: "octocat",
      deployedAt: "2026-10-01T00:00:00.000Z",
    });
    expect(text).toContain("## 模擬デプロイ: staging");
    expect(text).toContain("| コミット | abc1234 |");
    expect(text).toContain("| 実行者 | octocat |");
  });
});
