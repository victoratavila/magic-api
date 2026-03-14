import crypto from "crypto";

export function generateResetToken() {
  const token = crypto.randomBytes(32).toString("hex");

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hora

  return { token, tokenHash, expiresAt };
}
