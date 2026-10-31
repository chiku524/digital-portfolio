"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { reefEnv } from "./ambient";
import { AdaptiveDpr } from "@react-three/drei/core/AdaptiveDpr";
import { Float } from "@react-three/drei/core/Float";
import { PerformanceMonitor } from "@react-three/drei/core/PerformanceMonitor";
import { Sparkles } from "@react-three/drei/core/Sparkles";
import * as THREE from "three";
import { PROJECTS } from "@/content/portfolio";
import { samplePose, writeStation, type V3 } from "./path";
import Effects from "./Effects";
import { buildReef, type Piece, type Swimmer } from "./reef-data";
import Fishes from "./Fish";
import { anemone, brainCoral, branchingCoral, kelpFrond, rock, seaFan, seaGrass } from "./geometry";
import { oceanMotion, oceanTime, reefMaterial } from "./materials";
import { beatIndex, clamp, reefScroll, smoothstep } from "./scroll";
import type { PerfTier } from "./perf";

const RAYS = [
  { position: [1.4, 6.2, 1.2], rotation: [0.15, 0.2, 0.35], scale: [1.1, 7.5, 1] },
  { position: [-1.8, 5.8, -0.4], rotation: [0.1, -0.4, -0.2], scale: [0.8, 6.4, 1] },
  { position: [0.2, 6.4, 3.4], rotation: [-0.05, 0.1, 0.5], scale: [1.4, 8, 1] },
] as const;

const ARCHES = [
  { position: [0.7, -3.35, -66], rotation: [0.1, 0.35, 0], color: "#ff6a45" },
  { position: [-0.8, -3.65, -71], rotation: [0.05, -0.2, 0.08], color: "#7d5cff" },
  { position: [0.45, -3.95, -76], rotation: [-0.05, 0.15, -0.04], color: "#2ec4b6" },
] as const;

function Field({
  pieces,
  geometry,
  material,
}: {
  pieces: Piece[];
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh || pieces.length === 0) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    pieces.forEach((item, index) => {
      dummy.position.set(item.x, item.y, item.z);
      dummy.rotation.set(item.rx, item.ry, item.rz);
      dummy.scale.set(item.sx, item.sy, item.sz);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      mesh.setColorAt(index, color.set(item.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [pieces]);

  if (pieces.length === 0) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, pieces.length]}
      frustumCulled={false}
    />
  );
}

/** Advances the shared clock that drives every swaying / swimming shader. */
function OceanClock({ reduced }: { reduced: boolean }) {
  useFrame((_, delta) => {
    const calm = reduced || reefScroll.reducedMotion ? 0.25 : 1;
    oceanMotion.value = calm;
    oceanTime.value += Math.min(delta, 0.05) * (0.6 + calm * 0.4);
  });
  return null;
}

