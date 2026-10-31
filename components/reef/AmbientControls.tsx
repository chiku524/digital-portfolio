"use client";

import { useEffect, useState } from "react";
import { applyTide, disposeOcean, initialTide, setOceanSound } from "./ambient";

export default function AmbientControls() {
  const [sound, setSound] = useState(false);
  const [night, setNight] = useState(false);

  useEffect(() => {
    // Resolved on the client only (localStorage / local clock), so SSR markup never mismatches.
    const tide = initialTide();
    applyTide(tide, { animate: false });
    const id = window.setTimeout(() => setNight(tide === "night"), 0);
    return () => {
      window.clearTimeout(id);
      disposeOcean();
    };
  }, []);

  return (
    <div className="ambient-controls">
      <button
        type="button"
        className="ambient-toggle"
        aria-pressed={sound}
        aria-label={sound ? "Mute ocean sound" : "Play ocean sound"}
        title={sound ? "Mute ocean sound" : "Play ocean sound"}
        onClick={async () => setSound(await setOceanSound(!sound))}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 9h4l5-4v14l-5-4H4z" />
          {sound ? <path d="M16 8.5c1.6 1.9 1.6 5.1 0 7M18.5 6c3 3.3 3 8.7 0 12" /> : <path d="M16.5 9.5l5 5M21.5 9.5l-5 5" />}
        </svg>
      </button>
      <button
        type="button"
        className="ambient-toggle"
        aria-pressed={night}
        aria-label={night ? "Switch to daytime water" : "Switch to night water"}
        title={night ? "Switch to daytime water" : "Switch to night water"}
        onClick={() => {
          const next = !night;
          applyTide(next ? "night" : "day", { persist: true });
          setNight(next);
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {night ? (
            <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" />
          ) : (
            <>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}