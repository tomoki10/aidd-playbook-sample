import { describe, expect, it } from "vitest";
import { auth, createTestApp } from "../test-support/app.ts";

function postJson(body: unknown, userId?: string): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(userId ? auth(userId) : {}) },
    body: JSON.stringify(body),
  };
}

describe("POST /loans", () => {
  it("ログイン中の利用者を借り手として貸出を作る", async () => {
    const { app, deps } = createTestApp();

    const res = await app.request("/loans", postJson({ itemId: "monitor-02" }, "u-alice"));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.loan).toMatchObject({
      itemId: "monitor-02",
      borrower: { id: "u-alice", name: "青木 アリス" },
      loanedAt: "2026-10-01",
      dueDate: "2026-10-15",
      returnedAt: null,
      extensionCount: 0,
    });
    expect(deps.loans.get(body.loan.id)?.borrower.email).toBe("alice@example.com");
    expect(deps.audit.entries()).toContainEqual(
      expect.objectContaining({ actorId: "u-alice", action: "loan.create", result: "success" }),
    );
  });

  it("応答に借り手の email と phone を含めない", async () => {
    const { app } = createTestApp();

    const res = await app.request("/loans", postJson({ itemId: "monitor-02" }, "u-alice"));

    const body = await res.json();
    expect(body.loan.borrower).toEqual({ id: "u-alice", name: "青木 アリス" });
  });

  it("認証がなければ 401", async () => {
    const { app } = createTestApp();

    const res = await app.request("/loans", postJson({ itemId: "monitor-02" }));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: { code: "UNAUTHORIZED", message: "認証が必要です" },
    });
  });

  it("知らないトークンは 401", async () => {
    const { app } = createTestApp();

    const res = await app.request("/loans", postJson({ itemId: "monitor-02" }, "u-unknown"));

    expect(res.status).toBe(401);
  });

  it("itemId がなければ 400", async () => {
    const { app } = createTestApp();

    const res = await app.request("/loans", postJson({}, "u-alice"));

    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_REQUEST");
  });

  it("JSON でない本文は 400", async () => {
    const { app } = createTestApp();

    const res = await app.request("/loans", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth("u-alice") },
      body: "{not json",
    });

    expect(res.status).toBe(400);
  });

  it("存在しない備品は 404", async () => {
    const { app } = createTestApp();

    const res = await app.request("/loans", postJson({ itemId: "no-such-item" }, "u-alice"));

    expect(res.status).toBe(404);
  });

  it("貸出中の備品は 409", async () => {
    const { app } = createTestApp();

    const res = await app.request("/loans", postJson({ itemId: "pc-01" }, "u-bob"));

    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("ITEM_ON_LOAN");
  });
});

describe("POST /loans/:id/return", () => {
  it("借り手本人が返却できる", async () => {
    const { app, deps } = createTestApp();

    const res = await app.request("/loans/L-0002/return", {
      method: "POST",
      headers: auth("u-bob"),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.loan).toMatchObject({ id: "L-0002", returnedAt: "2026-10-01" });
    expect(body.loan.borrower).toEqual({ id: "u-bob", name: "馬場 ボブ" });
    expect(deps.audit.entries()).toContainEqual(
      expect.objectContaining({ actorId: "u-bob", action: "loan.return", targetId: "L-0002" }),
    );
  });

  it("管理者は代理で返却できる", async () => {
    const { app } = createTestApp();

    const res = await app.request("/loans/L-0002/return", {
      method: "POST",
      headers: auth("u-admin"),
    });

    expect(res.status).toBe(200);
  });

  it("本人以外の利用者には存在しない場合と同じ 404 を返し、監査ログに denied を残す", async () => {
    const { app, deps } = createTestApp();

    const res = await app.request("/loans/L-0002/return", {
      method: "POST",
      headers: auth("u-alice"),
    });

    expect(res.status).toBe(404);
    expect(deps.loans.get("L-0002")?.returnedAt).toBeNull();
    expect(deps.audit.entries()).toContainEqual(
      expect.objectContaining({ actorId: "u-alice", action: "loan.return", result: "denied" }),
    );
  });

  it("存在しない貸出は 404", async () => {
    const { app } = createTestApp();

    const res = await app.request("/loans/L-9999/return", {
      method: "POST",
      headers: auth("u-bob"),
    });

    expect(res.status).toBe(404);
  });

  it("返却済みなら 409", async () => {
    const { app } = createTestApp();

    const res = await app.request("/loans/L-0003/return", {
      method: "POST",
      headers: auth("u-carol"),
    });

    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("LOAN_ALREADY_RETURNED");
  });

  it("認証がなければ 401", async () => {
    const { app } = createTestApp();

    const res = await app.request("/loans/L-0002/return", { method: "POST" });

    expect(res.status).toBe(401);
  });
});
