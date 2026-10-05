/**
 * 日付は "YYYY-MM-DD" 形式の文字列（ISO 8601 の日付部分）で扱う。
 * タイムゾーンによるずれを避けるため、内部計算はすべて UTC で行う。
 */
export type ISODate = string;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isISODate(value: string): value is ISODate {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function toISODate(date: Date): ISODate {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: ISODate, days: number): ISODate {
  const base = new Date(`${date}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return toISODate(base);
}

/** to - from の日数。to が from より前なら負の値になる */
export function daysBetween(from: ISODate, to: ISODate): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}
