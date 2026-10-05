import type { ErrorResponse } from "../generated/types.ts";

/**
 * API のエラー応答の形をそろえる。
 * message には利用者に見せてよい文言だけを入れ、スタックトレースや内部の値は入れない。
 */
export function errorBody(code: string, message: string): ErrorResponse {
  return { error: { code, message } };
}
