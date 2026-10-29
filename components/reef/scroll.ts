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

export function beatIndex(progress: number, range: ZoneRange | undefined, count: number) {
  if (!range || count <= 1) return 0;
  const span = range.pinEnd - range.pinStart;
  if (span <= 0.00001) return progress >= range.pinEnd ? count - 1 : 0;
  const t = clamp((progress - range.pinStart) / span, 0, 1);
  return Math.min(count - 1, Math.floor(t * count));
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
  const t = (index + 0.5) / count;
  scrollToY(top + distance * t);
}
