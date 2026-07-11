"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    login,
    null,
  );

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form
        action={action}
        className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-900/40 p-6"
      >
        <h1 className="text-lg font-semibold text-neutral-50">
          letmepost · admin
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Enter the access key to continue.
        </p>

        <input
          name="key"
          type="password"
          autoFocus
          required
          autoComplete="off"
          placeholder="Access key"
          className="mt-4 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-600"
        />

        {state?.error && (
          <p className="mt-2 text-sm text-red-400">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-4 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
        >
          {pending ? "Checking…" : "Enter"}
        </button>
      </form>
    </div>
  );
}
