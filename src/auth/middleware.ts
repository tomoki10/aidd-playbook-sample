import { createMiddleware } from "hono/factory";
import { errorBody } from "../http/errors.ts";
import { findUserByToken, type User } from "./users.ts";

export type AuthEnv = {
  Variables: {
    user: User;
  };
};

/** Authorization ヘッダーから利用者を特定する。特定できなければ 401 を返す */
export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const header = c.req.header("Authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/.exec(header);
  const user = match?.[1] ? findUserByToken(match[1]) : undefined;
  if (!user) {
    return c.json(errorBody("UNAUTHORIZED", "認証が必要です"), 401);
  }
  c.set("user", user);
  await next();
});

/** 管理者以外を 403 で止める。requireAuth の後に置く */
export const requireAdmin = createMiddleware<AuthEnv>(async (c, next) => {
  if (c.get("user").role !== "admin") {
    return c.json(errorBody("FORBIDDEN", "この操作の権限がありません"), 403);
  }
  await next();
});
