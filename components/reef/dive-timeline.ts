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
  const start = top / max;
  const end = Math.max(start, (top + el.offsetHeight - window.innerHeight) / max);
  return { start, end };
}

function placeSolo(id: string, index: number) {
  document.querySelectorAll<HTMLElement>(`#${id} .beat`).forEach((el, beat) => {
    const on = beat === index;
    el.style.position = on ? "relative" : "absolute";
    el.inert = !on;
    if (on) el.removeAttribute("aria-hidden");
    else el.setAttribute("aria-hidden", "true");
  });
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
    if (index < count - 1) tl.set(article, { autoAlpha: 0 }, at + slice);
  });
}

function fadeGroup(
  tl: gsap.core.Timeline,
  id: string,
  range: { start: number; end: number },
  reduced: boolean,
  hold: boolean,
) {
  const card = document.querySelector<HTMLElement>(`#${id} .card`);
  if (!card || range.end <= range.start) return;
  const enter = reduced ? 0.0001 : Math.min(0.028, (range.end - range.start) * 0.18);
  const exit = reduced ? 0.0001 : Math.min(0.034, (range.end - range.start) * 0.2);
  if (range.start > 0.002) {
    tl.set(card, { autoAlpha: 0, y: reduced ? 0 : 26 }, 0);
    tl.to(card, { autoAlpha: 1, y: 0, duration: enter, ease: "power2.out" }, range.start);
  }
  if (!hold) {
    tl.to(
      card,
      { autoAlpha: 0, y: reduced ? 0 : -30, duration: exit, ease: "power2.in" },
      Math.max(range.start, range.end - exit),
    );
  } else if (range.start > 0.002) {
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

export function mountDiveTimeline(options: {
  bar: HTMLElement | null;
  progressbar: HTMLElement | null;
  onScene: (scene: Scene) => void;
}) {
  const splits: Split[] = [];
  let ctx: gsap.Context | null = null;

  const publish = (progress: number) => {
    const ranges = reefScroll.ranges;
    const byId = (id: string) => ranges.find((range) => range.id === id);
    const project = beatIndex(progress, byId("work"), PROJECTS.length);
    const skill = beatIndex(progress, byId("skills"), SKILL_BEATS);
    const approach = beatIndex(progress, byId("approach"), APPROACH.length);
    placeSolo("work", project);
    placeSolo("skills", skill);
    placeSolo("approach", approach);
    options.onScene({
      zone: zoneAt(progress, ranges),
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
          scrub: reduced ? true : reefScroll.mobile ? 0.35 : 0.6,
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

      fadeGroup(tl, "about", spans.about, reduced, false);
      if (!reduced) {
        tl.fromTo(
          "#about .card > *",
          { autoAlpha: 0, y: 16 },
          { autoAlpha: 1, y: 0, duration: 0.02, stagger: 0.004, ease: "power3.out", immediateRender: false },
          spans.about.start + 0.004,
        );
      }

      fadeGroup(tl, "work", spans.work, reduced, false);
      soloSequence(tl, "work", PROJECTS.length, spans.work, reduced, splits);

      fadeGroup(tl, "skills", spans.skills, reduced, false);
      soloSequence(tl, "skills", SKILL_BEATS, spans.skills, reduced, splits);

      fadeGroup(tl, "approach", spans.approach, reduced, false);
      soloSequence(tl, "approach", APPROACH.length, spans.approach, reduced, splits);

      fadeGroup(tl, "contact", spans.contact, reduced, true);
    });

    const progress = reefScroll.progress;
    publish(progress);
    ScrollTrigger.refresh();
  };

  const measureRanges = () => {
    const vh = window.innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    reefScroll.ranges = ["top", "about", "work", "skills", "approach", "contact"].map((id) => {
      const el = document.getElementById(id);
      if (!el || max <= 0) return { id, pinStart: 0, pinEnd: 0 } satisfies ZoneRange;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const pinStart = top / max;
      return { id, pinStart, pinEnd: Math.max(pinStart, (top + el.offsetHeight - vh) / max) };
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
