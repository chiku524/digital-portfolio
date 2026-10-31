import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { reefScroll } from "./scroll";

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;

export function getLenis() {
  return lenis;
}

/**
 * Inertial smooth scrolling driven by the GSAP ticker so Lenis, ScrollTrigger
 * scrubs and the R3F frame loop all advance on the same clock.
 * Native scrolling is kept for reduced motion; touch keeps native momentum.
 */
export function mountSmoothScroll(reduced: boolean) {
  if (reduced) return () => undefined;
  const instance = new Lenis({
    lerp: 0.085,
    wheelMultiplier: 0.9,
    smoothWheel: true,
    syncTouch: false,
    autoRaf: false,
    // Let overflowing cards scroll their own content.
    allowNestedScroll: true,
  });
  lenis = instance;
  instance.on("scroll", ScrollTrigger.update);
  // Gentle snap: once scrolling has stopped inside a section's fade-in/fade-out band,
  // ease onto the next fully-visible edge so it never rests on an empty screen.
  let idle = 0;
  let snapping = false;
  let dir = 1;
  const settle = () => {
    if (snapping || instance.isStopped || document.querySelector("dialog[open], [role='dialog']")) return;
    const y = instance.scroll;
    const holds = reefScroll.holds;
    if (!holds.length || holds.some((hold) => y >= hold.start - 1 && y <= hold.end + 1)) return;
    // Carry on in the direction of travel, so slow scrolling still moves forward.
    const edges = holds.flatMap((hold) => [hold.start, hold.end]);
    const ahead = edges.filter((edge) => (dir >= 0 ? edge > y : edge < y));
    const pool = ahead.length ? ahead : edges;
    const target = pool.reduce((a, b) => (Math.abs(b - y) < Math.abs(a - y) ? b : a));
    if (Math.abs(target - y) > window.innerHeight * 2) return;
    snapping = true;
    instance.scrollTo(target, {
      duration: 0.7,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      onComplete: () => {
        snapping = false;
      },
    });
  };
  instance.on("scroll", () => {
    window.clearTimeout(idle);
    if (!snapping && instance.direction) dir = instance.direction;
    if (!snapping) idle = window.setTimeout(settle, 260);
  });
  const tick = (time: number) => instance.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  return () => {
    window.clearTimeout(idle);
    gsap.ticker.remove(tick);
    gsap.ticker.lagSmoothing(500, 33);
    instance.destroy();
    if (lenis === instance) lenis = null;
  };
}
