"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { PROJECTS, type Project } from "@/content/portfolio";
import { getLenis } from "./smooth";
import { trackEvent } from "@/lib/track";

gsap.registerPlugin(Flip);

export const projectSlug = (project: Project) =>
  project.slug ?? project.name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const bySlug = (slug: string | null) => (slug ? PROJECTS.findIndex((p) => projectSlug(p) === slug) : -1);
const readSlug = () => new URLSearchParams(window.location.search).get("project");
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * In-page case-study dialog. Opened by any [data-case] button inside a
 * .project-block; mirrors state into ?project=slug so Back/links work.
 */
export default function CaseStudy({ reduced }: { reduced: boolean }) {
  const [index, setIndex] = useState(-1);
  const panelRef = useRef<HTMLDivElement>(null);
  const flipState = useRef<Flip.FlipState | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const pushed = useRef(false);
  const open = index >= 0;
  const project = open ? PROJECTS[index] : null;

  const openAt = useCallback((i: number, source?: HTMLElement | null) => {
    if (i < 0) return;
    const article = source?.closest<HTMLElement>(".project-block") ?? null;
    flipState.current = article && !reduced ? Flip.getState(article) : null;
    returnFocus.current = source ?? null;
    const url = new URL(window.location.href);
    url.searchParams.set("project", projectSlug(PROJECTS[i]));
    window.history.pushState({ caseStudy: true }, "", url);
    pushed.current = true;
    trackEvent("case_study_open", { project: PROJECTS[i].name });
    setIndex(i);
  }, [reduced]);

  const close = useCallback(() => {
    if (pushed.current) {
      window.history.back(); // popstate clears the state
    } else {
      const url = new URL(window.location.href);
      url.searchParams.delete("project");
      window.history.replaceState(null, "", url);
      setIndex(-1);
    }
  }, []);

  // Deep link + back/forward sync.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync from URL on mount
    setIndex(bySlug(readSlug()));
    const onPop = () => {
      pushed.current = false;
      setIndex(bySlug(readSlug()));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Delegated openers.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const btn = (event.target as Element | null)?.closest<HTMLElement>("[data-case]");
      if (!btn) return;
      event.preventDefault();
      openAt(bySlug(btn.dataset.case ?? null), btn);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [openAt]);

  // Enter animation (Flip from the card, or a fade).
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;
    const backdrop = panel.parentElement;
    if (flipState.current) {
      Flip.from(flipState.current, { targets: panel, duration: 0.65, ease: "power3.inOut", absolute: true, scale: false });
      gsap.from(panel.querySelectorAll(".case-body > *"), { opacity: 0, y: 14, duration: 0.45, stagger: 0.04, delay: 0.3, ease: "power2.out" });
    } else {
      gsap.from(panel, { opacity: 0, y: reduced ? 0 : 18, duration: reduced ? 0.15 : 0.35, ease: "power2.out" });
    }
    if (backdrop) gsap.from(backdrop, { backgroundColor: "rgba(2,10,14,0)", duration: 0.4 });
    flipState.current = null;
  }, [open, index, reduced]);

  // Modal behaviour: lock scroll, inert background, focus trap, Esc.
  useEffect(() => {
    if (!open) return;
    const lenis = getLenis();
    lenis?.stop();
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    const background = Array.from(document.querySelectorAll<HTMLElement>("body > *:not(.case-layer)"));
    background.forEach((el) => el.setAttribute("inert", ""));
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>(".case-close")?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      } else if (event.key === "Tab" && panel) {
        const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      background.forEach((el) => el.removeAttribute("inert"));
      root.style.overflow = prevOverflow;
      lenis?.start();
      returnFocus.current?.focus({ preventScroll: true });
    };
  }, [open, close]);

  if (!project) return null;
  const step = (dir: number) => {
    const next = (index + dir + PROJECTS.length) % PROJECTS.length;
    const url = new URL(window.location.href);
    url.searchParams.set("project", projectSlug(PROJECTS[next]));
    window.history.replaceState(window.history.state, "", url);
    setIndex(next);
  };

  return createPortal(
    <div className="case-layer" onClick={(e) => e.target === e.currentTarget && close()}>
      <div
        ref={panelRef}
        className="case-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="case-title"
        data-flip-id={`project-${projectSlug(project)}`}
      >
        <button type="button" className="case-close" onClick={close} aria-label="Close case study">
          <span aria-hidden="true">✕</span>
        </button>
        <div className="case-body">
          <p className="badge">{project.badge}{project.year ? ` · ${project.year}` : ""}</p>
          <h2 id="case-title" className="case-title">{project.name}</h2>
          {project.role ? <p className="kicker">{project.role}</p> : null}
          <p className="case-lede">{project.description}</p>
          <div className="case-section">
            <h3>Highlights</h3>
            <p>{project.highlight}</p>
          </div>
          {project.outcomes?.length ? (
            <div className="case-section">
              <h3>Outcomes</h3>
              <ul>{project.outcomes.map((o) => <li key={o}>{o}</li>)}</ul>
            </div>
          ) : null}
          {project.stack?.length ? (
            <div className="chips">{project.stack.map((s) => <span className="chip" key={s}>{s}</span>)}</div>
          ) : null}
          <div className="case-links">
            {project.links.map((link) => (
              <a
                key={link.href}
                className="button button--primary"
                href={link.href}
                target="_blank"
                rel="noreferrer"
                aria-describedby="new-tab-note"
                data-track="project_click"
                data-track-project={project.name}
                data-track-link={link.label}
                data-track-from="case_study"
              >
                {link.label} <span aria-hidden="true">↗</span>
              </a>
            ))}
          </div>
          <nav className="case-nav" aria-label="More projects">
            <button type="button" className="button button--ghost" onClick={() => step(-1)}>
              ← {PROJECTS[(index - 1 + PROJECTS.length) % PROJECTS.length].name}
            </button>
            <button type="button" className="button button--ghost" onClick={() => step(1)}>
              {PROJECTS[(index + 1) % PROJECTS.length].name} →
            </button>
          </nav>
        </div>
      </div>
    </div>,
    document.body,
  );
}