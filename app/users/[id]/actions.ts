"use server";

import { cookies } from "next/headers";
import { AUTH_COOKIE, isValidCookie } from "@/lib/auth";

export type ImpersonateResult =
  | { ok: true; consumeUrl: string; email: string }
  | { ok: false; error: string };

/**
 * Ask the letmepost API for a single-use impersonation token.
 *
 * The shared secret lives only here, server-side — the browser receives just
 * the short-lived consume URL. `actor` is recorded on the audit row; it is
 * required because the admin gate is one shared key and cannot itself say who
 * is behind a request.
 */
export async function requestImpersonation(
  userId: string,
  actor: string,
  reason: string,
): Promise<ImpersonateResult> {
  // Server actions are independently addressable POST endpoints, so re-check
  // the admin cookie here rather than relying on the proxy having run.
  const jar = await cookies();
  if (!(await isValidCookie(jar.get(AUTH_COOKIE)?.value))) {
    return { ok: false, error: "Not authenticated." };
  }

  const authUrl = process.env.LETMEPOST_AUTH_URL;
  const secret = process.env.ADMIN_IMPERSONATION_SECRET;
  if (!authUrl || !secret) {
    return {
      ok: false,
      error:
        "Impersonation is not configured. Set LETMEPOST_AUTH_URL and ADMIN_IMPERSONATION_SECRET.",
    };
  }
  const label = actor.trim();
  if (!label) {
    return { ok: false, error: "Enter your name — it goes on the audit record." };
  }

  let res: Response;
  try {
    res = await fetch(
      `${authUrl.replace(/\/$/, "")}/api/auth/admin/impersonation/mint`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-secret": secret,
        },
        body: JSON.stringify({
          userId,
          actor: label,
          reason: reason.trim() || undefined,
        }),
        cache: "no-store",
      },
    );
  } catch (err) {
    return {
      ok: false,
      error: `Could not reach the API: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let message = `API returned ${res.status}`;
    try {
      const parsed = JSON.parse(body) as { message?: string };
      if (parsed.message) message = parsed.message;
    } catch {
      if (body) message = body.slice(0, 200);
    }
    return { ok: false, error: message };
  }

  const data = (await res.json()) as {
    consumeUrl?: string;
    target?: { email?: string };
  };
  if (!data.consumeUrl) {
    return { ok: false, error: "API did not return a consume URL." };
  }
  return {
    ok: true,
    consumeUrl: data.consumeUrl,
    email: data.target?.email ?? "",
  };
}
