"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, isValidKey, tokenForKey } from "@/lib/auth";

export type LoginState = { error: string } | null;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const key = String(formData.get("key") ?? "");

  if (!process.env.DASHBOARD_AUTH_KEY) {
    return { error: "DASHBOARD_AUTH_KEY is not configured on the server." };
  }
  if (!(await isValidKey(key))) {
    return { error: "Invalid key." };
  }

  const jar = await cookies();
  jar.set(AUTH_COOKIE, await tokenForKey(key), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/");
}
