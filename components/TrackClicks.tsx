"use client";

import { useEffect } from "react";
import { trackEvent, type TrackEvent } from "@/lib/track";

/**
 * Delegated click tracking: any element with data-track="event" (plus optional
 * data-track-* props) is reported, so markup stays free of handlers.
 */
export default function TrackClicks() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const el = (event.target as Element | null)?.closest<HTMLElement>("[data-track]");
      if (!el) return;
      const props: Record<string, string> = {};
      for (const [key, value] of Object.entries(el.dataset)) {
        if (key.startsWith("track") && key !== "track" && value) {
          props[key.slice(5, 6).toLowerCase() + key.slice(6)] = value;
        }
      }
      trackEvent(el.dataset.track as TrackEvent, props);
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  return null;
}