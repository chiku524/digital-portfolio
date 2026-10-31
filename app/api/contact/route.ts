import { NextResponse } from "next/server";

/**
 * Contact form -> Resend. Requires RESEND_API_KEY and CONTACT_TO_EMAIL.
 * CONTACT_FROM_EMAIL is optional (must be on a domain verified in Resend);
 * without it Resend's shared onboarding sender is used, which only delivers
 * to the Resend account owner's address.
 * When the key/recipient are missing the route answers 503 + fallback:"mailto"
 * and the client opens a prefilled mailto instead.
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
// Best-effort, per-instance limiter (serverless instances do not share it).
const hits = new Map<string, number[]>();

function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: real visitors never fill "company". Pretend success for bots.
  if (clean(body.company, 200)) return NextResponse.json({ ok: true });

  const name = clean(body.name, 120);
  const email = clean(body.email, 200);
  const message = clean(body.message, 5000);
  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = "Please add your name.";
  if (!EMAIL_RE.test(email)) errors.email = "Please use a valid email address.";
  if (message.length < 10) errors.message = "A few more words, please (10+ characters).";
  if (Object.keys(errors).length) {
    return NextResponse.json({ ok: false, error: "Please check the highlighted fields.", errors }, { status: 422 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "anon";
  if (limited(ip)) {
    return NextResponse.json({ ok: false, error: "Too many messages. Please try again later." }, { status: 429 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !to) {
    return NextResponse.json({ ok: false, fallback: "mailto", error: "Email delivery is not configured." }, { status: 503 });
  }

  const from = process.env.CONTACT_FROM_EMAIL || "Portfolio <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,
      subject: `Portfolio message from ${name}`,
      text: `${message}\n\n- ${name} <${email}>`,
      html: `<p>${escapeHtml(message).replace(/\n/g, "<br>")}</p><p>- ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>`,
    }),
  }).catch(() => null);

  if (!res || !res.ok) {
    return NextResponse.json({ ok: false, fallback: "mailto", error: "The message could not be sent." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}