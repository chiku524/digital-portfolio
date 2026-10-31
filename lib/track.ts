import { track } from "@vercel/analytics";

export type TrackEvent = "project_click" | "social_click" | "contact_submit" | "resume_click" | "case_study_open";

/** Thin wrapper so a blocked/absent analytics script can never break a click. */
export function trackEvent(name: TrackEvent, props: Record<string, string | number | boolean> = {}) {
  try {
    track(name, props);
  } catch {
    /* analytics unavailable */
  }
}