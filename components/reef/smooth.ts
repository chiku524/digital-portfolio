import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

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
  const tick = (time: number) => instance.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  return () => {
    gsap.ticker.remove(tick);
    gsap.ticker.lagSmoothing(500, 33);
    instance.destroy();
    if (lenis === instance) lenis = null;
  };
}
