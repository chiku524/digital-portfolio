import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { reefScroll } from "./scroll";

gsap.registerPlugin(SplitText);

/**
 * Page-load choreography: a veil lifts, the camera settles into the water,
 * the hero headline rises letter by letter and the nav and card details cascade in.
 */
export function playIntro(root: HTMLElement) {
  const reduced = reefScroll.reducedMotion;
  const veil = root.querySelector<HTMLElement>(".intro-veil");
  const title = root.querySelector<HTMLElement>("#top .hero-title");
  const heroBits = root.querySelectorAll<HTMLElement>(
    "#top .card > :not(.hero-title)",
  );
  const nav = root.querySelectorAll<HTMLElement>(".brand, .nav-links a, .nav-book, .depth-readout");

  if (reduced) {
    reefScroll.intro = 0;
    if (veil) gsap.set(veil, { autoAlpha: 0, display: "none" });
    return () => undefined;
  }

  const split = title ? SplitText.create(title, { type: "lines,words,chars", mask: "lines" }) : null;
  const tl = gsap.timeline({ defaults: { ease: "expo.out" }, onComplete: () => split?.revert() });
  reefScroll.intro = 1;

  tl.to(reefScroll, { intro: 0, duration: 3.2, ease: "power3.out" }, 0);
  if (veil) {
    const mark = veil.querySelectorAll(".intro-mark > span");
    tl.fromTo(mark, { yPercent: 110 }, { yPercent: 0, duration: 0.9, stagger: 0.05 }, 0)
      .to(mark, { yPercent: -110, duration: 0.6, stagger: 0.03, ease: "power3.in" }, 0.95)
      .to(veil, { clipPath: "inset(0 0 100% 0)", duration: 1.1, ease: "expo.inOut" }, 1.15)
      .set(veil, { display: "none" });
  }
  tl.from(nav, { autoAlpha: 0, y: -14, duration: 1, stagger: 0.05 }, 1.55);
  if (split) {
    tl.from(
      split.chars,
      { yPercent: 120, rotate: 6, autoAlpha: 0, duration: 1.3, stagger: 0.018 },
      1.6,
    );
  }
  tl.from(heroBits, { autoAlpha: 0, y: 22, filter: "blur(6px)", duration: 1.1, stagger: 0.07, clearProps: "filter" }, 1.75);

  return () => {
    tl.kill();
    split?.revert();
    reefScroll.intro = 0;
  };
}
