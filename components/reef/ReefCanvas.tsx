"use client";

import { Component, type ReactNode, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import ReefWorld from "./ReefWorld";

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
}: {
  mobile: boolean;
  reduced: boolean;
}) {
  const shell = useRef<HTMLDivElement>(null);

  return (
    <div ref={shell} className="reef-canvas" aria-hidden="true">
      <Boundary>
        <Canvas
          dpr={mobile ? [1, 1.2] : [1, 1.5]}
          gl={{
            antialias: !mobile,
            alpha: false,
            powerPreference: "high-performance",
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
          }}
        >
          <ReefWorld mobile={mobile} reduced={reduced} />
        </Canvas>
      </Boundary>
    </div>
  );
}
