"use client";

import { useState, type FormEvent } from "react";
import { trackEvent } from "@/lib/track";

type Status = "idle" | "sending" | "sent" | "error";

export default function ContactForm({ email }: { email: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const mailto = (name: string, message: string) =>
    `mailto:${email}?subject=${encodeURIComponent(`Portfolio message from ${name || "a visitor"}`)}&body=${encodeURIComponent(message)}`;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    setStatus("sending");
    setError("");
    setFieldErrors({});
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        fallback?: string;
        errors?: Record<string, string>;
      };
      if (res.ok && json.ok) {
        trackEvent("contact_submit", { result: "sent" });
        setStatus("sent");
        form.reset();
        return;
      }
      if (json.fallback === "mailto") {
        trackEvent("contact_submit", { result: "mailto" });
        window.location.href = mailto(data.name, data.message);
        setStatus("error");
        setError(`Opening your mail app instead. If nothing opens, write to ${email}.`);
        return;
      }
      trackEvent("contact_submit", { result: "error" });
      setFieldErrors(json.errors ?? {});
      setStatus("error");
      setError(json.error ?? "Something went wrong. Please try again.");
    } catch {
      setStatus("error");
      setError(`Network error. You can also write to ${email}.`);
    }
  }

  return (
    <form className="contact-form" onSubmit={onSubmit} noValidate={false} aria-describedby="contact-form-status">
      <div className="contact-form-row">
        <label>
          <span>Name</span>
          <input name="name" autoComplete="name" required minLength={2} maxLength={120} aria-invalid={!!fieldErrors.name || undefined} />
        </label>
        <label>
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" required maxLength={200} aria-invalid={!!fieldErrors.email || undefined} />
        </label>
      </div>
      <label>
        <span>Message</span>
        <textarea name="message" required minLength={10} maxLength={5000} rows={3} aria-invalid={!!fieldErrors.message || undefined} />
      </label>
      <label className="contact-hp" aria-hidden="true">
        Company
        <input name="company" tabIndex={-1} autoComplete="off" />
      </label>
      <div className="contact-form-foot">
        <button className="button button--primary" type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Send message"}
        </button>
        <p id="contact-form-status" className="contact-form-status" role="status" aria-live="polite">
          {status === "sent" ? "Thanks — your message is on its way." : error || Object.values(fieldErrors).join(" ")}
        </p>
      </div>
    </form>
  );
}