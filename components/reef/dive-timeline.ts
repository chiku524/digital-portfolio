import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { APPROACH, SKILLS, WORK_GROUPS, WORK_GROUP_SIZE } from "@/content/portfolio";
import { beatIndex, reefScroll, zoneAt, type ZoneRange } from "./scroll";

gsap.registerPlugin(ScrollTrigger, SplitText);

const SKILL_BEATS = SKILLS.length + 1;

type Scene = {
  zone: string;
  project: number;
  skill: number;
  approach: number;
  progress: number;
};

type Split = { revert: () => void };

type Range = { start: number; end: number };

function zoneSpan(id: string, max: number) {
  const el = document.getElementById(id);
  if (!el || max <= 0) return { start: 0, end: 0 };
  const top = el.getBoundingClientRect().top + window.scrollY;
  let start = top / max;
  let end = Math.max(start, (top + el.offsetHeight - window.innerHeight) / max);
  if (id === "contact") {
    // The last section can be exactly one viewport tall, which collapses its range to a
    // single point at progress 1 that scrub never quite reaches. Start it while it is
    // still rising into view and let it run to the very end of the page instead.
    start = Math.min(start, Math.max(0, (top - window.innerHeight * 0.55) / max));
    end = 1;
  }
  return { start, end };
}

function placeSolo(id: string, index: number) {
  document.querySelectorAll<HTMLElement>(`#${id} .beat`).forEach((el, beat) => {
    const on = beat === index;
    el.dataset.live = on ? "true" : "false";
    el.inert = !on;
    if (on) el.removeAttribute("aria-hidden");
    else el.setAttribute("aria-hidden", "true");
  });
}

function markCurrent(id: string, group: number) {
  document.querySelectorAll<HTMLElement>(`#${id} .project-block`).forEach((el, index) => {
    el.dataset.live = Math.floor(index / WORK_GROUP_SIZE) === group ? "true" : "false";
  });
}

/**
 * One project at a time, each in its own scattered slot. A long sine fade-in,
 * a hold, then a long sine fade-out. The next block only begins once the
 * current one is already leaving, so two cards are never readable together.
 * The last block stays put; the field fades the set out together before Skills.
 */
const LEAD = 0.08;
const FADE_IN = 0.46;
const FADE_OUT = 0.36;

// The last project gets a longer slice so the section exit does not eat its hold.
const LAST_EXTRA = 0.55;

function workSlices(range: Range, groups: number) {
  const seg = (range.end - range.start) / Math.max(groups + LAST_EXTRA, 1);
  return Array.from({ length: groups }, (_, g) => {
    const at = range.start + seg * g;
    const enter = g === 0 ? at : at - seg * LEAD;
    return { at, seg, enter, settled: enter + seg * FADE_IN, exit: at + seg * (1 - FADE_OUT), last: g === groups - 1 };
  });
}

function workGroupAt(progress: number, range: Range, groups: number) {
  const seg = (range.end - range.start) / Math.max(groups + LAST_EXTRA, 1);
  if (seg <= 0) return 0;
  return Math.min(groups - 1, Math.max(0, Math.floor((progress - range.start) / seg + LEAD)));
}

type ProjectParts = { badge: Element | null; title: Element | null; words: Element[]; body: Element[] };

type MotionCtx = {
  tl: gsap.core.Timeline;
  article: HTMLElement;
  parts: ProjectParts;
  /** Everything inside the card, top to bottom. */
  contents: Element[];
  at: number;
  d: number;
  /** A filter string, or "none" on phones where per-frame filters are too costly. */
  fx: (filter: string, neutral: string) => string;
};

type ProjectMotion = {
  name: string;
  /** Mask the title words (they rise out of a clip) or leave them free to travel. */
  mask: boolean;
  /** Clip-path reveals carry their own visibility, so the card's opacity snaps in fast. */
  clip?: boolean;
  intro: (c: MotionCtx) => void;
  outro: (c: MotionCtx) => void;
};

const FULL = "inset(-48px -48px -48px -48px round 20px)";
const ease = (vars: gsap.TweenVars): gsap.TweenVars => ({ immediateRender: false, ...vars });

function accent(c: MotionCtx, show: boolean, from = 0.12, length = 0.6) {
  if (show) c.tl.fromTo(c.article, { "--bar": 0 }, ease({ "--bar": 1, duration: c.d * length, ease: "power2.inOut" }), c.at + c.d * from);
  else c.tl.to(c.article, { "--bar": 0, duration: c.d * length, ease: "power2.in" }, c.at + c.d * from);
}

function settle(c: MotionCtx, items: Element[], from: gsap.TweenVars, at: number, length = 0.45, each = 0.08, easing = "power2.out") {
  if (!items.length) return;
  const to: gsap.TweenVars = { autoAlpha: 1, x: 0, y: 0, rotation: 0, scale: 1, duration: c.d * length, stagger: c.d * each, ease: easing };
  if ("filter" in from) to.filter = c.fx("blur(0px)", "none");
  c.tl.fromTo(items, { autoAlpha: 0, ...from }, ease(to), c.at + c.d * at);
}

function lift(c: MotionCtx, items: Element[], to: gsap.TweenVars, length = 0.45, each = 0.06, easing = "power2.in") {
  if (!items.length) return;
  c.tl.to(items, { autoAlpha: 0, duration: c.d * length, stagger: c.d * each, ease: easing, ...to }, c.at);
}

/**
 * Eleven-plus distinct entrances and exits, one per project, all reef-themed.
 * Every one is scrubbed, so scrolling back up plays it in reverse.
 */
