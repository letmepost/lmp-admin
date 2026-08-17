"use client";

import { useState } from "react";
import { requestImpersonation } from "./actions";

/**
 * Two-step by design: the operator has to name themselves and say why before a
 * token is minted, because the admin gate is a single shared key and the audit
 * row would otherwise be anonymous. The minted link is opened in a new tab so
 * the impersonated session lands on the dashboard origin, leaving this admin
 * tab signed in as the operator.
 */
export function ImpersonateButton({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const [open, setOpen] = useState(false);
  const [actor, setActor] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await requestImpersonation(userId, actor, reason);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setReason("");
    // Token is single-use and expires in ~2 minutes, so go straight there.
    window.open(result.consumeUrl, "_blank", "noopener,noreferrer");
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-amber-600/50 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300 hover:bg-amber-500/20"
      >
        Impersonate
      </button>
    );
  }

  const inputClass =
    "rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs text-neutral-200 outline-none focus:border-emerald-600";

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-amber-600/40 bg-amber-500/5 p-3"
    >
      <p className="mb-2 text-xs text-amber-200">
        Sign in as <strong>{email}</strong>. This is recorded, and the session
        expires in an hour.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={actor}
          onChange={(e) => setActor(e.target.value)}
          placeholder="Your name (required)"
          required
          className={`${inputClass} w-44`}
        />
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          className={`${inputClass} w-56`}
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-md border border-amber-600/50 bg-amber-500/15 px-2.5 py-1 text-xs text-amber-200 hover:bg-amber-500/25 disabled:opacity-50"
        >
          {busy ? "Minting…" : "Open session"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="text-xs text-neutral-500 hover:text-neutral-300"
        >
          Cancel
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </form>
  );
}
