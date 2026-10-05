/**
 * openapi.yaml の components.schemas から src/generated/types.ts を生成する。
 * 使い方: npm run generate
 *
 * 研修用の最小実装で、object / array / string(enum) / integer / number / boolean / $ref /
 * nullable だけを扱う。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

type Schema = {
  $ref?: string;
  type?: "object" | "array" | "string" | "integer" | "number" | "boolean";
  enum?: string[];
  nullable?: boolean;
  required?: string[];
  properties?: Record<string, Schema>;
  items?: Schema;
  description?: string;
};

const HEADER = `// このファイルは openapi.yaml から \`npm run generate\` で生成しています。
// 直接編集しないでください。型を変えるときは openapi.yaml を直して再生成します。
`;

function indent(level: number): string {
  return "  ".repeat(level);
}

function toType(schema: Schema, level: number): string {
  let base: string;
  if (schema.$ref) {
    base = schema.$ref.replace("#/components/schemas/", "");
  } else if (schema.type === "object") {
    const required = new Set(schema.required ?? []);
    const lines = Object.entries(schema.properties ?? {}).map(([key, prop]) => {
      const optional = required.has(key) ? "" : "?";
      return `${indent(level + 1)}${key}${optional}: ${toType(prop, level + 1)};`;
    });
    base = `{\n${lines.join("\n")}\n${indent(level)}}`;
  } else if (schema.type === "array") {
    const inner = toType(schema.items ?? {}, level);
    base = inner.includes(" ") ? `(${inner})[]` : `${inner}[]`;
  } else if (schema.type === "string") {
    base = schema.enum ? schema.enum.map((v) => JSON.stringify(v)).join(" | ") : "string";
  } else if (schema.type === "integer" || schema.type === "number") {
    base = "number";
  } else if (schema.type === "boolean") {
    base = "boolean";
  } else {
    base = "unknown";
  }
  return schema.nullable ? `${base} | null` : base;
}

export function generateTypes(openapiYaml: string): string {
  const doc = parse(openapiYaml) as { components?: { schemas?: Record<string, Schema> } };
  const schemas = doc.components?.schemas ?? {};
  const blocks = Object.entries(schemas).map(([name, schema]) => {
    const comment = schema.description ? `/** ${schema.description} */\n` : "";
    return `${comment}export type ${name} = ${toType(schema, 0)};\n`;
  });
  return `${HEADER}\n${blocks.join("\n")}`;
}

export const OPENAPI_PATH = fileURLToPath(new URL("../openapi.yaml", import.meta.url));
export const OUTPUT_PATH = fileURLToPath(new URL("../src/generated/types.ts", import.meta.url));

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(OUTPUT_PATH, generateTypes(readFileSync(OPENAPI_PATH, "utf8")));
  console.log(`generated: ${OUTPUT_PATH}`);
}
