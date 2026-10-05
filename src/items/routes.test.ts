import { describe, expect, it } from "vitest";
import { createTestApp } from "../test-support/app.ts";

describe("GET /items", () => {
  it("認証なしで備品の一覧と貸出可否を返す", async () => {
    const { app } = createTestApp();

    const res = await app.request("/items");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(7);
    expect(body.items).toContainEqual({
      id: "monitor-02",
      name: "27インチモニター #2",
      category: "monitor",
      available: true,
    });
    // 返却済みの貸出しかない備品は借りられる
    expect(body.items).toContainEqual(
      expect.objectContaining({ id: "camera-01", available: true }),
    );
    expect(body.items).toContainEqual(expect.objectContaining({ id: "pc-01", available: false }));
  });

  it("借り手の情報を含めない", async () => {
    const { app } = createTestApp();

    const text = await (await app.request("/items")).text();

    expect(text).not.toContain("@example.com");
    expect(text).not.toContain("borrower");
  });
});
