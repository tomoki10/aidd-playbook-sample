import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generateTypes, OPENAPI_PATH, OUTPUT_PATH } from "./generate-types.ts";

describe("generate-types", () => {
  it("src/generated/types.ts が openapi.yaml と一致している（ずれていたら npm run generate）", () => {
    const expected = generateTypes(readFileSync(OPENAPI_PATH, "utf8"));
    expect(readFileSync(OUTPUT_PATH, "utf8")).toBe(expected);
  });

  it("nullable と enum と配列を型にする", () => {
    const yaml = `
components:
  schemas:
    Sample:
      type: object
      required: [kind, tags]
      properties:
        kind: { type: string, enum: [a, b] }
        tags: { type: array, items: { type: string } }
        note: { type: string, nullable: true }
`;
    expect(generateTypes(yaml)).toContain(
      'export type Sample = {\n  kind: "a" | "b";\n  tags: string[];\n  note?: string | null;\n};',
    );
  });
});
