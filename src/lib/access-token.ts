import { randomBytes } from "node:crypto";

export function generateAccessToken() {
  return randomBytes(32).toString("hex");
}
