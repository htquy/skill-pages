import { test } from "node:test";
import assert from "node:assert/strict";
import { createApiUserResolver } from "../src/application/identity/api-user";

const shared = {
  id: "central-user",
  name: "Shared user",
  email: "shared@example.com",
  image: null,
  role: "CUSTOMER" as const,
  status: "ACTIVE" as const,
  scopes: ["openid", "orders:read", "orders:write"],
};
test("SSO tokens on multiple sites resolve to the same central identity without local password accounts", async () => {
  let sessions = 0;
  const resolve = createApiUserResolver({
    tokenUser: async () => shared,
    sessionUser: async () => {
      sessions++;
      return { ...shared, lastLoginAt: null };
    },
  });
  const a = await resolve("Bearer site-one-token", "orders:write");
  const b = await resolve("Bearer site-two-token", "orders:read");
  assert.equal(a.id, b.id);
  assert.equal(a.id, "central-user");
  assert.equal(sessions, 0);
});
test("invalid bearer never falls back to an unrelated browser session", async () => {
  let sessions = 0;
  const resolve = createApiUserResolver({
    tokenUser: async () => {
      throw new Error("expired");
    },
    sessionUser: async () => {
      sessions++;
      return { ...shared, lastLoginAt: null };
    },
  });
  await assert.rejects(resolve("Bearer expired", "orders:write"), {
    status: 401,
  });
  await assert.rejects(resolve("Basic wrong", "orders:read"), { status: 401 });
  assert.equal(sessions, 0);
});
test("payment APIs reject tokens without order scope and blocked accounts", async () => {
  const noScope = createApiUserResolver({
    tokenUser: async () => ({ ...shared, scopes: ["openid"] }),
    sessionUser: async () => ({ ...shared, lastLoginAt: null }),
  });
  await assert.rejects(noScope("Bearer profile-only", "orders:write"), {
    status: 403,
  });
  const blocked = createApiUserResolver({
    tokenUser: async () => ({ ...shared, status: "BLOCKED" }),
    sessionUser: async () => ({ ...shared, lastLoginAt: null }),
  });
  await assert.rejects(blocked("Bearer blocked", "orders:read"), {
    status: 403,
  });
});
test("existing hub web checkout still uses its original central session mechanism", async () => {
  const resolve = createApiUserResolver({
    tokenUser: async () => {
      throw new Error("must not call");
    },
    sessionUser: async () => ({ ...shared, lastLoginAt: null }),
  });
  assert.equal((await resolve(null, "orders:write")).id, shared.id);
});
