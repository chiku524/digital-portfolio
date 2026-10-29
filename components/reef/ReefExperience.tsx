"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
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
import { reefScroll, scrollToBeat, scrollToId } from "./scroll";
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

export default function ReefExperience() {
  const bar = useRef<HTMLSpanElement>(null);
  const progress = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const [active, setActive] = useState("top");
  const [projectIndex, setProjectIndex] = useState(0);
  const [skillIndex, setSkillIndex] = useState(0);
  const [approachIndex, setApproachIndex] = useState(0);
  const [year, setYear] = useState("2026");

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
    if (!ready) return;
    const hash = window.location.hash.replace("#", "");
    if (ZONES.some((zone) => zone.id === hash)) scrollToId(hash);
    return mountDiveTimeline({
      bar: bar.current,
      progressbar: progress.current,
      onScene: (scene) => {
        setActive((prev) => (prev === scene.zone ? prev : scene.zone));
        setProjectIndex((prev) => (prev === scene.project ? prev : scene.project));
        setSkillIndex((prev) => (prev === scene.skill ? prev : scene.skill));
        setApproachIndex((prev) => (prev === scene.approach ? prev : scene.approach));
      },
    });
  }, [ready, reduced, mobile]);

  const scene = ZONES.find((zone) => zone.id === active) ?? ZONES[0];
  const readout =
    active === "work"
      ? `${scene.scene} · ${String(projectIndex + 1).padStart(2, "0")} / ${String(PROJECTS.length).padStart(2, "0")}`
      : scene.scene;

  return (
    <div className="reef">
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
      <div className="reef-vignette" aria-hidden="true" />
      {ready && webgl ? (
        <ReefCanvas key={mobile ? "mobile" : "desktop"} mobile={mobile} reduced={reduced} />
      ) : null}
      <header className="nav-wrap">
        <div className="nav">
          <a
            className="brand"
            href="#top"
            onClick={(event) => {
              event.preventDefault();
              scrollToId("top");
            }}
          >
            <span className="brand-name">{PROFILE.brand}</span>
            <span className="brand-tag">{PROFILE.navTagline}</span>
          </a>
          <nav className="nav-links" aria-label="Sections">
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
          <a className="nav-book" href={PROFILE.calendly} target="_blank" rel="noreferrer">
            Book a call
          </a>
        </div>
        <p className="depth-readout">
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
                <a className="button button--ghost" href={PROFILE.calendly} target="_blank" rel="noreferrer">
                  Book a call
                </a>
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
          <div className="pin">
            <div className="card">
              <div className="card-head">
                <p className="kicker">{PROFILE.workTitle}</p>
                <p className="index-label">
                  {String(projectIndex + 1).padStart(2, "0")} / {String(PROJECTS.length).padStart(2, "0")}
                </p>
              </div>
              <h2 className="section-title">{PROFILE.workTitle}</h2>
              <p className="lede">{PROFILE.workLede}</p>
              <div className="stack">
                {PROJECTS.map((project) => (
                  <article key={project.name} className="beat">
                    <p className="badge">{project.badge}</p>
                    <h3>{project.name}</h3>
                    <p>{project.description}</p>
                    <p className="muted">{project.highlight}</p>
                    <div className={project.links.length > 2 ? "chips" : "links"}>
                      {project.links.map((link, linkIndex) => (
                        <a
                          key={link.href}
                          className={project.links.length > 2 || linkIndex > 0 ? "text-link" : "button button--primary"}
                          href={link.href}
                          target="_blank"
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
              <div className="ticks" aria-label="Projects">
                {PROJECTS.map((project, index) => (
                  <button
                    key={project.name}
                    type="button"
                    className="tick"
                    data-index={index}
                    aria-pressed={index === projectIndex}
                    aria-label={project.name}
                    onClick={() => scrollToBeat("work", index, PROJECTS.length)}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </button>
                ))}
              </div>
              <div className="pager">
                <button
                  type="button"
                  disabled={projectIndex === 0}
                  onClick={() => scrollToBeat("work", projectIndex - 1, PROJECTS.length)}
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={projectIndex === PROJECTS.length - 1}
                  onClick={() => scrollToBeat("work", projectIndex + 1, PROJECTS.length)}
                >
                  Next
                </button>
              </div>
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
                    <a className="text-link" href={PROFILE.github} target="_blank" rel="noreferrer">
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
              <p className="badge">{PROFILE.emailBadge}</p>
              <h3>{PROFILE.emailLabel}</h3>
              <p>
                <a className="email-link" href={`mailto:${PROFILE.email}`}>
                  {PROFILE.email}
                </a>
              </p>
              <p className="muted">{PROFILE.emailNote}</p>
              <h3>{PROFILE.socialTitle}</h3>
              <div className="socials">
                {SOCIALS.map((social) => (
                  <a key={social.label} className="social" href={social.href} target="_blank" rel="noreferrer">
                    <strong>
                      {social.label} · {social.handle}
                    </strong>
                    <span className="muted">{social.note}</span>
                  </a>
                ))}
              </div>
              <p className="badge">{PROFILE.introBadge}</p>
              <h3>{PROFILE.introTitle}</h3>
              <ul>
                {INTRO_POINTS.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <div className="actions">
                <a className="button button--primary" href={PROFILE.calendly} target="_blank" rel="noreferrer">
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
          </div>
        </section>
      </main>
    </div>
  );
}
