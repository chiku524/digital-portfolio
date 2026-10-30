import gsap from "gsap";

/**
 * Hover micro-interactions: magnetic buttons, tilting project cards,
 * and a soft glow that trails the pointer. Skipped for touch and reduced motion.
 */
export function mountInteractions(root: HTMLElement) {
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!fine || reduced) return () => undefined;

  const cleanups: Array<() => void> = [];
  const on = <K extends keyof HTMLElementEventMap>(
    el: HTMLElement | Window,
    type: K,
    fn: (event: HTMLElementEventMap[K]) => void,
  ) => {
    el.addEventListener(type, fn as EventListener);
    cleanups.push(() => el.removeEventListener(type, fn as EventListener));
  };

  root.querySelectorAll<HTMLElement>(".button, .nav-book, .tick, .social, .chip").forEach((el) => {
    const strength = el.classList.contains("chip") ? 0.18 : 0.32;
    const x = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
    const y = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
    on(el, "pointermove", (event) => {
      const box = el.getBoundingClientRect();
      x((event.clientX - box.left - box.width / 2) * strength);
      y((event.clientY - box.top - box.height / 2) * strength);
    });
    on(el, "pointerleave", () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.4)", overwrite: "auto" });
    });
  });

  root.querySelectorAll<HTMLElement>(".project-block").forEach((el) => {
    gsap.set(el, { transformPerspective: 700 });
    const rx = gsap.quickTo(el, "rotationX", { duration: 0.6, ease: "power3.out" });
    const ry = gsap.quickTo(el, "rotationY", { duration: 0.6, ease: "power3.out" });
    on(el, "pointermove", (event) => {
      const box = el.getBoundingClientRect();
      const px = (event.clientX - box.left) / box.width;
      const py = (event.clientY - box.top) / box.height;
      ry((px - 0.5) * 10);
      rx((0.5 - py) * 10);
      el.style.setProperty("--mx", `${px * 100}%`);
      el.style.setProperty("--my", `${py * 100}%`);
    });
    on(el, "pointerleave", () => {
      rx(0);
      ry(0);
    });
  });

  const aura = root.querySelector<HTMLElement>(".cursor-aura");
  if (aura) {
    gsap.set(aura, { xPercent: -50, yPercent: -50, autoAlpha: 0 });
    const ax = gsap.quickTo(aura, "x", { duration: 0.7, ease: "power3.out" });
    const ay = gsap.quickTo(aura, "y", { duration: 0.7, ease: "power3.out" });
    on(window, "pointermove", (event) => {
      gsap.to(aura, { autoAlpha: 1, duration: 0.4, overwrite: "auto" });
      ax(event.clientX);
      ay(event.clientY);
    });
    root.querySelectorAll<HTMLElement>("a, button").forEach((el) => {
      on(el, "pointerenter", () => gsap.to(aura, { scale: 1.8, duration: 0.4 }));
      on(el, "pointerleave", () => gsap.to(aura, { scale: 1, duration: 0.4 }));
    });
  }

  return () => cleanups.forEach((fn) => fn());
}
