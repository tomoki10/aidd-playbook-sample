import { createApp, createDeps, type Deps } from "../app.ts";
import { BASE_DATE, SAMPLE_ITEMS, sampleLoans } from "../data/sample-data.ts";

/** テスト用のアプリ。今日は 2026-10-01 に固定し、初期データを入れる */
export function createTestApp(today: string = BASE_DATE) {
  const deps: Deps = createDeps({
    items: SAMPLE_ITEMS,
    loans: sampleLoans(BASE_DATE),
    now: () => new Date(`${today}T09:00:00Z`),
  });
  return { app: createApp(deps), deps };
}

export function auth(userId: string): Record<string, string> {
  return { Authorization: `Bearer ${userId}` };
}
