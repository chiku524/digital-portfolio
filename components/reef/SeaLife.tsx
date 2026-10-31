"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { oceanMotion, oceanTime } from "./materials";
import { uNight } from "./ambient";
import { reefScroll, zoneAt } from "./scroll";
import type { PerfTier } from "./perf";

/* ------------------------------------------------------------------ */
/* Shared GLSL                                                         */
/* ------------------------------------------------------------------ */

const VORONOI = /* glsl */ `
vec2 slHash(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}
vec2 slVoronoi(vec2 x) {
  vec2 n = floor(x);
  vec2 f = fract(x);
  float d1 = 8.0;
  float d2 = 8.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 r = g + slHash(n + g) - f;
      float d = dot(r, r);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
    }
  }
  return vec2(sqrt(d1), sqrt(d2));
}
`;

function tag(geo: THREE.BufferGeometry, part: number, pivot: [number, number, number] = [0, 0, 0], seed = 0) {
  const g = geo;
  const n = g.attributes.position.count;
  g.setAttribute("part", new THREE.BufferAttribute(new Float32Array(n).fill(part), 1));
  const piv = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 1) piv.set(pivot, i * 3);
  g.setAttribute("pivot", new THREE.BufferAttribute(piv, 3));
  g.setAttribute("seed", new THREE.BufferAttribute(new Float32Array(n).fill(seed), 1));
  return g;
}

/* ------------------------------------------------------------------ */
/* Sea turtle                                                          */
/* ------------------------------------------------------------------ */

// Parts: 0 shell, 1 head, 2/3 front flippers (+z/-z), 4/5 rear flippers (+z/-z). Head points +x.
function turtleGeometry(lite: boolean) {
  const seg = lite ? 18 : 30;
  const shell = new THREE.SphereGeometry(0.5, seg, Math.round(seg * 0.65));
  shell.scale(1.25, 0.36, 1.0);
  const pos = shell.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i);
    if (y < 0) pos.setY(i, y * 0.42);
    // Slight taper toward the tail and a raised keel line.
    const x = pos.getX(i);
    pos.setZ(i, pos.getZ(i) * (1 - Math.max(0, -x) * 0.18));
    if (y > 0) pos.setY(i, y * (1 + 0.12 * Math.exp(-pos.getZ(i) * pos.getZ(i) * 18)));
  }
  shell.computeVertexNormals();
  tag(shell, 0);

  const head = new THREE.SphereGeometry(0.15, 16, 12);
  head.scale(1.55, 0.82, 0.95);
  head.translate(0.8, 0.03, 0);
  tag(head, 1, [0.62, 0, 0]);

  const neck = new THREE.CylinderGeometry(0.1, 0.12, 0.2, 12, 1, true);
  neck.rotateZ(Math.PI / 2);
  neck.translate(0.64, 0.0, 0);
  tag(neck, 1, [0.62, 0, 0]);

  const flipper = (side: 1 | -1, front: boolean) => {
    const g = new THREE.SphereGeometry(0.5, 16, 10);
    if (front) {
      g.scale(0.22, 0.035, 0.62);
      g.translate(0, 0, 0.31 * side);
      g.rotateY(-0.55 * side);
      g.translate(0.32, -0.04, 0.34 * side);
      return tag(g, side > 0 ? 2 : 3, [0.34, -0.04, 0.32 * side]);
    }
    g.scale(0.2, 0.03, 0.26);
    g.translate(0, 0, 0.13 * side);
    g.rotateY(0.6 * side);
    g.translate(-0.52, -0.05, 0.24 * side);
    return tag(g, side > 0 ? 4 : 5, [-0.5, -0.05, 0.22 * side]);
  };

  const merged = mergeGeometries([
    shell,
    head,
    neck,
    flipper(1, true),
    flipper(-1, true),
    flipper(1, false),
    flipper(-1, false),
  ]);
  return merged!;
}