const PROJECT_MOTIONS: ProjectMotion[] = [
  {
    name: "current",
    mask: true,
    // Swims in from the left out of a blur; drifts up and away to the right.
    intro: (c) => {
      c.tl.fromTo(c.article, { x: -48, y: 30, rotation: 1.6, scale: 0.94, filter: c.fx("blur(10px)", "none") }, ease({ x: 0, y: 0, rotation: 0, scale: 1, filter: c.fx("blur(0px)", "none"), duration: c.d, ease: "power3.out" }), c.at);
      accent(c, true);
      settle(c, c.parts.badge ? [c.parts.badge] : [], { x: -18 }, 0.16, 0.5);
      c.tl.fromTo(c.parts.words, { yPercent: 115 }, ease({ yPercent: 0, duration: c.d * 0.6, stagger: c.d * 0.08, ease: "expo.out" }), c.at + c.d * 0.22);
      settle(c, c.parts.body, { y: 12 }, 0.4, 0.5, 0.1);
    },
    outro: (c) => {
      lift(c, c.contents, { y: -14 });
      accent(c, false, 0.15, 0.5);
      c.tl.to(c.article, { x: 30, y: -36, rotation: -1.2, scale: 0.95, filter: c.fx("blur(8px)", "none"), duration: c.d, ease: "sine.in" }, c.at + c.d * 0.05);
    },
  },
  {
    name: "bubble",
    mask: false,
    // Pops up from the seabed like a bubble; bursts outward on the way out.
    intro: (c) => {
      c.tl.fromTo(c.article, { scale: 0.55, y: 90, transformOrigin: "50% 100%" }, ease({ scale: 1, y: 0, duration: c.d, ease: "back.out(1.7)" }), c.at);
      accent(c, true, 0.3, 0.5);
      c.tl.fromTo(c.parts.words, { autoAlpha: 0, scale: 0, y: 20 }, ease({ autoAlpha: 1, scale: 1, y: 0, duration: c.d * 0.55, stagger: { each: c.d * 0.07, from: "random" }, ease: "elastic.out(1, 0.5)" }), c.at + c.d * 0.25);
      settle(c, [c.parts.badge, ...c.parts.body].filter(Boolean) as Element[], { y: 18, scale: 0.8 }, 0.35, 0.5, 0.08, "back.out(2)");
    },
    outro: (c) => {
      lift(c, c.contents, { scale: 0.6, y: -10 }, 0.4, 0.04, "back.in(2)");
      accent(c, false, 0.1, 0.4);
      c.tl.to(c.article, { keyframes: [{ scale: 1.06, duration: c.d * 0.35, ease: "sine.out" }, { scale: 0.4, y: -60, duration: c.d * 0.65, ease: "back.in(1.8)" }] }, c.at);
    },
  },
  {
    name: "curtain",
    mask: true,
    clip: true,
    // Unfurls top-down like a curtain of current; rolls back up and away.
    intro: (c) => {
      c.tl.fromTo(c.article, { clipPath: "inset(-48px -48px 100% -48px round 20px)", y: -18 }, ease({ clipPath: FULL, y: 0, duration: c.d, ease: "power3.inOut" }), c.at);
      accent(c, true, 0, 0.9);
      c.tl.fromTo(c.parts.words, { yPercent: -115 }, ease({ yPercent: 0, duration: c.d * 0.55, stagger: c.d * 0.06, ease: "power3.out" }), c.at + c.d * 0.3);
      settle(c, [c.parts.badge, ...c.parts.body].filter(Boolean) as Element[], { x: -24 }, 0.35, 0.5, 0.08, "sine.out");
    },
    outro: (c) => {
      lift(c, [...c.contents].reverse(), { x: 24 }, 0.4, 0.05);
      accent(c, false, 0.2, 0.5);
      c.tl.to(c.article, { clipPath: "inset(-48px -48px 100% -48px round 20px)", y: -24, duration: c.d, ease: "power3.inOut" }, c.at);
    },
  },
  {
    name: "sonar",
    mask: true,
    clip: true,
    // A sonar ping opens the card from its left edge; it closes into the right edge.
    intro: (c) => {
      c.tl.fromTo(c.article, { clipPath: "circle(0% at 0% 50%)" }, ease({ clipPath: "circle(220% at 0% 50%)", duration: c.d, ease: "power2.inOut" }), c.at);
      accent(c, true, 0, 0.4);
      c.tl.fromTo(c.parts.words, { yPercent: 110, rotation: 4 }, ease({ yPercent: 0, rotation: 0, duration: c.d * 0.6, stagger: c.d * 0.07, ease: "expo.out" }), c.at + c.d * 0.3);
      settle(c, [c.parts.badge, ...c.parts.body].filter(Boolean) as Element[], { x: -30, filter: c.fx("blur(4px)", "none") }, 0.25, 0.5, 0.08);
    },
    outro: (c) => {
      lift(c, c.contents, { x: 30 }, 0.45, 0.05);
      accent(c, false, 0, 0.4);
      c.tl.fromTo(c.article, { clipPath: "circle(220% at 100% 50%)" }, ease({ clipPath: "circle(0% at 100% 50%)", duration: c.d, ease: "power2.inOut" }), c.at);
    },
  },
  {
    name: "depth",
    mask: true,
    // Rises from the deep, tilted back in perspective; sinks again on the way out.
    intro: (c) => {
      c.tl.fromTo(c.article, { y: 140, rotationX: 38, scale: 0.86, transformPerspective: 700, transformOrigin: "50% 100%", filter: c.fx("blur(12px) brightness(0.5)", "none") }, ease({ y: 0, rotationX: 0, scale: 1, filter: c.fx("blur(0px) brightness(1)", "none"), duration: c.d, ease: "power3.out" }), c.at);
      accent(c, true, 0.4, 0.5);
      c.tl.fromTo(c.parts.words, { yPercent: 120 }, ease({ yPercent: 0, duration: c.d * 0.5, stagger: c.d * 0.1, ease: "power4.out" }), c.at + c.d * 0.35);
      settle(c, [c.parts.badge, ...c.parts.body].filter(Boolean) as Element[], { y: 24 }, 0.45, 0.45, 0.06);
    },
    outro: (c) => {
      lift(c, c.contents, { y: 16 }, 0.4, 0.04);
      accent(c, false, 0, 0.4);
      c.tl.to(c.article, { y: 120, rotationX: -30, scale: 0.88, transformPerspective: 700, filter: c.fx("blur(10px) brightness(0.4)", "none"), duration: c.d, ease: "power2.in" }, c.at);
    },
  },
  {
    name: "kelp",
    mask: false,
    // Sways in like a kelp frond anchored at its base; swings off the other way.
    intro: (c) => {
      c.tl.fromTo(c.article, { rotation: -14, x: -40, transformOrigin: "0% 100%" }, ease({ rotation: 0, x: 0, duration: c.d, ease: "elastic.out(1, 0.55)" }), c.at);
      accent(c, true, 0.15, 0.6);
      c.tl.fromTo(c.parts.words, { autoAlpha: 0, skewX: -25, x: -16 }, ease({ autoAlpha: 1, skewX: 0, x: 0, duration: c.d * 0.55, stagger: c.d * 0.08, ease: "elastic.out(1, 0.6)" }), c.at + c.d * 0.25);
      settle(c, [c.parts.badge, ...c.parts.body].filter(Boolean) as Element[], { rotation: -4, y: 10 }, 0.35, 0.5, 0.08, "back.out(1.6)");
    },
    outro: (c) => {
      lift(c, c.contents, { skewX: 20, x: 20 }, 0.4, 0.05);
      accent(c, false, 0.1, 0.5);
      c.tl.to(c.article, { rotation: 16, x: 60, transformOrigin: "100% 100%", duration: c.d, ease: "back.in(1.4)" }, c.at);
    },
  },
  {
    name: "turn",
    mask: true,
    // Turns toward you like a fish showing its side; turns away to exit.
    intro: (c) => {
      c.tl.fromTo(c.article, { rotationY: -85, transformPerspective: 900, transformOrigin: "0% 50%" }, ease({ rotationY: 0, duration: c.d, ease: "power3.out" }), c.at);
      accent(c, true, 0.35, 0.5);
      c.tl.fromTo(c.parts.words, { yPercent: 100 }, ease({ yPercent: 0, duration: c.d * 0.5, stagger: c.d * 0.06, ease: "power3.out" }), c.at + c.d * 0.4);
      settle(c, [c.parts.badge, ...c.parts.body].filter(Boolean) as Element[], { x: 20 }, 0.45, 0.45, 0.06);
    },
    outro: (c) => {
      lift(c, c.contents, { x: -16 }, 0.35, 0.04);
      accent(c, false, 0, 0.35);
      c.tl.to(c.article, { rotationY: 85, transformPerspective: 900, transformOrigin: "100% 50%", duration: c.d, ease: "power2.in" }, c.at);
    },
  },
  {
    name: "shoal",
    mask: false,
    // Title words gather like a shoal from every direction; scatter again on exit.
    intro: (c) => {
      c.tl.fromTo(c.article, { scale: 0.97 }, ease({ scale: 1, duration: c.d, ease: "sine.out" }), c.at);
      accent(c, true, 0.5, 0.4);
      c.tl.fromTo(
        c.parts.words,
        { autoAlpha: 0, x: () => gsap.utils.random(-160, 160), y: () => gsap.utils.random(-90, 90), rotation: () => gsap.utils.random(-40, 40) },
        ease({ autoAlpha: 1, x: 0, y: 0, rotation: 0, duration: c.d * 0.75, stagger: { each: c.d * 0.04, from: "random" }, ease: "power3.out" }),
        c.at,
      );
      settle(c, [c.parts.badge, ...c.parts.body].filter(Boolean) as Element[], { x: () => gsap.utils.random(-60, 60), y: () => gsap.utils.random(-30, 30) }, 0.2, 0.6, 0.06, "power3.out");
    },
    outro: (c) => {
      c.tl.to(c.parts.words, { autoAlpha: 0, x: () => gsap.utils.random(-180, 180), y: () => gsap.utils.random(-100, 100), rotation: () => gsap.utils.random(-50, 50), duration: c.d * 0.7, stagger: { each: c.d * 0.04, from: "random" }, ease: "power2.in" }, c.at);
      lift(c, [c.parts.badge, ...c.parts.body].filter(Boolean) as Element[], { x: () => gsap.utils.random(-80, 80), y: () => gsap.utils.random(-40, 40) }, 0.6, 0.05);
      accent(c, false, 0, 0.4);
      c.tl.to(c.article, { scale: 0.97, duration: c.d, ease: "sine.in" }, c.at);
    },
  },
  {
    name: "shaft",
    mask: true,
    clip: true,
    // A shaft of light opens from the centre outward; it narrows back to a sliver.
    intro: (c) => {
      c.tl.fromTo(c.article, { clipPath: "inset(-48px 50% -48px 50% round 20px)", filter: c.fx("brightness(2.2)", "none") }, ease({ clipPath: FULL, filter: c.fx("brightness(1)", "none"), duration: c.d, ease: "expo.inOut" }), c.at);
      accent(c, true, 0.4, 0.5);
      c.tl.fromTo(c.parts.words, { yPercent: 110, autoAlpha: 0 }, ease({ yPercent: 0, autoAlpha: 1, duration: c.d * 0.5, stagger: { each: c.d * 0.06, from: "center" }, ease: "power3.out" }), c.at + c.d * 0.35);
      settle(c, [c.parts.badge, ...c.parts.body].filter(Boolean) as Element[], { scale: 0.9 }, 0.45, 0.45, 0.06);
    },
    outro: (c) => {
      lift(c, c.contents, { scale: 0.92 }, 0.4, 0.04);
      accent(c, false, 0, 0.4);
      c.tl.to(c.article, { clipPath: "inset(-48px 50% -48px 50% round 20px)", filter: c.fx("brightness(2.2)", "none"), duration: c.d, ease: "expo.inOut" }, c.at);
    },
  },
  {
    name: "wave",
    mask: false,
    // Rolls in on a wave from the right, contents bobbing; washes out to the left.
    intro: (c) => {
      c.tl.fromTo(c.article, { x: 120, skewX: -14 }, ease({ x: 0, skewX: 0, duration: c.d, ease: "elastic.out(1, 0.7)" }), c.at);
      accent(c, true, 0.2, 0.5);
      c.tl.fromTo(c.parts.words, { autoAlpha: 0, y: (i: number) => (i % 2 ? 22 : -22) }, ease({ autoAlpha: 1, y: 0, duration: c.d * 0.6, stagger: c.d * 0.06, ease: "sine.inOut" }), c.at + c.d * 0.2);
      settle(c, [c.parts.badge, ...c.parts.body].filter(Boolean) as Element[], { x: 40 }, 0.3, 0.5, 0.08, "sine.out");
    },
    outro: (c) => {
      c.tl.to(c.parts.words, { autoAlpha: 0, y: (i: number) => (i % 2 ? -20 : 20), duration: c.d * 0.45, stagger: c.d * 0.04, ease: "sine.in" }, c.at);
      lift(c, [c.parts.badge, ...c.parts.body].filter(Boolean) as Element[], { x: -40 }, 0.45, 0.05);
      accent(c, false, 0.1, 0.4);
      c.tl.to(c.article, { x: -140, skewX: 14, duration: c.d, ease: "power2.in" }, c.at);
    },
  },
  {
    name: "drift-down",
    mask: true,
    // Settles down from the surface like falling sediment; tumbles on into the deep.
    intro: (c) => {
      c.tl.fromTo(c.article, { y: -120, x: -30, rotation: -8 }, ease({ y: 0, x: 0, rotation: 0, duration: c.d, ease: "power4.out" }), c.at);
      accent(c, true, 0.25, 0.55);
      c.tl.fromTo(c.parts.words, { yPercent: -110 }, ease({ yPercent: 0, duration: c.d * 0.55, stagger: c.d * 0.07, ease: "bounce.out" }), c.at + c.d * 0.3);
      settle(c, [c.parts.badge, ...c.parts.body].filter(Boolean) as Element[], { y: -16 }, 0.4, 0.5, 0.08);
    },
    outro: (c) => {
      lift(c, [...c.contents].reverse(), { y: 20 }, 0.4, 0.05);
      accent(c, false, 0.1, 0.4);
      c.tl.to(c.article, { y: 140, x: 40, rotation: 10, duration: c.d, ease: "power3.in" }, c.at);
    },
  },
  {
    name: "glow",
    mask: true,
    // Blooms out of a burst of bioluminescence; dims to the dark on exit.
    intro: (c) => {
      c.tl.fromTo(c.article, { scale: 1.12, filter: c.fx("brightness(2.4) blur(14px)", "none") }, ease({ scale: 1, filter: c.fx("brightness(1) blur(0px)", "none"), duration: c.d, ease: "power2.out" }), c.at);
      accent(c, true, 0.1, 0.7);
      c.tl.fromTo(c.parts.words, { yPercent: 100, autoAlpha: 0 }, ease({ yPercent: 0, autoAlpha: 1, duration: c.d * 0.6, stagger: c.d * 0.05, ease: "power2.out" }), c.at + c.d * 0.3);
      settle(c, [c.parts.badge, ...c.parts.body].filter(Boolean) as Element[], { filter: c.fx("blur(6px)", "none") }, 0.4, 0.5, 0.08);
    },
    outro: (c) => {
      lift(c, c.contents, { filter: c.fx("blur(6px)", "none") }, 0.5, 0.05);
      accent(c, false, 0.1, 0.5);
      c.tl.to(c.article, { scale: 0.9, filter: c.fx("brightness(0.2) blur(10px)", "none"), duration: c.d, ease: "power2.in" }, c.at);
    },
  },
  {
    name: "diagonal",
    mask: true,
    clip: true,
    // Wiped in on a diagonal sweep from the bottom-left; wiped out toward the top-right.
    intro: (c) => {
      c.tl.fromTo(c.article, { clipPath: "polygon(0% 100%, 0% 100%, 0% 100%, 0% 100%)" }, ease({ clipPath: "polygon(-10% -10%, 210% -10%, 110% 110%, -10% 110%)", duration: c.d, ease: "power3.inOut" }), c.at);
      accent(c, true, 0.1, 0.6);
      c.tl.fromTo(c.parts.words, { yPercent: 110, xPercent: -20 }, ease({ yPercent: 0, xPercent: 0, duration: c.d * 0.55, stagger: c.d * 0.06, ease: "power3.out" }), c.at + c.d * 0.3);
      settle(c, [c.parts.badge, ...c.parts.body].filter(Boolean) as Element[], { x: -20, y: 20 }, 0.35, 0.5, 0.07);
    },
    outro: (c) => {
      lift(c, c.contents, { x: 20, y: -20 }, 0.45, 0.05);
      accent(c, false, 0.1, 0.4);
      c.tl.to(c.article, { clipPath: "polygon(110% -10%, 110% -10%, 110% -10%, 110% -10%)", duration: c.d, ease: "power3.inOut" }, c.at);
    },
  },
  {
    name: "zoom",
    mask: true,
    // Swims straight at you out of the distance; recedes back into it.
    intro: (c) => {
      c.tl.fromTo(c.article, { scale: 0.5, z: -200, transformPerspective: 800, filter: c.fx("blur(10px)", "none") }, ease({ scale: 1, z: 0, filter: c.fx("blur(0px)", "none"), duration: c.d, ease: "expo.out" }), c.at);
      accent(c, true, 0.3, 0.5);
      c.tl.fromTo(c.parts.words, { yPercent: 110, scale: 1.4 }, ease({ yPercent: 0, scale: 1, duration: c.d * 0.55, stagger: c.d * 0.06, ease: "expo.out" }), c.at + c.d * 0.3);
      settle(c, [c.parts.badge, ...c.parts.body].filter(Boolean) as Element[], { scale: 1.1 }, 0.4, 0.45, 0.06);
    },
    outro: (c) => {
      lift(c, c.contents, { scale: 0.9 }, 0.4, 0.04);
      accent(c, false, 0, 0.4);
      c.tl.to(c.article, { scale: 0.5, filter: c.fx("blur(10px)", "none"), duration: c.d, ease: "expo.in" }, c.at);
    },
  },
];

