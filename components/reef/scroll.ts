import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { getLenis } from "./smooth";

gsap.registerPlugin(ScrollToPlugin);

export type ZoneRange = {
  id: string;
  pinStart: number;
  pinEnd: number;
};

export const reefScroll = {
  progress: 0,
  /** Damped copy of progress, advanced in the R3F frame loop. */
  smooth: 0,
  /** 1 while the page-load intro is playing, eased to 0 by GSAP. */
  intro: 0,
  velocity: 0,
  lean: 0,
  mobile: false,
  reducedMotion: false,
  ranges: [] as ZoneRange[],
  /** Fully-visible scroll windows (px) per section, used by the gentle snap. */
  holds: [] as { id: string; start: number; end: number }[],
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

export function beatIndex(progress: number, range: ZoneRange | undefined, count: number) {
  if (count <= 1) return 0;
  const t = zoneProgress(progress, range);
  return Math.min(count - 1, Math.floor(clamp(t, 0, 0.999999) * count));
}

export function zoneAt(progress: number, ranges: ZoneRange[]) {
  if (!ranges.length) return "top";
  if (progress <= ranges[0].pinStart) return ranges[0].id;
  for (let index = 0; index < ranges.length; index += 1) {
    const range = ranges[index];
    const upcoming = ranges[index + 1];
    if (!upcoming || progress < upcoming.pinStart) return range.id;
  }
  return ranges[ranges.length - 1].id;
}

export function scrollToY(top: number) {
  if (reefScroll.reducedMotion) {
    window.scrollTo(0, top);
    return;
  }
  const lenis = getLenis();
  if (lenis) {
    lenis.scrollTo(top, { duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 4) });
    return;
  }
  gsap.to(window, {
    duration: 0.95,
    overwrite: "auto",
    ease: "power2.inOut",
    scrollTo: { y: top, autoKill: true },
  });
}

export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY;
  // Land inside the fully-visible hold rather than at the fade-in edge.
  const hold = reefScroll.holds.find((entry) => entry.id === id);
  scrollToY(hold ? Math.min(Math.max(top, hold.start), Math.max(top, hold.end)) : top);
}

export function scrollToBeat(id: string, index: number, count: number) {
  const el = document.getElementById(id);
  if (!el || count <= 0) return;
  const top = el.getBoundingClientRect().top + window.scrollY;
  const distance = Math.max(0, el.offsetHeight - window.innerHeight);
  const t = count <= 1 ? 0 : (index + 0.5) / count;
  scrollToY(top + distance * t);
}
