"use client";

import { useState } from "react";

/** The footer's waitlist: one email field, sent to the app's subscriber list. */
export function WaitlistForm({ size = "lg", className = "" }: { size?: "lg" | "sm"; className?: string }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const id = size === "lg" ? "waitlist-email" : "waitlist-email-m";
  const lg = size === "lg";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = (new FormData(form).get("email") as string) || "";
    setState("sending");
    try {
      const res = await fetch("/api/waitlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (json.ok) {
        setState("done");
        setMessage("You are on the list. Welcome to the beta.");
        form.reset();
      } else {
        setState("error");
        setMessage(json.message ?? "Something went wrong. Please try again.");
      }
    } catch {
      setState("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  return (
    <form onSubmit={submit} className={`flex flex-col gap-2 ${className}`} aria-describedby={`${id}-note`}>
      <div className="flex w-full items-center gap-4">
        <label htmlFor={id} className="sr-only">
          Your email
        </label>
        <input
          id={id}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Write your email here"
          disabled={state === "sending" || state === "done"}
          className={`stroke-10 min-w-0 flex-1 rounded-[40px] bg-transparent text-white outline-none placeholder:text-white/60 focus:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4)] disabled:opacity-70 ${
            lg ? "h-12 px-4 py-2 text-[16px] leading-[1.4] tracking-[-0.16px]" : "h-10 px-[14px] py-2 text-[14px] leading-[1.4]"
          }`}
        />
        <button
          type="submit"
          disabled={state === "sending" || state === "done"}
          className={`display flex shrink-0 items-center rounded-[57.6px] bg-white px-2 py-1 text-ink transition-[scale] duration-200 ease-soft active:scale-[0.97] disabled:opacity-80 ${
            lg ? "h-12 text-[16px] leading-[1.4]" : "h-10 text-[14px] leading-[1.4]"
          }`}
        >
          <span className="flex items-center justify-center px-2">{state === "sending" ? "Joining" : state === "done" ? "Joined" : "Join waitlist"}</span>
        </button>
      </div>
      <p id={`${id}-note`} role="status" aria-live="polite" className={`min-h-[1.4em] text-[14px] leading-[1.4] ${state === "error" ? "text-[#fdaf5b]" : "text-white/70"}`}>
        {message}
      </p>
    </form>
  );
}