function scatterSequence(tl: gsap.core.Timeline, range: Range, reduced: boolean, splits: Split[], late = 0) {
  const nodes = gsap.utils.toArray<HTMLElement>("#work .project-block");
  const count = nodes.length;
  if (!count || range.end <= range.start) return;
  const slices = workSlices(range, count);
  const rich = !reefScroll.mobile;
  const fx = (filter: string, neutral: string) => (rich ? filter : neutral);

  slices.forEach((slice, index) => {
    const article = nodes[index];
    const fadeIn = reduced ? 0.0001 : Math.max(slice.seg * FADE_IN, 0.0001);
    const fadeOut = reduced ? 0.0001 : Math.max(slice.seg * FADE_OUT, 0.0001);

    if (reduced) {
      // Reduced motion: a plain, near-instant opacity swap with no travel.
      tl.set(article, { autoAlpha: 0, pointerEvents: "none" }, 0);
      tl.to(article, { autoAlpha: 1, duration: fadeIn }, slice.enter);
      tl.set(article, { pointerEvents: "auto" }, slice.settled);
      if (!slice.last) {
        tl.set(article, { pointerEvents: "none" }, slice.exit);
        tl.to(article, { autoAlpha: 0, duration: fadeOut }, slice.exit);
      }
      return;
    }

    const motion = PROJECT_MOTIONS[index % PROJECT_MOTIONS.length];
    const title = article.querySelector("h3");
    let words: Element[] = [];
    if (title) {
      const split = SplitText.create(title, { type: "words", mask: motion.mask ? "words" : undefined });
      splits.push(split);
      words = split.words;
    }
    const parts: ProjectParts = {
      badge: article.querySelector(".badge"),
      title,
      words,
      body: [...article.querySelectorAll(".project-copy, .project-note, .project-links")],
    };
    const contents = [parts.badge, parts.title, ...parts.body].filter(Boolean) as Element[];
    const base = { tl, article, parts, contents, fx };
    // Clip reveals carry their own visibility; others fade with their travel.
    const show = motion.clip ? 0.12 : 0.55;

    tl.set(article, { autoAlpha: 0, pointerEvents: "none", "--bar": 0 }, 0);
    tl.fromTo(article, { autoAlpha: 0 }, ease({ autoAlpha: 1, duration: fadeIn * show, ease: "sine.out" }), slice.enter);
    motion.intro({ ...base, at: slice.enter, d: fadeIn });
    tl.set(article, { pointerEvents: "auto" }, slice.settled);
    if (!slice.last) {
      tl.set(article, { pointerEvents: "none" }, slice.exit);
      motion.outro({ ...base, at: slice.exit, d: fadeOut });
      tl.to(article, { autoAlpha: 0, duration: fadeOut * show, ease: "sine.in" }, slice.exit + fadeOut * (1 - show));
    } else {
      // The last card leaves with the field, but still plays its own exit while it goes.
      const leave = workExit(range);
      motion.outro({ ...base, at: Math.max(range.start, range.end - leave + late), d: leave });
    }
  });
}