function turtleMaterial() {
  const mat = new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    roughness: 0.55,
    clearcoat: 0.5,
    clearcoatRoughness: 0.4,
    sheen: 0.3,
    sheenColor: new THREE.Color("#d8f0e8"),
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = oceanTime;
    shader.uniforms.uMotion = oceanMotion;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uTime;
        uniform float uMotion;
        attribute float part;
        attribute vec3 pivot;
        varying vec3 vLocal;
        varying float vPart;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vLocal = position;
        vPart = part;
        float stroke = uTime * 1.25;
        if (part > 1.5) {
          float side = (part < 2.5 || (part > 3.5 && part < 4.5)) ? 1.0 : -1.0;
          bool front = part < 3.5;
          float ang = (front ? sin(stroke) * 0.62 : sin(stroke + 1.3) * 0.28) * uMotion;
          vec3 q = transformed - pivot;
          float c = cos(ang * side);
          float s = sin(ang * side);
          q = vec3(q.x, c * q.y - s * q.z, s * q.y + c * q.z);
          float sw = front ? cos(stroke) * 0.32 * side * uMotion : 0.0;
          float c2 = cos(sw);
          float s2 = sin(sw);
          q = vec3(c2 * q.x + s2 * q.z, q.y, -s2 * q.x + c2 * q.z);
          transformed = q + pivot;
        } else if (part > 0.5) {
          transformed.y += sin(stroke * 0.5) * 0.012 * uMotion;
          transformed.z += sin(stroke * 0.35) * 0.015 * uMotion * smoothstep(0.62, 0.95, position.x);
        }`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vLocal;
        varying float vPart;
        vec3 vTint;
        ${VORONOI}`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        {
          vec3 p = vLocal;
          vec3 col;
          if (vPart < 0.5) {
            if (p.y < -0.015) {
              col = vec3(0.95, 0.82, 0.5); // plastron
            } else {
              // Hawksbill-style scutes: dark seams, amber centres radiating to olive edges.
              vec2 v = slVoronoi(vec2(p.x * 4.4, p.z * 5.2));
              float edge = v.y - v.x;
              float seam = smoothstep(0.015, 0.07, edge);
              float rays = 0.5 + 0.5 * sin(atan(p.z, p.x) * 11.0 + v.x * 18.0);
              vec3 olive = vec3(0.30, 0.34, 0.10);
              vec3 amber = vec3(0.92, 0.56, 0.16);
              vec3 umber = vec3(0.38, 0.18, 0.05);
              vec3 base = mix(olive, amber, smoothstep(0.55, 0.05, v.x));
              base = mix(base, umber, rays * 0.45 * smoothstep(0.1, 0.5, v.x));
              col = mix(vec3(0.10, 0.07, 0.03), base, seam);
            }
          } else {
            vec2 v = slVoronoi(vec2(p.x + p.y, p.z) * 11.0);
            float seam = smoothstep(0.0, 0.08, v.y - v.x);
            vec3 scale = mix(vec3(0.36, 0.30, 0.10), vec3(0.62, 0.46, 0.16), slHash(floor(vec2(p.x, p.z) * 11.0)).x);
            col = mix(vec3(0.95, 0.88, 0.62), scale, seam);
            if (p.y < -0.05) col = mix(col, vec3(0.95, 0.88, 0.66), 0.6);
          }
          diffuseColor.rgb = col;
          vTint = col;
        }`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        // Slight self-illumination so the blue water light doesn't wash the shell grey.
        totalEmissiveRadiance += vTint * 0.22;`,
      );
  };
  mat.customProgramCacheKey = () => "sea-turtle";
  return mat;
}

/* ------------------------------------------------------------------ */
/* Jellyfish                                                           */
/* ------------------------------------------------------------------ */

// Parts: 0 bell, 1 oral arms, 2 tentacles. Bell top at y = 0.42, rim at y ~ -0.05.
function jellyGeometry(lite: boolean) {
  const pts: THREE.Vector2[] = [];
  const N = lite ? 12 : 20;
  for (let i = 0; i <= N; i += 1) {
    const u = i / N;
    const r = 0.5 * Math.sin(u * Math.PI * 0.5) * (1 + 0.1 * u ** 4) + 0.001;
    const y = 0.42 * Math.cos(u * Math.PI * 0.5) - 0.05 * u ** 3;
    pts.push(new THREE.Vector2(r, y));
  }
  // Fold back under the rim so the bell has a thin inner wall.
  pts.push(new THREE.Vector2(0.44, -0.02), new THREE.Vector2(0.3, 0.06));
  const bell = new THREE.LatheGeometry(pts, lite ? 20 : 36);
  tag(bell, 0);

  const parts: THREE.BufferGeometry[] = [bell];
  const arms = lite ? 3 : 4;
  for (let i = 0; i < arms; i += 1) {
    const a = (i / arms) * Math.PI * 2;
    const g = new THREE.CylinderGeometry(0.07, 0.015, 1.0, 6, lite ? 14 : 26, true);
    g.translate(Math.cos(a) * 0.07, -0.5, Math.sin(a) * 0.07);
    parts.push(tag(g, 1, [0, 0, 0], i * 1.7));
  }
  const tentacles = lite ? 8 : 14;
  for (let i = 0; i < tentacles; i += 1) {
    const a = (i / tentacles) * Math.PI * 2;
    const len = 1.4 + ((i * 0.37) % 0.7);
    const g = new THREE.CylinderGeometry(0.007, 0.0025, len, 3, lite ? 18 : 34, true);
    g.translate(Math.cos(a) * 0.44, -0.05 - len / 2, Math.sin(a) * 0.44);
    parts.push(tag(g, 2, [0, 0, 0], i * 2.3));
  }
  return mergeGeometries(parts)!;
}

