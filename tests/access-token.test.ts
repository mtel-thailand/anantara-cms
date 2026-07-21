import assert from "node:assert/strict";
import test from "node:test";
import { generateAccessToken } from "../src/lib/access-token";

test("generates a 64-character lowercase hexadecimal access token", () => {
  const token = generateAccessToken();

  assert.match(token, /^[0-9a-f]{64}$/);
});
