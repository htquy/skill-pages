import crypto from "crypto";

/**
 * RFC 7636 Proof Key for Code Exchange (PKCE) utilities
 */

export function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function hashSha256(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

export function computeS256CodeChallenge(codeVerifier: string): string {
  const hash = crypto.createHash("sha256").update(codeVerifier, "ascii").digest();
  return base64UrlEncode(hash);
}

export function verifyCodeChallenge(
  codeVerifier: string,
  codeChallenge: string,
  method: "S256" | "plain",
): boolean {
  if (method === "plain") {
    return codeVerifier === codeChallenge;
  }
  if (method === "S256") {
    const computed = computeS256CodeChallenge(codeVerifier);
    return computed === codeChallenge;
  }
  return false;
}

export function generateRandomToken(bytes: number = 32): string {
  return base64UrlEncode(crypto.randomBytes(bytes));
}

export function generateAuthorizationCode(): string {
  return `authcode_${base64UrlEncode(crypto.randomBytes(24))}`;
}