function jellyMaterial(hue: THREE.Color, phase: number) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: hue,
    roughness: 0.15,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = oceanTime;
    shader.uniforms.uMotion = oceanMotion;
    shader.uniforms.uPhase = { value: phase };
    shader.uniforms.uNight = uNight;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uTime;
        uniform float uMotion;
        uniform float uPhase;
        attribute float part;
        attribute float seed;
        varying float vPart;
        varying float vDepth;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vPart = part;
        float beat = uTime * 1.45 + uPhase;
        float pulse = pow(0.5 + 0.5 * sin(beat), 2.0) * uMotion;
        if (part < 0.5) {
          float low = 1.0 - clamp(position.y / 0.42, 0.0, 1.0);
          transformed.xz *= 1.0 - 0.16 * pulse * low;
          transformed.y += 0.035 * pulse * (1.0 - low) - 0.02 * pulse * low;
          vDepth = 0.0;
        } else {
          float d = max(0.0, -position.y);
          vDepth = d;
          float lag = beat - d * 2.4;
          float amp = (part < 1.5 ? 0.05 : 0.09) * d * uMotion;
          transformed.x += sin(uTime * 0.9 + d * 2.1 + seed) * amp + sin(lag) * 0.02 * d * uMotion;
          transformed.z += cos(uTime * 0.7 + d * 1.7 + seed * 1.3) * amp * 0.8;
          transformed.xz *= 1.0 - 0.1 * pulse * exp(-d * 1.5);
          if (part < 1.5) transformed.xz += vec2(sin(d * 18.0 + seed), cos(d * 15.0 + seed)) * 0.025;
        }`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uNight;
        varying float vPart;
        varying float vDepth;`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        {
          float facing = abs(dot(normalize(normal), normalize(vViewPosition)));
          float rim = pow(1.0 - facing, 1.6);
          float glow = 0.35 + uNight * 1.4;
          if (vPart < 0.5) {
            diffuseColor.a = 0.1 + 0.55 * rim;
            totalEmissiveRadiance += diffuseColor.rgb * rim * glow;
          } else if (vPart < 1.5) {
            diffuseColor.a = 0.38;
            totalEmissiveRadiance += diffuseColor.rgb * 0.25 * glow;
          } else {
            diffuseColor.a = 0.55 * (1.0 - smoothstep(0.6, 2.2, vDepth));
            totalEmissiveRadiance += diffuseColor.rgb * 0.4 * glow;
          }
        }`,
      );
  };
  mat.customProgramCacheKey = () => "jellyfish";
  return mat;
}

/* ------------------------------------------------------------------ */
/* Scripted passes                                                     */
/* ------------------------------------------------------------------ */

type Kind = "turtle" | "jelly";
type Pass = {
  active: boolean;
  t0: number;
  start: THREE.Vector3;
  end: THREE.Vector3;
  lastZone: string;
  nextAllowed: number;
  cooldown: number;
};

const fwd = new THREE.Vector3();
const right = new THREE.Vector3();
const up = new THREE.Vector3();
const center = new THREE.Vector3();
const dirV = new THREE.Vector3();
const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const qa = new THREE.Quaternion();
const sideV = new THREE.Vector3();
const upV = new THREE.Vector3();
const basis = new THREE.Matrix4();
const qb = new THREE.Quaternion();

function Creature({
  kind,
  zones,
  geometry,
  material,
  distance,
  duration,
  delay,
  scale,
  lane,
}: {
  kind: Kind;
  zones: string[];
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  distance: number;
  duration: number;
  delay: number;
  scale: number;
  lane: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const pass = useRef<Pass>({
    active: false,
    t0: 0,
    start: new THREE.Vector3(),
    end: new THREE.Vector3(),
    lastZone: "",
    nextAllowed: Infinity,
    cooldown: 0,
  });

  useFrame(({ camera, clock, size }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const p = pass.current;
    const now = clock.elapsedTime;
    const zone = zoneAt(reefScroll.smooth, reefScroll.ranges);
    const entered = zone !== p.lastZone;
    p.lastZone = zone;
    // Wait for the camera to settle in a newly entered section, but honour the
    // cooldown after a previous pass so creatures stay occasional.
    if (entered) p.nextAllowed = zones.includes(zone) ? Math.max(p.cooldown, now + delay) : Infinity;

    if (!p.active && zones.includes(zone) && now >= p.nextAllowed && reefScroll.intro < 0.01) {
      const cam = camera as THREE.PerspectiveCamera;
      cam.getWorldDirection(fwd);
      right.crossVectors(fwd, Y).normalize();
      up.crossVectors(right, fwd).normalize();
      const halfH = distance * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
      const halfW = halfH * (size.width / Math.max(1, size.height));
      center.copy(cam.position).addScaledVector(fwd, distance);
      const side = Math.random() < 0.5 ? -1 : 1;
      if (kind === "turtle") {
        center.addScaledVector(up, halfH * (0.15 + lane * 0.2));
        p.start.copy(center).addScaledVector(right, -(halfW + 2) * side).addScaledVector(fwd, 1.2);
        p.end.copy(center).addScaledVector(right, (halfW + 2) * side).addScaledVector(fwd, -1.5).addScaledVector(up, 0.6);
      } else {
        center.addScaledVector(right, halfW * lane * 0.55);
        p.start.copy(center).addScaledVector(up, -(halfH + 2.6)).addScaledVector(right, -0.5 * side);
        p.end.copy(center).addScaledVector(up, halfH + 2.4).addScaledVector(right, 0.7 * side);
      }
      p.t0 = now;
      p.active = true;
    }

    if (!p.active) {
      mesh.visible = false;
      return;
    }
    const k = (now - p.t0) / duration;
    if (k >= 1) {
      p.active = false;
      p.cooldown = now + 30 + Math.random() * 20;
      p.nextAllowed = zones.includes(zone) ? p.cooldown : Infinity;
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    mesh.position.lerpVectors(p.start, p.end, k);
    dirV.subVectors(p.end, p.start).normalize();
    if (kind === "turtle") {
      mesh.position.y += Math.sin(now * 0.62) * 0.12;
      // Build a level basis (heading = travel direction, up = world up) so a
      // right-to-left pass never rolls the turtle belly-up.
      sideV.crossVectors(dirV, Y).normalize();
      upV.crossVectors(sideV, dirV).normalize();
      basis.makeBasis(dirV, upV, sideV);
      qa.setFromRotationMatrix(basis);
      qb.setFromAxisAngle(X, Math.sin(now * 0.4) * 0.12);
      mesh.quaternion.copy(qa).multiply(qb);
      mesh.rotateZ(Math.sin(now * 1.25) * 0.05 + 0.06);
    } else {
      // Jellies rise bell-first with a gentle pulse-driven surge and wobble.
      mesh.position.addScaledVector(dirV, Math.sin(now * 1.45 + lane * 2.0) * 0.08);
      mesh.quaternion.setFromUnitVectors(Y, dirV);
      mesh.rotateX(Math.sin(now * 0.5 + lane) * 0.12);
      mesh.rotateZ(Math.cos(now * 0.4 + lane) * 0.1);
    }
    mesh.scale.setScalar(scale);
  });

  return <mesh ref={ref} geometry={geometry} material={material} visible={false} frustumCulled={false} />;
}

const JELLY_HUES = ["#ffb3dc", "#a8f1ff", "#ffd6a8"];

/**
 * A sea turtle and drifting jellyfish that pass the camera in specific
 * sections. Disabled for reduced motion; counts scale with the perf tier.
 */
export default function SeaLife({ lite, tier }: { lite: boolean; tier: PerfTier }) {
  const turtleGeo = useMemo(() => turtleGeometry(lite), [lite]);
  const turtleMat = useMemo(() => turtleMaterial(), []);
  const jellyGeo = useMemo(() => jellyGeometry(lite), [lite]);
  const jellyCount = tier === "low" ? 1 : lite || tier === "mid" ? 2 : 3;
  const jellyMats = useMemo(
    () => JELLY_HUES.slice(0, jellyCount).map((hue, i) => jellyMaterial(new THREE.Color(hue), i * 2.1)),
    [jellyCount],
  );

  useLayoutEffect(
    () => () => {
      turtleGeo.dispose();
      turtleMat.dispose();
      jellyGeo.dispose();
      jellyMats.forEach((m) => m.dispose());
    },
    [turtleGeo, turtleMat, jellyGeo, jellyMats],
  );

  return (
    <group>
      <Creature
        kind="turtle"
        zones={["about", "approach"]}
        geometry={turtleGeo}
        material={turtleMat}
        distance={6.5}
        duration={16}
        delay={2.2}
        scale={1.15}
        lane={0}
      />
      {jellyMats.map((mat, i) => (
        <Creature
          key={i}
          kind="jelly"
          zones={["skills", "contact"]}
          geometry={jellyGeo}
          material={mat}
          distance={5 + i * 1.6}
          duration={26 + i * 4}
          delay={1.8 + i * 2.4}
          scale={0.75 - i * 0.08}
          lane={i === 0 ? -0.6 : i === 1 ? 0.5 : -0.1}
        />
      ))}
    </group>
  );
}