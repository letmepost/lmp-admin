import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Active = "dashboard" | "orgs" | "users";

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "text-sm",
        active ? "text-neutral-100" : "text-neutral-500 hover:text-neutral-300",
      )}
    >
      {label}
    </Link>
  );
}

export function AppHeader({
  active,
  children,
}: {
  active?: Active;
  children?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800/70 pb-4">
      <div className="flex items-center gap-5">
        <Link href="/" className="text-sm font-semibold text-neutral-50">
          letmepost <span className="text-neutral-600">· admin</span>
        </Link>
        <nav className="flex items-center gap-4">
          <NavLink href="/" label="Dashboard" active={active === "dashboard"} />
          <NavLink href="/orgs" label="Orgs" active={active === "orgs"} />
          <NavLink href="/users" label="Users" active={active === "users"} />
        </nav>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {children}
        <a
          href="/api/logout"
          className="text-xs text-neutral-500 underline-offset-2 hover:text-neutral-300 hover:underline"
        >
          Sign out
        </a>
      </div>
    </header>
  );
}