/** Section edges: ~20% entrance, ~60% fully visible hold, ~20% exit. */
const EDGE = 0.2;
const edgeIn = (range: Range) => Math.min(0.04, (range.end - range.start) * EDGE);
const edgeOut = (range: Range, beats = 1) =>
  Math.min(0.04, (range.end - range.start) * EDGE, ((range.end - range.start) / Math.max(beats, 1)) * 0.6);
const workExit = (range: Range) => Math.min(0.07, (range.end - range.start) * 0.18);

function fadeField(
  tl: gsap.core.Timeline,
  range: { start: number; end: number },
  reduced: boolean,
  late = 0,
) {
  const field = document.querySelector<HTMLElement>("#work .work-field");
  if (!field || range.end <= range.start) return;
  const leave = reduced ? 0.0001 : workExit(range);
  tl.fromTo(
    field,
    { autoAlpha: 1 },
    { autoAlpha: 0, duration: leave, ease: "sine.in", immediateRender: false },
    Math.max(range.start, range.end - leave + late),
  );
}

function soloSequence(
  tl: gsap.core.Timeline,
  id: string,
  count: number,
  range: { start: number; end: number },
  reduced: boolean,
  splits: Split[],
) {
  const nodes = gsap.utils.toArray<HTMLElement>(`#${id} .beat`);
  const slice = count > 0 ? (range.end - range.start) / count : 0;
  nodes.forEach((article, index) => {
    const at = range.start + slice * index;
    const fade = reduced ? 0.0001 : Math.max(slice * 0.42, 0.0001);
    tl.set(article, { autoAlpha: 0, y: 0 }, 0);

    const title = article.querySelector("h3");
    let words: Element[] = [];
    if (title && !reduced) {
      const split = SplitText.create(title, { type: "words", mask: "words" });
      splits.push(split);
      words = split.words;
      tl.set(words, { yPercent: 120 }, 0);
    }

    const blocks = [...article.children].filter((node) => node !== title);
    tl.to(article, { autoAlpha: 1, y: 0, duration: fade, ease: "power2.out" }, at);
    if (!reduced && blocks.length) {
      tl.fromTo(
        blocks,
        { autoAlpha: 0, y: 14 },
        {
          autoAlpha: 1,
          y: 0,
          duration: fade * 0.72,
          stagger: fade * 0.16,
          ease: "power3.out",
          immediateRender: false,
        },
        at + fade * 0.06,
      );
    }
    if (words.length) {
      tl.to(
        words,
        {
          yPercent: 0,
          duration: fade * 0.62,
          stagger: fade * 0.14,
          ease: "power3.out",
        },
        at + fade * 0.1,
      );
    }
  });
}