function Bubbles({
  bubbles,
  geometry,
  material,
}: {
  bubbles: Swimmer[];
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const motion = useRef<Float32Array | null>(null);
  useLayoutEffect(() => {
    motion.current = Float32Array.from(bubbles.map((item) => item.y));
  }, [bubbles]);

  useFrame((_, delta) => {
    const mesh = ref.current;
    const positions = motion.current;
    if (!mesh || !positions) return;
    const dt = Math.min(delta, 0.05);
    const pace = (reefScroll.reducedMotion ? 0.2 : 1) * (1 + Math.abs(reefScroll.lean));
    for (let index = 0; index < bubbles.length; index += 1) {
      const item = bubbles[index];
      let y = positions[index] + item.speed * dt * pace;
      if (y > item.top) y = item.top - 7;
      positions[index] = y;
      dummy.position.set(item.x + Math.sin(y + item.phase) * 0.15, y, item.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(item.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (bubbles.length === 0) return null;
  return (
    <instancedMesh ref={ref} args={[geometry, material, bubbles.length]} frustumCulled={false} />
  );
}

function Water({ mobile }: { mobile: boolean }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  useFrame(({ clock }) => {
    if (material.current) material.current.uniforms.uTime.value = clock.elapsedTime;
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 7.15, -6]}>
      <planeGeometry args={[90, 90, mobile ? 24 : 48, mobile ? 24 : 48]} />
      <shaderMaterial
        ref={material}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        toneMapped={false}
        glslVersion={THREE.GLSL3}
        uniforms={{ uTime: { value: 0 } }}
        vertexShader={`
          uniform float uTime;
          out float vElev;
          void main() {
            vec3 p = position;
            float e = sin(p.x * 0.35 + uTime * 0.8) * 0.14 + cos(p.y * 0.28 + uTime * 0.65) * 0.09;
            p.z += e;
            vElev = e;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          }
        `}
        fragmentShader={`
          precision mediump float;
          in float vElev;
          out vec4 fragColor;
          void main() {
            vec3 deep = vec3(0.04, 0.32, 0.4);
            vec3 crest = vec3(0.78, 0.96, 0.95);
            vec3 col = mix(deep, crest, smoothstep(-0.04, 0.16, vElev));
            fragColor = vec4(col, 0.46);
          }
        `}
      />
    </mesh>
  );
}

function Sand() {
  const material = useRef<THREE.ShaderMaterial>(null);
  useFrame(({ clock }) => {
    if (material.current) material.current.uniforms.uTime.value = clock.elapsedTime;
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -6.4, -30]}>
      <planeGeometry args={[140, 160, 1, 1]} />
      <shaderMaterial
        ref={material}
        toneMapped={false}
        glslVersion={THREE.GLSL3}
        uniforms={{ uTime: { value: 0 } }}
        vertexShader={`
          out vec3 vPos;
          void main() {
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          precision mediump float;
          uniform float uTime;
          in vec3 vPos;
          out vec4 fragColor;
          void main() {
            // Layered caustic web: two drifting cellular interference patterns.
            vec2 p = vPos.xy * 0.34;
            float t = uTime * 0.32;
            float c1 = abs(sin(p.x + sin(p.y * 1.3 + t) * 1.4 + t) * sin(p.y + sin(p.x * 1.1 - t) * 1.2 - t * 0.8));
            vec2 q = p * 1.9 + vec2(t * 0.4, -t * 0.3);
            float c2 = abs(sin(q.x + sin(q.y + t * 1.3)) * sin(q.y + sin(q.x - t)));
            float caustic = pow(1.0 - c1, 6.0) * 0.75 + pow(1.0 - c2, 8.0) * 0.45;
            vec3 sand = vec3(0.05, 0.16, 0.19);
            vec3 light = vec3(0.32, 0.72, 0.66);
            float fade = smoothstep(80.0, 10.0, length(vPos.xy));
            vec3 col = sand + light * caustic * fade;
            fragColor = vec4(col, 1.0);
          }
        `}
      />
    </mesh>
  );
}

function LightRays() {
  const mats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    // Rays shimmer near the surface and dissolve as the dive goes deeper.
    const depth = 1 - smoothstep(reefScroll.progress * 3.2);
    mats.current.forEach((mat, index) => {
      if (!mat) return;
      const shimmer = reefScroll.reducedMotion ? 1 : 0.65 + Math.sin(time * 0.6 + index * 1.7) * 0.35;
      mat.opacity = 0.1 * shimmer * (0.25 + depth * 0.75);
    });
  });
  return (
    <>
      {RAYS.map((ray, index) => (
        <mesh key={ray.position.join("-")} position={ray.position} rotation={ray.rotation} scale={ray.scale}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            ref={(mat) => {
              mats.current[index] = mat;
            }}
            color="#e7fff8"
            transparent
            opacity={0.07}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  );
}

function CameraRig({ mobile }: { mobile: boolean }) {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const fog = useRef<THREE.Fog>(null);
  const desired = useRef(new THREE.Vector3(0, 8.9, 12.2));
  const look = useRef(new THREE.Vector3(0.5, 2.1, -1.6));
  const lookSmoothed = useRef(new THREE.Vector3(0.5, 2.1, -1.6));
  const booted = useRef(false);
  const posA = useRef<V3>({ x: 0, y: 0, z: 0 });
  const lookA = useRef<V3>({ x: 0, y: 0, z: 0 });
  const posB = useRef<V3>({ x: 0, y: 0, z: 0 });
  const lookB = useRef<V3>({ x: 0, y: 0, z: 0 });
  const station = useRef<V3>({ x: 0, y: 0, z: 0 });
  const blendPos = useRef(new THREE.Vector3());
  const blendLook = useRef(new THREE.Vector3());
  const shallow = useMemo(() => new THREE.Color("#0e6a80"), []);
  const mid = useMemo(() => new THREE.Color("#06344c"), []);
  const deep = useMemo(() => new THREE.Color("#070d16"), []);
  const sky = useMemo(() => new THREE.Color("#b7ebe8"), []);
  const fogColor = useMemo(() => new THREE.Color("#127888"), []);
  const nightTint = useMemo(() => new THREE.Color("#0a1a3a"), []);
  const glow = useRef<THREE.PointLight>(null);

  useFrame((_, delta) => {
    const ranges = reefScroll.ranges;
    // Critically damped follow of scroll progress: the camera glides instead of snapping.
    const raw = reefScroll.progress;
    if (reefScroll.reducedMotion || !booted.current) reefScroll.smooth = raw;
    else reefScroll.smooth += (raw - reefScroll.smooth) * (1 - Math.exp(-Math.min(delta, 0.1) * 7));
    const progress = reefScroll.smooth;
    let id = "top";
    let t = 0;
    let blend = 0;
    let nextId = "top";

    if (ranges.length) {
      if (progress <= ranges[0].pinStart) {
        id = ranges[0].id;
      } else {
        for (let index = 0; index < ranges.length; index += 1) {
          const range = ranges[index];
          const upcoming = ranges[index + 1];
          if (progress <= range.pinEnd || !upcoming) {
            const span = Math.max(0.0001, range.pinEnd - range.pinStart);
            id = range.id;
            t = clamp((progress - range.pinStart) / span, 0, 1);
            break;
          }
          if (progress < upcoming.pinStart) {
            id = range.id;
            t = 1;
            const span = Math.max(0.0001, upcoming.pinStart - range.pinEnd);
            blend = clamp((progress - range.pinEnd) / span, 0, 1);
            nextId = upcoming.id;
            break;
          }
        }
      }
    }

    samplePose(id, t, mobile, posA.current, lookA.current);
    desired.current.set(posA.current.x, posA.current.y, posA.current.z);
    look.current.set(lookA.current.x, lookA.current.y, lookA.current.z);
    if (blend > 0) {
      const s = smoothstep(blend);
      samplePose(nextId, 0, mobile, posB.current, lookB.current);
      blendPos.current.set(posB.current.x, posB.current.y, posB.current.z);
      blendLook.current.set(lookB.current.x, lookB.current.y, lookB.current.z);
      desired.current.lerp(blendPos.current, s);
      look.current.lerp(blendLook.current, s);
    }

    const follow = reefScroll.reducedMotion ? 1 : 1 - Math.exp(-Math.min(delta, 0.1) * 10);
    const leanTarget = reefScroll.reducedMotion ? 0 : clamp(reefScroll.velocity / 4200, -1, 1);
    reefScroll.lean += (leanTarget - reefScroll.lean) * (1 - Math.exp(-delta * 5));
    const rush = Math.abs(reefScroll.lean);
    if (!reefScroll.reducedMotion) {
      desired.current.y -= rush * 0.42;
      desired.current.z -= rush * 0.9;
      desired.current.x += Math.sin(progress * 16) * 0.08 + reefScroll.lean * 0.28;
      look.current.y -= rush * 0.18;
    }
    if (reefScroll.intro > 0.0001) {
      // Page-load descent: start high above the surface and settle into frame.
      const k = reefScroll.intro;
      desired.current.y += k * 7.5;
      desired.current.z += k * 9;
      desired.current.x -= k * 2.2;
      look.current.y += k * 2.4;
    }
    if (!booted.current) {
      camera.position.copy(desired.current);
      lookSmoothed.current.copy(look.current);
      booted.current = true;
    } else {
      camera.position.lerp(desired.current, follow);
      lookSmoothed.current.lerp(look.current, follow);
    }
    camera.lookAt(lookSmoothed.current);
    camera.rotateZ(-reefScroll.lean * 0.055);

    const work = ranges.find((range) => range.id === "work");
    const project = beatIndex(progress, work, PROJECTS.length);
    writeStation(project, station.current);
    if (glow.current) {
      const glowFollow = 1 - Math.exp(-Math.min(delta, 0.1) * (6 + Math.abs(reefScroll.lean) * 8));
      glow.current.position.x += (station.current.x - glow.current.position.x) * glowFollow;
      glow.current.position.y += (station.current.y + 0.4 - glow.current.position.y) * glowFollow;
      glow.current.position.z += (station.current.z - glow.current.position.z) * glowFollow;
      glow.current.intensity = 46 + Math.abs(reefScroll.lean) * 30;
    }

    const fogNode = fog.current;
    if (fogNode) {
      const above = clamp((camera.position.y - 4.2) / 4.8, 0, 1);
      const depth = clamp((2.2 - camera.position.y) / 6.5, 0, 1);
      if (above > 0.02) {
        fogColor.copy(shallow).lerp(sky, above);
        fogNode.near = 8 + above * 6;
        fogNode.far = 26 + above * 18;
      } else {
        fogColor.copy(shallow).lerp(deep, depth);
        fogColor.lerp(mid, depth * 0.45);
        fogNode.near = 5.2 - depth * 1.5;
        fogNode.far = 17 - depth * 6;
      }
      // Day/night: ease toward the target and pull the water toward a moonlit indigo.
      reefEnv.night += (reefEnv.nightTarget - reefEnv.night) * (1 - Math.exp(-delta * 1.5));
      if (reefEnv.night > 0.001) fogColor.lerp(nightTint, reefEnv.night * 0.38);
      fogNode.color.copy(fogColor);
      gl.setClearColor(fogColor);
    }
  });

  return (
    <>
      <fog ref={fog} attach="fog" args={["#127888", 8, 26]} />
      <pointLight
        ref={glow}
        position={[0, 0.6, -8]}
        color="#ffb199"
        intensity={46}
        distance={11}
        decay={2}
      />
    </>
  );
}

export default function ReefWorld({
  mobile,
  reduced,
  tier = "high",
}: {
  mobile: boolean;
  reduced: boolean;
  tier?: PerfTier;
}) {
  // Low tier (or phones) get the lighter reef: fewer fish, kelp, bubbles and simpler meshes.
  const lite = mobile || tier === "low";
  // Post-processing is dropped automatically if the GPU can't hold frame rate.
  const [fx, setFx] = useState(true);
  const reef = useMemo(() => buildReef(lite), [lite]);
  const geos = useMemo(
    () => ({
      branch: branchingCoral("staghorn", lite),
      finger: branchingCoral("finger", lite),
      fan: seaFan(lite),
      brain: brainCoral(lite),
      tip: new THREE.SphereGeometry(0.16, 10, 8),
      kelp: kelpFrond(lite),
      rock: rock(lite),
      anemone: anemone(lite),
      grass: seaGrass(lite),
      disc: new THREE.CircleGeometry(1, 18),
      bubble: new THREE.SphereGeometry(0.08, 8, 6),
    }),
    [lite],
  );
  const mats = useMemo(
    () => ({
      coral: reefMaterial({ key: "coral", roughness: 0.78, sss: 0.16 }),
      brain: reefMaterial({ key: "brain", roughness: 0.86, sss: 0.1 }),
      fan: reefMaterial({
        key: "fan",
        roughness: 0.7,
        sss: 0.22,
        side: THREE.DoubleSide,
        sway: { amp: 0.06, freq: 0.8, base: -0.55, height: 1.15 },
      }),
      tip: new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        roughness: 0.35,
        clearcoat: 0.6,
        clearcoatRoughness: 0.4,
        emissive: "#ffc2a8",
        emissiveIntensity: 0.35,
      }),
      kelp: reefMaterial({
        key: "kelp",
        roughness: 0.55,
        sss: 0.28,
        side: THREE.DoubleSide,
        sway: { amp: 0.32, freq: 0.7, base: -0.5, height: 1 },
      }),
      grass: reefMaterial({
        key: "grass",
        roughness: 0.6,
        sss: 0.2,
        side: THREE.DoubleSide,
        sway: { amp: 0.14, freq: 1.3, base: 0, height: 1 },
      }),
      anemone: reefMaterial({
        key: "anemone",
        roughness: 0.45,
        sss: 0.4,
        sway: { amp: 0.07, freq: 1.1, base: 0.15, height: 0.45 },
      }),
      rock: reefMaterial({ key: "rock", roughness: 0.95 }),
      sand: new THREE.MeshStandardMaterial({
        color: "#ffffff",
        roughness: 1,
      }),
      bubble: new THREE.MeshPhysicalMaterial({
        color: "#e9fffb",
        transparent: true,
        opacity: 0.38,
        roughness: 0.04,
        clearcoat: 1,
        iridescence: 0.8,
        iridescenceIOR: 1.3,
        emissive: "#9ff6ea",
        emissiveIntensity: 0.55,
      }),
    }),
    [],
  );

  return (
    <PerformanceMonitor onDecline={() => setFx(false)} flipflops={2} onFallback={() => setFx(false)}>
      <AdaptiveDpr />
      <hemisphereLight args={["#c9fbff", "#16342c", 0.72]} />
      <ambientLight intensity={0.38} color="#8fd0d4" />
      <directionalLight position={[6, 14, 8]} intensity={2.4} color="#fff6ea" />
      <directionalLight position={[-8, 3, -14]} intensity={1.4} color="#3fe0c8" />
      <OceanClock reduced={reduced} />
      <CameraRig mobile={mobile} />
      <Sand />
      <Water mobile={mobile} />
      <Field pieces={reef.discs} geometry={geos.disc} material={mats.sand} />
      <Field pieces={reef.rocks} geometry={geos.rock} material={mats.rock} />
      <Field pieces={reef.brains} geometry={geos.brain} material={mats.brain} />
      <Field pieces={reef.branches.filter((_, i) => i % 3 !== 0)} geometry={geos.branch} material={mats.coral} />
      <Field pieces={reef.branches.filter((_, i) => i % 3 === 0)} geometry={geos.finger} material={mats.coral} />
      <Field pieces={reef.anemones} geometry={geos.anemone} material={mats.anemone} />
      <Field pieces={reef.grass} geometry={geos.grass} material={mats.grass} />
      <Field pieces={reef.fans} geometry={geos.fan} material={mats.fan} />
      <Field pieces={reef.tips} geometry={geos.tip} material={mats.tip} />
      <Field pieces={reef.kelp} geometry={geos.kelp} material={mats.kelp} />
      <Fishes flocks={reef.flocks} lite={lite} />
      <Bubbles bubbles={reef.bubbles} geometry={geos.bubble} material={mats.bubble} />
      <LightRays />
      <Sparkles
        count={lite ? 50 : tier === "mid" ? 100 : 160}
        scale={[14, 12, 90]}
        position={[0, 0, -36]}
        size={mobile ? 1.6 : 2.2}
        speed={reduced ? 0 : 0.25}
        opacity={0.55}
        color="#d8fff6"
      />
      {ARCHES.map((arch) => (
        <mesh key={arch.color} position={arch.position} rotation={arch.rotation}>
          <torusGeometry args={[1.7, 0.22, 6, 12, Math.PI]} />
          <meshStandardMaterial color={arch.color} flatShading roughness={0.48} />
        </mesh>
      ))}
      {Array.from({ length: 6 }, (_, index) => {
        const angle = (index / 6) * Math.PI * 2;
        return (
          <mesh
            key={angle}
            position={[Math.cos(angle) * 2.3, -4.4, -80 + Math.sin(angle) * 1.3]}
          >
            <sphereGeometry args={[0.2, 8, 6]} />
            <meshStandardMaterial color="#123832" emissive="#7dffe1" emissiveIntensity={1.6} />
          </mesh>
        );
      })}
      <Float enabled={!reduced} speed={1.4} rotationIntensity={0.25} floatIntensity={0.45}>
        <mesh position={[1.7, 1.7, -1.4]}>
          <sphereGeometry args={[0.34, 7, 6]} />
          <meshStandardMaterial color="#ff6d9a" flatShading emissive="#ff8fb0" emissiveIntensity={0.25} />
        </mesh>
      </Float>
      <Float enabled={!reduced} speed={1.1} rotationIntensity={0.2} floatIntensity={0.35}>
        <mesh position={[-1.1, 1.25, -2.3]}>
          <icosahedronGeometry args={[0.28, 0]} />
          <meshStandardMaterial color="#ffb15a" flatShading emissive="#ffd39a" emissiveIntensity={0.2} />
        </mesh>
      </Float>
      {fx && tier !== "low" ? <Effects mobile={mobile || tier === "mid"} /> : null}
    </PerformanceMonitor>
  );
}
