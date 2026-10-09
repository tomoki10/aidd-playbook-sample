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

// 受入テスト: docs/specs/borrowing-status.md の R1〜R3（A1: 備品の絞り込み）
describe("GET /items の絞り込み", () => {
  async function ids(query: string): Promise<string[]> {
    const { app } = createTestApp();
    const res = await app.request(`/items${query}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    return body.items.map((item: { id: string }) => item.id);
  }

  it("[R1] category を指定すると、その種類の備品だけを返す", async () => {
    expect(await ids("?category=camera")).toEqual(["camera-01", "camera-02"]);
  });

  it("[R2] available=true なら、返却されていない貸出がない備品だけを返す", async () => {
    // pc-01 は返却期限を過ぎているが返却されていないので、借りられない
    expect(await ids("?available=true")).toEqual(["monitor-02", "camera-01"]);
  });

  it("[R2] available=false なら、貸出中の備品だけを返す", async () => {
    expect(await ids("?available=false")).toEqual([
      "pc-01",
      "pc-02",
      "monitor-01",
      "camera-02",
      "projector-01",
    ]);
  });

  it("[R1][R2] category と available を組み合わせられる", async () => {
    const { app } = createTestApp();

    const res = await app.request("/items?category=camera&available=true");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      items: [
        { id: "camera-01", name: "Web 会議用カメラ #1", category: "camera", available: true },
      ],
    });
  });

  it("[R1] 当てはまる備品がなければ空の一覧を返す", async () => {
    expect(await ids("?category=other")).toEqual([]);
  });

  it("[R1] 未知の category は 400（INVALID_REQUEST）", async () => {
    const { app } = createTestApp();

    const res = await app.request("/items?category=tablet");

    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_REQUEST");
  });

  it("[R2] available が true / false 以外なら 400（INVALID_REQUEST）", async () => {
    const { app } = createTestApp();

    const res = await app.request("/items?available=yes");

    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_REQUEST");
  });

  it("[R3] 絞り込んだ一覧にも借り手の情報を含めない", async () => {
    const { app } = createTestApp();

    const text = await (await app.request("/items?available=false")).text();

    expect(text).not.toContain("@example.com");
    expect(text).not.toContain("borrower");
    expect(text).not.toContain("u-alice");
  });
});
