import type Lenis from "lenis";

export type ZoneRange = {
  id: string;
  pinStart: number;
  pinEnd: number;
};

export const reefScroll = {
  progress: 0,
  mobile: false,
  reducedMotion: false,
  ranges: [] as ZoneRange[],
  lenis: null as Lenis | null,
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function smoothstep(value: number) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

export function zoneProgress(progress: number, range: ZoneRange | undefined) {
  if (!range) return 0;
  const span = range.pinEnd - range.pinStart;
  if (span <= 0.00001) return progress >= range.pinEnd ? 1 : 0;
  return clamp((progress - range.pinStart) / span, 0, 1);
}

export function beatFocus(progress: number, range: ZoneRange | undefined, count: number) {
  if (count <= 1) return 0;
  return clamp(Math.round(zoneProgress(progress, range) * (count - 1)), 0, count - 1);
}

export function beatIndex(progress: number, range: ZoneRange | undefined, count: number) {
  return beatFocus(progress, range, count);
}

/** Scroll-scrubbed crossfade. Neighbors stay on screen together and trade opacity. */
export function paintBeats(id: string, t: number, count: number) {
  const nodes = document.querySelectorAll<HTMLElement>(`#${id} .stack > .beat`);
  const reduced = reefScroll.reducedMotion;
  const span = Math.max(1, count - 1);
  const x = clamp(t, 0, 1) * span;
  const low = Math.min(span, Math.floor(x));
  const high = Math.min(count - 1, low + 1);
  const frac = high === low ? 0 : x - low;
  const leave = reduced ? (frac < 0.5 ? 1 : 0) : Math.cos((frac * Math.PI) / 2);
  const enter = reduced ? (frac < 0.5 ? 0 : 1) : Math.sin((frac * Math.PI) / 2);

  nodes.forEach((el, index) => {
    let opacity = 0;
    let shift = 0;
    if (count <= 1) {
      opacity = 1;
    } else if (index === low && index === high) {
      opacity = 1;
    } else if (index === low) {
      opacity = leave;
      shift = reduced ? 0 : -frac * 18;
    } else if (index === high) {
      opacity = enter;
      shift = reduced ? 0 : (1 - frac) * 18;
    }
    const live = opacity > 0.04;
    el.style.opacity = live ? opacity.toFixed(3) : "0";
    el.style.visibility = live ? "visible" : "hidden";
    el.style.pointerEvents = live ? "auto" : "none";
    el.style.position = live ? "relative" : "absolute";
    el.style.transform = live && shift !== 0 ? `translate3d(0, ${shift.toFixed(1)}px, 0)` : "";
    el.inert = !live;
    if (live) el.removeAttribute("aria-hidden");
    else el.setAttribute("aria-hidden", "true");
  });

  if (reduced || frac < 0.5) return low;
  return high;
}

export function scrollToY(top: number) {
  const lenis = reefScroll.lenis;
  if (lenis && !reefScroll.reducedMotion) {
    lenis.scrollTo(top, { duration: 1.05 });
    return;
  }
  window.scrollTo({
    top,
    behavior: reefScroll.reducedMotion ? "auto" : "smooth",
  });
}

export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY;
  scrollToY(top);
}

export function scrollToBeat(id: string, index: number, count: number) {
  const el = document.getElementById(id);
  if (!el || count <= 0) return;
  const top = el.getBoundingClientRect().top + window.scrollY;
  const distance = Math.max(0, el.offsetHeight - window.innerHeight);
  const t = count <= 1 ? 0 : index / (count - 1);
  scrollToY(top + distance * t);
}
