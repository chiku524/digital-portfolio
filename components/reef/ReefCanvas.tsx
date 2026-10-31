"use client";

import { Component, type ReactNode, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import ReefWorld from "./ReefWorld";
import { TIER_DPR, type PerfTier } from "./perf";

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

export default function ReefCanvas({
  mobile,
  reduced,
  tier,
  onReady,
}: {
  mobile: boolean;
  reduced: boolean;
  tier: PerfTier;
  onReady?: () => void;
}) {
  const shell = useRef<HTMLDivElement>(null);
  // Stop rendering entirely while the tab is hidden or the canvas is scrolled out of view.
  const [hidden, setHidden] = useState(false);
  const [offscreen, setOffscreen] = useState(false);
  useEffect(() => {
    const onVisibility = () => setHidden(document.visibilityState === "hidden");
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    let observer: IntersectionObserver | undefined;
    if (shell.current && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(([entry]) => setOffscreen(!entry.isIntersecting));
      observer.observe(shell.current);
    }
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      observer?.disconnect();
    };
  }, []);

  return (
    <div ref={shell} className="reef-canvas" aria-hidden="true">
      <Boundary>
        <Canvas
          dpr={mobile && tier === "high" ? TIER_DPR.mid : TIER_DPR[tier]}
          frameloop={hidden || offscreen ? "never" : "always"}
          gl={{
            antialias: !mobile && tier === "high",
            alpha: false,
            powerPreference: tier === "low" ? "low-power" : "high-performance",
            stencil: false,
          }}
          camera={{
            fov: mobile ? 56 : 46,
            near: 0.1,
            far: 96,
            position: [0, 8.9, 12.2],
          }}
          onCreated={({ gl }) => {
            // Tone mapping is applied in the post-processing stack (see Effects).
            gl.toneMapping = THREE.NoToneMapping;
            gl.toneMappingExposure = 1.08;
            gl.setClearColor("#9fd4d4");
            gl.domElement.tabIndex = -1;
            shell.current?.classList.add("is-ready");
            // Wait two frames so the first real render is on screen before announcing readiness.
            requestAnimationFrame(() => requestAnimationFrame(() => onReady?.()));
          }}
        >
          <ReefWorld mobile={mobile} reduced={reduced} tier={tier} />
        </Canvas>
      </Boundary>
    </div>
  );
}
