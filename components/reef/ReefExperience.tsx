"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import {
  APPROACH,
  INTRO_POINTS,
  PROFILE,
  PROJECTS,
  SKILLS,
  SOCIALS,
  TOOLKIT,
  VALUES,
  ZONES,
} from "@/content/portfolio";
import { mountDiveTimeline } from "./dive-timeline";
import { playIntro } from "./intro";
import { mountSmoothScroll } from "./smooth";
import { mountInteractions } from "./interactions";
import { reefScroll, scrollToBeat, scrollToId } from "./scroll";
import { detectTier, type PerfTier } from "./perf";
import { playSectionCue, trackPointer } from "./ambient";
import AmbientControls from "./AmbientControls";
import CaseStudy, { projectSlug } from "./CaseStudy";
import "./reef.css";

const ReefCanvas = dynamic(() => import("./ReefCanvas"), {
  ssr: false,
  loading: () => null,
});

const SKILL_BEATS = SKILLS.length + 1;

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function ReefExperience({ hasResume = false }: { hasResume?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const introPlayed = useRef(false);
  // Resolves once the WebGL scene has painted its first frames, or after a fallback timeout.
  const [sceneGate] = useState(() => {
    let resolve = () => {};
    const promise = new Promise<void>((done) => {
      resolve = done;
    });
    return { promise, resolve };
  });
  const bar = useRef<HTMLSpanElement>(null);
  const progress = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const [tier, setTier] = useState<PerfTier | null>(null);
  const [active, setActive] = useState("top");
  const [projectIndex, setProjectIndex] = useState(0);
  const [skillIndex, setSkillIndex] = useState(0);
  const [approachIndex, setApproachIndex] = useState(0);
  const [year, setYear] = useState("2026");
  const cueZone = useRef<string | null>(null);

  // Soft chime/bubble cue when a new section is entered (no-op unless ocean sound is on).
  useEffect(() => {
    if (cueZone.current !== null && cueZone.current !== active) playSectionCue(active);
    cueZone.current = active;
  }, [active]);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const narrow = window.matchMedia("(max-width: 800px)");
    const apply = () => {
      reefScroll.reducedMotion = motion.matches;
      reefScroll.mobile = narrow.matches;
      setReduced(motion.matches);
      setMobile(narrow.matches);
      setWebgl(supportsWebGL());
      setYear(String(new Date().getFullYear()));
      setReady(true);
    };
    apply();
    motion.addEventListener("change", apply);
    narrow.addEventListener("change", apply);
    return () => {
      motion.removeEventListener("change", apply);
      narrow.removeEventListener("change", apply);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    detectTier().then((next) => {
      if (!alive) return;
      document.documentElement.dataset.perfTier = next;
      setTier(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const unsmooth = mountSmoothScroll(reduced);
    const untrack = trackPointer();
    const hash = window.location.hash.replace("#", "");
    if (ZONES.some((zone) => zone.id === hash)) scrollToId(hash);
    const unmount = mountDiveTimeline({
      bar: bar.current,
      progressbar: progress.current,
      onScene: (scene) => {
        setActive((prev) => (prev === scene.zone ? prev : scene.zone));
        setProjectIndex((prev) => (prev === scene.project ? prev : scene.project));
        setSkillIndex((prev) => (prev === scene.skill ? prev : scene.skill));
        setApproachIndex((prev) => (prev === scene.approach ? prev : scene.approach));
      },
    });
    return () => {
      unmount();
      unsmooth();
      untrack();
    };
  }, [ready, reduced, mobile]);

  useGSAP(
    () => {
      if (!ready || !root.current || introPlayed.current) return;
      introPlayed.current = true;
      return playIntro(root.current, sceneGate.promise);
    },
    { dependencies: [ready], scope: root },
  );

  useEffect(() => {
    if (!ready) return;
    if (!webgl) sceneGate.resolve();
    const fallback = window.setTimeout(sceneGate.resolve, 6000);
    return () => window.clearTimeout(fallback);
  }, [ready, webgl, sceneGate]);

  useGSAP(
    () => {
      if (!ready || !root.current) return;
      return mountInteractions(root.current);
    },
    { dependencies: [ready, reduced, mobile], scope: root },
  );

  const scene = ZONES.find((zone) => zone.id === active) ?? ZONES[0];
  const readout =
    active === "work"
      ? `${scene.scene} · ${String(projectIndex + 1).padStart(2, "0")} / ${String(PROJECTS.length).padStart(2, "0")}`
      : scene.scene;

  return (
    <div className="reef" ref={root}>
      <div className="intro-veil" role="status" aria-live="polite" aria-label="Loading the reef">
        <p className="intro-mark">
          {PROFILE.brand.split("").map((letter, index) => (
            <span key={index}>{letter === " " ? "\u00a0" : letter}</span>
          ))}
        </p>
        <span className="intro-loader">
          <span className="intro-loader-bar" />
          <span className="intro-loader-label">Diving in</span>
        </span>
      </div>
      <div className="cursor-aura" aria-hidden="true" />
      <div className="reef-grain" aria-hidden="true" />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div
        ref={progress}
        className="dive-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
        aria-label="Dive progress"
      >
        <span ref={bar} />
      </div>
      <span id="new-tab-note" hidden>
        Opens in a new tab
      </span>
      {/* Painted ocean shown under the canvas, and on its own when WebGL is unavailable. */}
      <div className={webgl ? "reef-fallback" : "reef-fallback is-static"} aria-hidden="true">
        <span className="reef-fallback-rays" />
        <span className="reef-fallback-floor" />
      </div>
      <div className="reef-vignette" aria-hidden="true" />
      {ready && webgl && tier ? (
        <ReefCanvas key={`${mobile ? "mobile" : "desktop"}-${tier}`} mobile={mobile} reduced={reduced} tier={tier} onReady={sceneGate.resolve} />
      ) : null}
      <header className="nav-wrap">
        <div className="nav">
          <a
            className="brand"
            href="#top"
            aria-label={`${PROFILE.brand}, back to top`}
            onClick={(event) => {
              event.preventDefault();
              scrollToId("top");
            }}
          >
            <span className="brand-name">{PROFILE.brand}</span>
            <span className="brand-tag">{PROFILE.navTagline}</span>
          </a>
          <nav className="nav-links" aria-label="Primary">
            {ZONES.filter((zone) => zone.nav).map((zone) => (
              <a
                key={zone.id}
                href={`#${zone.id}`}
                aria-current={active === zone.id ? "true" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  scrollToId(zone.id);
                }}
              >
                {zone.nav}
              </a>
            ))}
          </nav>
          <AmbientControls />
          <a className="nav-book" href={PROFILE.calendly} target="_blank" aria-describedby="new-tab-note" rel="noreferrer">
            Book a call
          </a>
        </div>
        <p className="depth-readout" aria-live="polite">
          {readout}
        </p>
      </header>
      <main className="reef-main" id="main">
        <section id="top" className="zone zone--scrub" style={{ ["--weight" as string]: ZONES[0].weight }}>
          <div className="pin">
            <div className="card">
              <p className="who">{PROFILE.name}</p>
              <p className="kicker">{PROFILE.role}</p>
              <h1 className="hero-title">{PROFILE.title}</h1>
              <p className="mantra">{PROFILE.mantra}</p>
              <p>{PROFILE.summary}</p>
              <div className="actions">
                <a
                  className="button button--primary"
                  href="#work"
                  onClick={(event) => {
                    event.preventDefault();
                    scrollToId("work");
                  }}
                >
                  View selected work
                </a>
                <a className="button button--ghost" href={PROFILE.calendly} target="_blank" aria-describedby="new-tab-note" rel="noreferrer">
                  Book a call
                </a>
                {hasResume ? (
                  <a className="button button--ghost" href="/resume.pdf" target="_blank" aria-describedby="new-tab-note" rel="noreferrer">
                    Resume <span aria-hidden="true">↗</span>
                  </a>
                ) : null}
              </div>
              <div className="chips" style={{ marginTop: "0.9rem" }}>
                {VALUES.map((value) => (
                  <span className="chip" key={value}>
                    {value}
                  </span>
                ))}
              </div>
              <p className="dive-hint">
                Scroll to dive <span className="chev">↓</span>
              </p>
            </div>
          </div>
        </section>

        <section id="about" className="zone zone--scrub" style={{ ["--weight" as string]: ZONES[1].weight }}>
          <div className="pin">
            <div className="card">
              <p className="kicker">About</p>
              <h2 className="section-title">About</h2>
              <p>{PROFILE.summary}</p>
              <p>{PROFILE.now}</p>
              <p className="muted">{PROFILE.motto}</p>
              <div className="chips">
                {VALUES.map((value) => (
                  <span className="chip" key={value}>
                    {value}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="work" className="zone zone--scrub" style={{ ["--weight" as string]: ZONES[2].weight }}>
          <div className="pin pin--field">
            <div className="work-field">
              <h2 className="sr-only">{PROFILE.workTitle}</h2>
              {PROJECTS.map((project) => (
                <article key={project.name} className="project-block" data-flip-id={`project-${projectSlug(project)}`}>
                  <p className="badge">{project.badge}</p>
                  <h3>{project.name}</h3>
                  <p className="project-copy">{project.description}</p>
                  <p className="muted project-note">{project.highlight}</p>
                  <div className="project-links">
                    <button type="button" className="text-link case-open" data-case={projectSlug(project)} aria-haspopup="dialog">
                      Case study <span aria-hidden="true">→</span>
                    </button>
                    {project.links.map((link) => (
                      <a
                        key={link.href}
                        className="text-link"
                        href={link.href}
                        target="_blank" aria-describedby="new-tab-note"
                        rel="noreferrer"
                        aria-label={`${link.label}: ${project.name}`}
                      >
                        {link.label} <span aria-hidden="true">↗</span>
                      </a>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="skills" className="zone zone--scrub" style={{ ["--weight" as string]: ZONES[3].weight }}>
          <div className="pin">
            <div className="card">
              <p className="kicker">{PROFILE.skillsTitle}</p>
              <h2 className="section-title">{PROFILE.skillsTitle}</h2>
              <p className="lede">{PROFILE.skillsLede}</p>
              <div className="stack">
                {SKILLS.map((group) => (
                  <article key={group.title} className="beat">
                    <h3>{group.title}</h3>
                    <ul>
                      {group.points.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  </article>
                ))}
                <article className="beat">
                  <h3>{PROFILE.toolkitTitle}</h3>
                  <div className="chips">
                    {TOOLKIT.map((tool) => (
                      <span className="chip" key={tool}>
                        {tool}
                      </span>
                    ))}
                  </div>
                  <p>{PROFILE.toolkitNote}</p>
                  <p>
                    <a className="text-link" href={PROFILE.github} target="_blank" aria-describedby="new-tab-note" rel="noreferrer">
                      {PROFILE.githubActivity} <span aria-hidden="true">↗</span>
                    </a>
                  </p>
                </article>
              </div>
              <div className="ticks">
                {[...SKILLS.map((group) => group.title), PROFILE.toolkitTitle].map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    className="tick"
                    aria-pressed={skillIndex === index}
                    aria-label={label}
                    onClick={() => scrollToBeat("skills", index, SKILL_BEATS)}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="approach" className="zone zone--scrub" style={{ ["--weight" as string]: ZONES[4].weight }}>
          <div className="pin">
            <div className="card">
              <span className="draw-line" aria-hidden="true" />
              <p className="kicker">{PROFILE.approachTitle}</p>
              <h2 className="section-title">{PROFILE.approachTitle}</h2>
              <p className="lede">{PROFILE.approachLede}</p>
              <div className="stack">
                {APPROACH.map((item) => (
                  <article key={item.title} className="beat">
                    <p className="badge">{item.index}</p>
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </article>
                ))}
              </div>
              <div className="ticks">
                {APPROACH.map((item, index) => (
                  <button
                    key={item.title}
                    type="button"
                    className="tick"
                    aria-pressed={approachIndex === index}
                    aria-label={item.title}
                    onClick={() => scrollToBeat("approach", index, APPROACH.length)}
                  >
                    {item.index}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="contact" className="zone zone--flow">
          <div className="pin">
            <div className="card">
              <p className="kicker">{PROFILE.contactTitle}</p>
              <h2 className="section-title">{PROFILE.contactTitle}</h2>
              <p className="lede">{PROFILE.contactLede}</p>
              <div className="contact-grid">
              <div className="contact-col">
              <p className="badge">{PROFILE.emailBadge}</p>
              <h3>{PROFILE.emailLabel}</h3>
              <p>
                <a className="email-link" href={`mailto:${PROFILE.email}`}>
                  {PROFILE.email}
                </a>
              </p>
              <p className="muted">{PROFILE.emailNote}</p>
              </div>
              <div className="contact-col">
              <p className="badge">{PROFILE.introBadge}</p>
              <h3>{PROFILE.introTitle}</h3>
              <ul>
                {INTRO_POINTS.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <div className="actions">
                <a className="button button--primary" href={PROFILE.calendly} target="_blank" aria-describedby="new-tab-note" rel="noreferrer">
                  Schedule a call
                </a>
                <a
                  className="button button--ghost"
                  href="#top"
                  onClick={(event) => {
                    event.preventDefault();
                    scrollToId("top");
                  }}
                >
                  Back to top
                </a>
                {hasResume ? (
                  <a className="button button--ghost" href="/resume.pdf" target="_blank" aria-describedby="new-tab-note" rel="noreferrer">
                    Resume <span aria-hidden="true">↗</span>
                  </a>
                ) : null}
              </div>
              </div>
              </div>
              <footer className="closing">
                <p className="kicker">{PROFILE.footerBrand}</p>
                <h2 className="closing-title">{PROFILE.closingTitle}</h2>
                <p>{PROFILE.closingBody}</p>
                <p className="fine-print">
                  © {year} {PROFILE.footerNote}
                </p>
              </footer>
            </div>
            <aside className="social-rail" aria-label={PROFILE.socialTitle}>
                <h3 className="social-rail-title">{PROFILE.socialTitle}</h3>
                <div className="socials">
                  {SOCIALS.map((social) => (
                    <a key={social.label} className="social" href={social.href} target="_blank" aria-describedby="new-tab-note" rel="noreferrer">
                      <strong>
                        {social.label} · {social.handle}
                      </strong>
                      <span className="muted">{social.note}</span>
                    </a>
                  ))}
                </div>
            </aside>
          </div>
        </section>
      </main>
      <CaseStudy reduced={reduced} />
    </div>
  );
}