function fadeGroup(
  tl: gsap.core.Timeline,
  id: string,
  range: { start: number; end: number },
  reduced: boolean,
  hold: boolean,
  custom = false,
  beats = 1,
) {
  const card = document.querySelector<HTMLElement>(`#${id} .card`);
  if (!card || range.end <= range.start) return;
  // Sections with their own intro only fade the shell in; the intro supplies the motion.
  const lift = custom ? 0 : 26;
  const enter = reduced ? 0.0001 : edgeIn(range);
  const exit = reduced ? 0.0001 : edgeOut(range, beats);
  if (range.start > 0.002) {
    tl.set(card, { autoAlpha: 0, y: reduced ? 0 : lift }, 0);
    tl.to(card, { autoAlpha: 1, y: 0, duration: custom ? enter * 0.35 : enter, ease: "power2.out" }, range.start);
  }
  if (!hold) {
    const leave = exit;
    tl.to(
      card,
      { autoAlpha: 0, y: reduced ? 0 : -30, duration: leave, ease: "power2.in" },
      Math.max(range.start, range.end - leave),
    );
  } else if (range.start > 0.002 && !custom) {
    tl.fromTo(
      [...card.children],
      { autoAlpha: 0, y: reduced ? 0 : 16 },
      {
        autoAlpha: 1,
        y: 0,
        duration: enter,
        stagger: reduced ? 0 : enter * 0.2,
        ease: "power3.out",
        immediateRender: false,
      },
      range.start,
    );
  }
}

