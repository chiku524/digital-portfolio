"use client";

import gsap from "gsap";

/** Shared, non-React state for the ambient extras (audio, cursor, day/night). */
export const reefEnv = {
  /** 0 = day palette, 1 = night palette (eased toward `nightTarget`). */
  night: 0,
  nightTarget: 0,
  /** Cursor in normalized device coords, or null when no fine pointer is active. */
  pointer: null as null | { x: number; y: number },
};

if (typeof window !== "undefined") (window as unknown as { __reefEnv?: object }).__reefEnv = reefEnv;

/** Shared shader uniform: every night-aware material reads this same object. */
export const uNight = { value: 0 };

export type Tide = "day" | "night";
const STORAGE_KEY = "reef-tide";

export function storedTide(): Tide | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "day" || v === "night" ? v : null;
  } catch {
    return null;
  }
}

/** Resolved mode: saved choice wins, otherwise local time. Client-only. */
export function initialTide(): Tide {
  return storedTide() ?? (nightFromClock() ? "night" : "day");
}

/** Apply a mode to the scene + DOM. `persist` saves an explicit user choice. */
export function applyTide(tide: Tide, { animate = true, persist = false } = {}) {
  const target = tide === "night" ? 1 : 0;
  reefEnv.nightTarget = target;
  document.documentElement.dataset.tide = tide;
  if (persist) {
    try {
      window.localStorage.setItem(STORAGE_KEY, tide);
    } catch {
      /* storage blocked: still switch for this visit */
    }
  }
  gsap.killTweensOf(reefEnv, "night");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!animate || reduce) {
    reefEnv.night = target;
    uNight.value = target;
    return;
  }
  gsap.to(reefEnv, {
    night: target,
    duration: 1,
    ease: "power2.inOut",
    onUpdate: () => {
      uNight.value = reefEnv.night;
    },
  });
}

/** Local-time default: night from ~19:00 to ~06:00. */
export function nightFromClock(date = new Date()) {
  const h = date.getHours() + date.getMinutes() / 60;
  return h >= 19 || h < 6 ? 1 : 0;
}

export function trackPointer() {
  if (typeof window === "undefined") return () => {};
  const fine = window.matchMedia("(pointer: fine)");
  const move = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || !fine.matches) return;
    reefEnv.pointer = {
      x: (event.clientX / window.innerWidth) * 2 - 1,
      y: -(event.clientY / window.innerHeight) * 2 + 1,
    };
  };
  const leave = () => {
    reefEnv.pointer = null;
  };
  window.addEventListener("pointermove", move, { passive: true });
  document.documentElement.addEventListener("pointerleave", leave);
  window.addEventListener("blur", leave);
  return () => {
    window.removeEventListener("pointermove", move);
    document.documentElement.removeEventListener("pointerleave", leave);
    window.removeEventListener("blur", leave);
    reefEnv.pointer = null;
  };
}

type Ocean = { ctx: AudioContext; master: GainNode };
let ocean: Ocean | null = null;

/** Procedural surf: looped brown noise through a swelling low-pass, no assets. */
function buildOcean(): Ocean {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const seconds = 4;
  const buffer = ctx.createBuffer(2, ctx.sampleRate * seconds, ctx.sampleRate);
  for (let c = 0; c < 2; c += 1) {
    const data = buffer.getChannelData(c);
    let last = 0;
    for (let i = 0; i < data.length; i += 1) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 3.5;
    }
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 420;
  filter.Q.value = 0.6;

  const swell = ctx.createGain();
  swell.gain.value = 0.55;
  const master = ctx.createGain();
  master.gain.value = 0;

  // Slow wave swell (~11s) on loudness and brightness.
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.09;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.35;
  const lfoFreq = ctx.createGain();
  lfoFreq.gain.value = 260;
  lfo.connect(lfoGain).connect(swell.gain);
  lfo.connect(lfoFreq).connect(filter.frequency);

  noise.connect(filter).connect(swell).connect(master).connect(ctx.destination);
  noise.start();
  lfo.start();
  return { ctx, master };
}

/** Must be called from a user gesture. Returns the new on/off state. */
export async function setOceanSound(on: boolean) {
  if (typeof window === "undefined") return false;
  if (!ocean) {
    if (!on) return false;
    ocean = buildOcean();
  }
  const { ctx, master } = ocean;
  const now = ctx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  if (on) {
    await ctx.resume();
    master.gain.linearRampToValueAtTime(0.22, now + 1.5);
  } else {
    master.gain.linearRampToValueAtTime(0, now + 0.6);
    window.setTimeout(() => {
      if (ocean && master.gain.value < 0.01) void ocean.ctx.suspend();
    }, 700);
  }
  return on;
}

export function disposeOcean() {
  if (!ocean) return;
  void ocean.ctx.close();
  ocean = null;
}