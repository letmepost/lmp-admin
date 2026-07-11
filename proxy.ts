import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, isValidCookie } from "@/lib/auth";

// Next 16 "proxy" convention (formerly middleware). Gates every route behind
// the admin cookie; only /login and the logout route are public.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/login" || pathname === "/api/logout") {
    return NextResponse.next();
  }

  const ok = await isValidCookie(req.cookies.get(AUTH_COOKIE)?.value);
  if (ok) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Everything except Next internals and static asset files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)",
  ],
};
