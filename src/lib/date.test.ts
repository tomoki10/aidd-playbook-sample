import { describe, expect, it } from "vitest";
import { addDays, daysBetween, isISODate, toISODate } from "./date.ts";

describe("date", () => {
  it("YYYY-MM-DD 形式で実在する日付だけを受け付ける", () => {
    expect(isISODate("2026-10-01")).toBe(true);
    expect(isISODate("2026-02-30")).toBe(false);
    expect(isISODate("2026/10/01")).toBe(false);
  });

  it("月末をまたいで日数を加算できる", () => {
    expect(addDays("2026-09-28", 7)).toBe("2026-10-05");
  });

  it("2つの日付の差を日数で返す", () => {
    expect(daysBetween("2026-10-01", "2026-10-04")).toBe(3);
    expect(daysBetween("2026-10-04", "2026-10-01")).toBe(-3);
  });

  it("Date を UTC の日付文字列にする", () => {
    expect(toISODate(new Date("2026-10-01T23:00:00Z"))).toBe("2026-10-01");
  });
});