const introLength = (range: Range) => Math.min(0.04, (range.end - range.start) * 0.2);

function masked(el: Element | null, type: "lines" | "words" | "chars", splits: Split[]) {
  if (!el) return [] as Element[];
  const split = SplitText.create(el, { type, mask: type === "chars" ? undefined : type });
  splits.push(split);
  return type === "lines" ? split.lines : type === "words" ? split.words : split.chars;
}

/** About: a tide-line. The headline rises line by line out of a mask, the kicker
 * tightens in from wide tracking, prose surfaces from a blur, values settle last. */
function aboutIntro(tl: gsap.core.Timeline, range: Range, splits: Split[]) {
  const card = document.querySelector("#about .card");
  if (!card) return;
  const d = introLength(range);
  const at = range.start;
  const lines = masked(card.querySelector(".section-title"), "lines", splits);
  tl.fromTo(card.querySelector(".kicker"), { autoAlpha: 0, letterSpacing: "0.7em" }, { autoAlpha: 1, letterSpacing: "0.18em", duration: d, ease: "power3.out", immediateRender: true, clearProps: "letterSpacing" }, at);
  tl.fromTo(lines, { yPercent: 115, rotate: 3 }, { yPercent: 0, rotate: 0, duration: d * 0.9, stagger: d * 0.15, ease: "expo.out", immediateRender: true }, at + d * 0.08);
  tl.fromTo(card.querySelectorAll(":scope > p:not(.kicker)"), { autoAlpha: 0, y: 12, filter: "blur(6px)" }, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: d * 0.8, stagger: d * 0.18, ease: "power2.out", immediateRender: true, clearProps: "filter" }, at + d * 0.3);
  tl.fromTo(card.querySelectorAll(":scope > .chips .chip"), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: d * 0.5, stagger: d * 0.06, ease: "power2.out", immediateRender: true }, at + d * 0.75);
}

/** Skills: bubbles. Title letters float up from random depths, the beat ticks pop
 * like rising bubbles with an elastic wobble, and the toolkit chips do the same. */
function skillsIntro(tl: gsap.core.Timeline, range: Range, splits: Split[]) {
  const card = document.querySelector("#skills .card");
  if (!card) return;
  const d = introLength(range);
  const at = range.start;
  tl.fromTo(card, { scale: 0.94, transformOrigin: "50% 100%" }, { scale: 1, duration: d, ease: "back.out(1.6)", immediateRender: true }, at);
  const chars = masked(card.querySelector(".section-title"), "chars", splits);
  tl.fromTo(chars, { autoAlpha: 0, y: 34, scale: 0.4 }, { autoAlpha: 1, y: 0, scale: 1, duration: d * 0.7, stagger: { each: d * 0.035, from: "random" }, ease: "back.out(2.4)", immediateRender: true }, at + d * 0.05);
  tl.fromTo(card.querySelectorAll(":scope > .kicker, :scope > .lede"), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: d * 0.6, stagger: d * 0.12, ease: "power2.out", immediateRender: true }, at + d * 0.2);
  tl.fromTo(card.querySelectorAll(".ticks .tick"), { autoAlpha: 0, y: 26, scale: 0 }, { autoAlpha: 1, y: 0, scale: 1, duration: d * 0.8, stagger: d * 0.09, ease: "elastic.out(1, 0.5)", immediateRender: true }, at + d * 0.45);
}

