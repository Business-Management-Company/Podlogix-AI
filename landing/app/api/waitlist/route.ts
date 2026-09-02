import { NextResponse } from "next/server";
import { site } from "@/lib/site";

/**
 * Relays the waitlist form to the app's subscriber endpoint from the server,
 * so the form works from any origin the landing page is served on.
 */
export async function POST(request: Request) {
  let email = "";
  try {
    const body = (await request.json()) as { email?: string };
    email = (body.email ?? "").trim();
  } catch {
    return NextResponse.json({ ok: false, message: "Please enter your email." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, message: "Please enter a valid email." }, { status: 400 });
  }
  try {
    const res = await fetch(`${site.url}/api/subscribers`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ email }),
      cache: "no-store",
    });
    if (res.ok) return NextResponse.json({ ok: true });
    const detail = (await res.json().catch(() => null)) as { message?: string } | null;
    const already = res.status === 409 || /exist|already/i.test(detail?.message ?? "");
    return NextResponse.json(
      { ok: false, message: already ? "You are already on the list." : "Something went wrong. Please try again." },
      { status: already ? 200 : 502 },
    );
  } catch {
    return NextResponse.json({ ok: false, message: "Something went wrong. Please try again." }, { status: 502 });
  }
}
