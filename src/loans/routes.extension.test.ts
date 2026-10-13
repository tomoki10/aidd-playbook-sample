import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth, createTestApp } from "../test-support/app.ts";
import { extendLoan } from "./domain/extension.ts";

// 実装 Issue B2（docs/workshop/issues/loan-extension-b2.md）の「受入テスト」の観点と期待値をテストにしたもの。
// テスト名の [R番号] は docs/specs/loan-extension.md の要件
// B1（ドメイン関数）の完成を待たずに API を確かめるため、extendLoan を差し替える。
// 延長の規則そのものは src/loans/domain/extension.test.ts で確かめる。
vi.mock("./domain/extension.ts", () => ({ extendLoan: vi.fn() }));

const mockedExtendLoan = vi.mocked(extendLoan);

function extend(loanId: string, userId?: string) {
  return {
    path: `/loans/${loanId}/extend`,
    init: { method: "POST", headers: userId ? auth(userId) : {} },
  };
}

describe("POST /loans/:id/extend", () => {
  beforeEach(() => {
    mockedExtendLoan.mockReset();
  });

  it("[R1] 保存されている貸出、ログイン中の利用者の ID、サーバーの今日の日付で extendLoan を呼ぶ", async () => {
    const { app, deps } = createTestApp();
    const stored = deps.loans.get("L-0002");
    mockedExtendLoan.mockReturnValue({ ok: false, reason: "limit_reached" });

    const { path, init } = extend("L-0002", "u-bob");
    await app.request(path, init);

    expect(mockedExtendLoan).toHaveBeenCalledWith(stored, "u-bob", "2026-10-01");
  });

  it("[R1] ok なら 200 で、返された貸出を保存して応答にし、監査ログに success を残す", async () => {
    const { app, deps } = createTestApp();
    const stored = deps.loans.get("L-0002");
    if (!stored) throw new Error("初期データがありません");
    const extended = { ...stored, dueDate: "2026-10-11", extensionCount: 1 };
    mockedExtendLoan.mockReturnValue({ ok: true, loan: extended });

    const { path, init } = extend("L-0002", "u-bob");
    const res = await app.request(path, init);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      loan: {
        id: "L-0002",
        itemId: "monitor-01",
        borrower: { id: "u-bob", name: "馬場 ボブ" },
        loanedAt: "2026-09-20",
        dueDate: "2026-10-11",
        returnedAt: null,
        extensionCount: 1,
      },
    });
    expect(deps.loans.get("L-0002")).toEqual(extended);
    expect(deps.audit.entries()).toContainEqual(
      expect.objectContaining({
        actorId: "u-bob",
        action: "loan.extend",
        targetId: "L-0002",
        result: "success",
      }),
    );
  });

  it.each([
    ["R1", "already_returned", "LOAN_ALREADY_RETURNED"],
    ["R2", "limit_reached", "EXTENSION_LIMIT_REACHED"],
    ["R3", "overdue", "LOAN_OVERDUE"],
  ] as const)(
    "[%s] %s なら 409 で code は %s、監査ログに failure を残す",
    async (_requirement, reason, code) => {
      const { app, deps } = createTestApp();
      mockedExtendLoan.mockReturnValue({ ok: false, reason });

      const { path, init } = extend("L-0002", "u-bob");
      const res = await app.request(path, init);

      expect(res.status).toBe(409);
      expect((await res.json()).error.code).toBe(code);
      expect(deps.audit.entries()).toContainEqual(
        expect.objectContaining({ actorId: "u-bob", action: "loan.extend", result: "failure" }),
      );
    },
  );

  it("[R4] not_borrower なら 404 で、貸出は変わらず、監査ログに denied を残す", async () => {
    const { app, deps } = createTestApp();
    const before = deps.loans.get("L-0002");
    mockedExtendLoan.mockReturnValue({ ok: false, reason: "not_borrower" });

    const { path, init } = extend("L-0002", "u-alice");
    const res = await app.request(path, init);

    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
    expect(deps.loans.get("L-0002")).toEqual(before);
    expect(deps.audit.entries()).toContainEqual(
      expect.objectContaining({ actorId: "u-alice", action: "loan.extend", result: "denied" }),
    );
  });

  it("[R4] 存在しない貸出は 404、認証なしは 401。どちらも extendLoan を呼ばない", async () => {
    const { app } = createTestApp();

    const missing = extend("L-9999", "u-bob");
    const noAuth = extend("L-0002");
    const resMissing = await app.request(missing.path, missing.init);
    const resNoAuth = await app.request(noAuth.path, noAuth.init);

    expect(resMissing.status).toBe(404);
    expect(resNoAuth.status).toBe(401);
    expect(mockedExtendLoan).not.toHaveBeenCalled();
  });

  it("応答に借り手の email と phone を含めない（spec の設計、secure-api）", async () => {
    const { app, deps } = createTestApp();
    const stored = deps.loans.get("L-0002");
    if (!stored) throw new Error("初期データがありません");
    mockedExtendLoan.mockReturnValue({ ok: true, loan: { ...stored, extensionCount: 1 } });

    const { path, init } = extend("L-0002", "u-bob");
    const text = await (await app.request(path, init)).text();

    expect(text).not.toContain("@example.com");
    expect(text).not.toContain("090-");
  });
});
