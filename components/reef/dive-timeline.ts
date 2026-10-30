import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { APPROACH, PROJECTS, SKILLS } from "@/content/portfolio";
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

function markCurrent(id: string, index: number) {
  document.querySelectorAll<HTMLElement>(`#${id} .project-block`).forEach((el, beat) => {
    const on = beat === index;
    el.dataset.live = on ? "true" : "false";
    if (on) el.setAttribute("aria-current", "true");
    else el.removeAttribute("aria-current");
  });
}

function scatterSequence(
  tl: gsap.core.Timeline,
  range: { start: number; end: number },
  reduced: boolean,
) {
  const nodes = gsap.utils.toArray<HTMLElement>("#work .project-block");
  const count = nodes.length;
  if (!count || range.end <= range.start) return;
  const span = range.end - range.start;
  const reveal = span * 0.78;
  const slice = reveal / count;
  nodes.forEach((article, index) => {
    const at = range.start + slice * index;
    const fade = reduced ? 0.0001 : Math.max(slice * 0.8, 0.0001);
    tl.set(article, { autoAlpha: 0, y: reduced ? 0 : 18 }, 0);
    tl.to(article, { autoAlpha: 1, y: 0, duration: fade, ease: "power3.out" }, at);
  });
}

function fadeField(
  tl: gsap.core.Timeline,
  range: { start: number; end: number },
  reduced: boolean,
) {
  const field = document.querySelector<HTMLElement>("#work .work-field");
  if (!field || range.end <= range.start) return;
  const leave = reduced ? 0.0001 : Math.min(0.05, (range.end - range.start) * 0.14);
  tl.fromTo(
    field,
    { autoAlpha: 1 },
    { autoAlpha: 0, duration: leave, ease: "power2.in", immediateRender: false },
    Math.max(range.start, range.end - leave),
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
) {
  const card = document.querySelector<HTMLElement>(`#${id} .card`);
  if (!card || range.end <= range.start) return;
  // Sections with their own intro only fade the shell in; the intro supplies the motion.
  const lift = custom ? 0 : 26;
  const enter = reduced ? 0.0001 : Math.min(0.028, (range.end - range.start) * 0.18);
  const exit = reduced ? 0.0001 : Math.min(0.034, (range.end - range.start) * 0.2);
  if (range.start > 0.002) {
    tl.set(card, { autoAlpha: 0, y: reduced ? 0 : lift }, 0);
    tl.to(card, { autoAlpha: 1, y: 0, duration: custom ? enter * 0.35 : enter, ease: "power2.out" }, range.start);
  }
  if (!hold) {
    const slice = Math.max((range.end - range.start) / 14, 0.0001);
    const leave = reduced ? 0.0001 : Math.min(exit, slice * 0.4);
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

type Range = { start: number; end: number };

const introLength = (range: Range) => Math.min(0.03, (range.end - range.start) * 0.2);

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
  tl.fromTo(card, { clipPath: "inset(0% 0% 100% 0% round 28px)", x: -40, skewY: 2.5 }, { clipPath: "inset(0% 0% 0% 0% round 28px)", x: 0, skewY: 0, duration: d * 1.1, ease: "power3.inOut", immediateRender: true, clearProps: "clipPath" }, at);
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
  const publish = (progress: number, force = false) => {
    const ranges = reefScroll.ranges;
    const byId = (id: string) => ranges.find((range) => range.id === id);
    const project = beatIndex(progress, byId("work"), PROJECTS.length);
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
        const exit = reduced ? 0.0001 : Math.min(0.03, (spans.top.end - spans.top.start) * 0.28);
        tl.to(surface, { autoAlpha: 0, y: reduced ? 0 : -24, duration: exit, ease: "power2.in" }, Math.max(0, spans.top.end - exit));
      }

      const custom = !reduced;
      fadeGroup(tl, "about", spans.about, reduced, false, custom);
      if (custom) aboutIntro(tl, spans.about, splits);

      scatterSequence(tl, spans.work, reduced);
      fadeField(tl, spans.work, reduced);

      fadeGroup(tl, "skills", spans.skills, reduced, false, custom);
      soloSequence(tl, "skills", SKILL_BEATS, spans.skills, reduced, splits);
      if (custom) {
        skillsIntro(tl, spans.skills, splits);
        toolkitChips(tl, spans.skills, SKILL_BEATS);
      }

      fadeGroup(tl, "approach", spans.approach, reduced, false, custom);
      soloSequence(tl, "approach", APPROACH.length, spans.approach, reduced, splits);
      if (custom) approachIntro(tl, spans.approach, splits);

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