/** Toolkit chips bubble up with an elastic pop when the toolkit beat arrives. */
function toolkitChips(tl: gsap.core.Timeline, range: Range, count: number) {
  const chips = document.querySelectorAll("#skills .beat:last-child .chip");
  if (!chips.length || count <= 0) return;
  const slice = (range.end - range.start) / count;
  const at = range.start + slice * (count - 1);
  tl.fromTo(chips, { autoAlpha: 0, y: 22, scale: 0.3 }, { autoAlpha: 1, y: 0, scale: 1, duration: slice * 0.4, stagger: { each: slice * 0.02, from: "random" }, ease: "elastic.out(1, 0.55)", immediateRender: false }, at + slice * 0.05);
}

/** Approach: a current-line draws down the card's edge, the title is wiped in
 * left to right, and the numbered steps line up along the line one after another. */
function approachIntro(tl: gsap.core.Timeline, range: Range, splits: Split[]) {
  const card = document.querySelector("#approach .card");
  if (!card) return;
  const d = introLength(range);
  const at = range.start;
  tl.fromTo(card.querySelector(".draw-line"), { scaleY: 0 }, { scaleY: 1, duration: d * 1.1, ease: "power2.inOut", immediateRender: true }, at);
  tl.fromTo(card.querySelector(".kicker"), { autoAlpha: 0, x: -16 }, { autoAlpha: 1, x: 0, duration: d * 0.5, ease: "power2.out", immediateRender: true }, at + d * 0.1);
  const words = masked(card.querySelector(".section-title"), "words", splits);
  tl.fromTo(words, { clipPath: "inset(0 100% 0 0)", x: -12 }, { clipPath: "inset(0 0% 0 0)", x: 0, duration: d * 0.7, stagger: d * 0.12, ease: "power3.inOut", immediateRender: true }, at + d * 0.2);
  tl.fromTo(card.querySelector(".lede"), { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: d * 0.8, ease: "power2.inOut", immediateRender: true, clearProps: "clipPath" }, at + d * 0.4);
  tl.fromTo(card.querySelectorAll(".ticks .tick"), { autoAlpha: 0, x: -28, rotate: -90 }, { autoAlpha: 1, x: 0, rotate: 0, duration: d * 0.6, stagger: d * 0.14, ease: "power3.out", immediateRender: true }, at + d * 0.55);
}

/** Contact: a curtain of current. The panel unfurls top-down with a gentle sway,
 * then its contents settle in from the side. */
function contactIntro(tl: gsap.core.Timeline, range: Range) {
  const card = document.querySelector<HTMLElement>("#contact .card");
  if (!card) return;
  const d = introLength(range);
  const at = range.start;
  tl.fromTo(card, { clipPath: "inset(0% 0% 100% 0% round 28px)", x: -40, rotation: 0, skewX: 0, skewY: 0 }, { clipPath: "inset(0% 0% 0% 0% round 28px)", x: 0, rotation: 0, skewX: 0, skewY: 0, duration: d * 1.1, ease: "power3.inOut", immediateRender: true, clearProps: "clipPath" }, at);
  tl.fromTo(card.querySelectorAll(":scope > :not(.contact-grid), .contact-col"), { autoAlpha: 0, x: -22 }, { autoAlpha: 1, x: 0, duration: d * 0.55, stagger: d * 0.06, ease: "sine.out", immediateRender: true }, at + d * 0.35);
}

/** Socials drift up out of open water one by one; scrubbed, so they sink back on scroll-up. */
function socialRail(tl: gsap.core.Timeline, range: { start: number; end: number }, reduced: boolean) {
  const rail = document.querySelector<HTMLElement>("#contact .social-rail");
  if (!rail || range.end <= range.start) return;
  const items = [rail.querySelector(".social-rail-title"), ...rail.querySelectorAll(".social")].filter(Boolean);
  const span = range.end - range.start;
  const at = range.start + (reduced ? 0 : Math.min(0.02, span * 0.12));
  const each = reduced ? 0.0001 : Math.min(0.022, span * 0.14);
  tl.fromTo(
    items,
    { autoAlpha: 0, y: reduced ? 0 : 34, filter: reduced ? "none" : "blur(8px)" },
    {
      autoAlpha: 1,
      y: 0,
      filter: "blur(0px)",
      duration: each,
      stagger: reduced ? 0 : each * 0.45,
      ease: "power3.out",
      immediateRender: true,
      clearProps: "filter",
    },
    at,
  );
}

