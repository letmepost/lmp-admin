// Auth for the admin gate. Dependency-free and edge-safe (used from both
// middleware on the edge runtime and server actions on Node). A single shared
// secret lives in DASHBOARD_AUTH_KEY; the cookie only ever holds its SHA-256,
// so the raw key never sits in a cookie or the client bundle.

export const AUTH_COOKIE = "lmp_admin";

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function tokenForKey(key: string): Promise<string> {
  return sha256Hex(key);
}

// Validate the cookie value (a hash) against the configured key's hash.
export async function isValidCookie(value: string | undefined): Promise<boolean> {
  const envKey = process.env.DASHBOARD_AUTH_KEY;
  if (!value || !envKey) return false;
  return timingSafeEqual(value, await sha256Hex(envKey));
}

// Validate a raw key submitted at /login (compare hashes, constant-time).
export async function isValidKey(key: string): Promise<boolean> {
  const envKey = process.env.DASHBOARD_AUTH_KEY;
  if (!key || !envKey) return false;
  return timingSafeEqual(await sha256Hex(key), await sha256Hex(envKey));
}
