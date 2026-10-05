import { describe, expect, it } from "vitest";
import { createTestApp } from "./test-support/app.ts";

describe("app", () => {
  it("存在しないパスは JSON の 404", async () => {
    const { app } = createTestApp();

    const res = await app.request("/no-such-path");

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: { code: "NOT_FOUND", message: "リソースが見つかりません" },
    });
  });

  it("想定外のエラーでも内部の情報を応答に含めない", async () => {
    const { app, deps } = createTestApp();
    deps.items.list = () => {
      throw new Error("secret connection string: postgres://user:pass@db");
    };
    const original = console.error;
    console.error = () => {};

    try {
      const res = await app.request("/items");
      const text = await res.text();
      expect(res.status).toBe(500);
      expect(text).not.toContain("postgres://");
      expect(JSON.parse(text).error.code).toBe("INTERNAL_ERROR");
    } finally {
      console.error = original;
    }
  });
});