export function mountDiveTimeline(options: {
  bar: HTMLElement | null;
  progressbar: HTMLElement | null;
  onScene: (scene: Scene) => void;
}) {
  const splits: Split[] = [];
  let ctx: gsap.Context | null = null;

  const last = { project: -1, skill: -1, approach: -1, zone: "" };
  let workRange: Range = { start: 0, end: 0 };
  const publish = (progress: number, force = false) => {
    const ranges = reefScroll.ranges;
    const byId = (id: string) => ranges.find((range) => range.id === id);
    const project = workGroupAt(progress, workRange, WORK_GROUPS);
    const skill = beatIndex(progress, byId("skills"), SKILL_BEATS);
    const approach = beatIndex(progress, byId("approach"), APPROACH.length);
    const zone = zoneAt(progress, ranges);
    // Only touch the DOM / React when a beat actually changes, not on every scroll tick.
    if (!force && project === last.project && skill === last.skill && approach === last.approach && zone === last.zone) return;
    if (force || project !== last.project) markCurrent("work", project);
    if (force || skill !== last.skill) placeSolo("skills", skill);
    if (force || approach !== last.approach) placeSolo("approach", approach);
    Object.assign(last, { project, skill, approach, zone });
    options.onScene({
      zone,
      project,
      skill,
      approach,
      progress,
    });
  };

  const build = () => {
    ctx?.revert();
    splits.splice(0).forEach((split) => split.revert());
    const reduced = reefScroll.reducedMotion;
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const spans = {
      top: zoneSpan("top", max),
      about: zoneSpan("about", max),
      work: zoneSpan("work", max),
      skills: zoneSpan("skills", max),
      approach: zoneSpan("approach", max),
      contact: zoneSpan("contact", max),
    };

    // Visual ranges: fades run half a screen past each pinned span, while the section is
    // still rising in or scrolling out, so one section's exit meets the next one's entrance.
    const pad = (window.innerHeight * 0.5) / max;
    const widen = (range: Range) => ({ start: Math.max(0, range.start - pad), end: Math.min(1, range.end + pad) });
    const vis = {
      top: { start: 0, end: Math.min(1, spans.top.end + pad) },
      about: widen(spans.about),
      work: widen(spans.work),
      skills: widen(spans.skills),
      approach: { start: Math.max(0, spans.approach.start - pad), end: Math.min(spans.contact.start + pad * 0.5, spans.approach.end + pad) },
    };

    workRange = vis.work;
    // Let the field linger a touch so its fade meets Skills' entrance.
    const workLate = pad * 0.3;

    // Fully-visible windows in px, for the gentle snap in smooth.ts.
    const px = (t: number) => t * max;
    reefScroll.holds = [
      { id: "top", start: 0, end: px(vis.top.end - edgeOut(vis.top)) },
      { id: "about", start: px(vis.about.start + edgeIn(vis.about)), end: px(vis.about.end - edgeOut(vis.about)) },
      ...workSlices(vis.work, WORK_GROUPS).map((slice) => ({
        id: "work",
        start: px(slice.settled),
        end: px(slice.last ? vis.work.end - workExit(vis.work) + workLate : slice.exit),
      })),
      { id: "skills", start: px(vis.skills.start + edgeIn(vis.skills)), end: px(vis.skills.end - edgeOut(vis.skills, SKILL_BEATS)) },
      { id: "approach", start: px(vis.approach.start + edgeIn(vis.approach)), end: px(vis.approach.end - edgeOut(vis.approach, APPROACH.length)) },
      { id: "contact", start: px(spans.contact.start + edgeIn(spans.contact)), end: max },
    ];

    ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: document.documentElement,
          start: "top top",
          end: "max",
          // Lenis already smooths wheel input, so a light scrub keeps text in step with the camera.
          scrub: reduced ? true : reefScroll.mobile ? 0.3 : 0.45,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            reefScroll.progress = self.progress;
            reefScroll.velocity = self.getVelocity();
            if (options.bar) options.bar.style.transform = `scaleX(${self.progress})`;
            if (options.progressbar) {
              options.progressbar.setAttribute("aria-valuenow", String(Math.round(self.progress * 100)));
            }
            publish(self.progress);
          },
        },
      });
      tl.to({}, { duration: 1 }, 0);

      const surface = document.querySelector("#top .card");
      if (surface) {
        const exit = reduced ? 0.0001 : edgeOut(vis.top);
        tl.to(surface, { autoAlpha: 0, y: reduced ? 0 : -24, duration: exit, ease: "power2.in" }, Math.max(0, vis.top.end - exit));
      }

      const custom = !reduced;
      fadeGroup(tl, "about", vis.about, reduced, false, custom);
      if (custom) aboutIntro(tl, vis.about, splits);

      scatterSequence(tl, vis.work, reduced, splits, workLate);
      fadeField(tl, vis.work, reduced, workLate);

      fadeGroup(tl, "skills", vis.skills, reduced, false, custom, SKILL_BEATS);
      soloSequence(tl, "skills", SKILL_BEATS, spans.skills, reduced, splits);
      if (custom) {
        skillsIntro(tl, vis.skills, splits);
        toolkitChips(tl, spans.skills, SKILL_BEATS);
      }

      fadeGroup(tl, "approach", vis.approach, reduced, false, custom, APPROACH.length);
      soloSequence(tl, "approach", APPROACH.length, spans.approach, reduced, splits);
      if (custom) approachIntro(tl, vis.approach, splits);

      fadeGroup(tl, "contact", spans.contact, reduced, true, custom);
      if (custom) contactIntro(tl, spans.contact);
      socialRail(tl, spans.contact, reduced);
    });

    const progress = reefScroll.progress;
    publish(progress, true);
    ScrollTrigger.refresh();
  };

  const measureRanges = () => {
    const vh = window.innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    reefScroll.ranges = ["top", "about", "work", "skills", "approach", "contact"].map((id) => {
      const el = document.getElementById(id);
      if (!el || max <= 0) return { id, pinStart: 0, pinEnd: 0 } satisfies ZoneRange;
      const top = el.getBoundingClientRect().top + window.scrollY;
      let pinStart = top / max;
      let pinEnd = Math.max(pinStart, (top + el.offsetHeight - vh) / max);
      if (id === "contact") {
        pinStart = Math.min(pinStart, Math.max(0, (top - vh * 0.55) / max));
        pinEnd = 1;
      }
      return { id, pinStart, pinEnd };
    });
  };

  measureRanges();
  build();

  let resizeTimer = 0;
  const onResize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      measureRanges();
      build();
    }, 140);
  };
  window.addEventListener("resize", onResize);
  document.fonts?.ready.then(() => {
    measureRanges();
    build();
  }).catch(() => undefined);

  return () => {
    window.clearTimeout(resizeTimer);
    window.removeEventListener("resize", onResize);
    ctx?.revert();
    splits.splice(0).forEach((split) => split.revert());
  };
}
