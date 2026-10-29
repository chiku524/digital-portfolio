"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr } from "@react-three/drei/core/AdaptiveDpr";
import { Float } from "@react-three/drei/core/Float";
import { PerformanceMonitor } from "@react-three/drei/core/PerformanceMonitor";
import * as THREE from "three";
import { PROJECTS } from "@/content/portfolio";
import { samplePose, writeStation, type V3 } from "./path";
import { buildReef, type Piece, type Swimmer } from "./reef-data";
import { beatIndex, clamp, reefScroll, smoothstep } from "./scroll";

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

function Kelp({
  pieces,
  geometry,
  material,
}: {
  pieces: Piece[];
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const color = new THREE.Color();
    pieces.forEach((item, index) => {
      mesh.setColorAt(index, color.set(item.color));
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [pieces]);

  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const time = clock.elapsedTime;
    const amp = (reefScroll.reducedMotion ? 0.02 : 0.08) * (1 + Math.abs(reefScroll.lean) * 1.8);
    for (let index = 0; index < pieces.length; index += 1) {
      const item = pieces[index];
      dummy.position.set(item.x, item.y, item.z);
      dummy.rotation.set(item.rx, item.ry, item.rz + Math.sin(time * 0.7 + index) * amp);
      dummy.scale.set(item.sx, item.sy, item.sz);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (pieces.length === 0) return null;
  return (
    <instancedMesh ref={ref} args={[geometry, material, pieces.length]} frustumCulled={false} />
  );
}

function School({
  fish,
  geometry,
  material,
}: {
  fish: Swimmer[];
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const motion = useRef<Float32Array | null>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const color = new THREE.Color();
    const positions = new Float32Array(fish.length);
    fish.forEach((item, index) => {
      positions[index] = item.x;
      mesh.setColorAt(index, color.set(item.color));
    });
    motion.current = positions;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [fish]);

  useFrame(({ clock }, delta) => {
    const mesh = ref.current;
    const positions = motion.current;
    if (!mesh || !positions) return;
    const dt = Math.min(delta, 0.05);
    const time = clock.elapsedTime;
    const rush = 1 + Math.abs(reefScroll.lean) * 2.6;
    const amp = (reefScroll.reducedMotion ? 0.04 : 0.2) * rush;
    const pace = (reefScroll.reducedMotion ? 0.15 : 1) * rush;
    for (let index = 0; index < fish.length; index += 1) {
      const item = fish[index];
      let x = positions[index] + item.dir * item.speed * dt * pace;
      if (x > 4.8) x = -4.8;
      if (x < -4.8) x = 4.8;
      positions[index] = x;
      dummy.position.set(x, item.y + Math.sin(time * 0.9 + item.phase) * amp, item.z);
      dummy.rotation.set(
        Math.sin(time * 1.2 + item.phase) * 0.12,
        0,
        item.dir > 0 ? -Math.PI / 2 : Math.PI / 2,
      );
      dummy.scale.setScalar(item.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (fish.length === 0) return null;
  return (
    <instancedMesh ref={ref} args={[geometry, material, fish.length]} frustumCulled={false} />
  );
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
            float c = sin(vPos.x * 0.42 + uTime * 0.5) * sin(vPos.y * 0.36 - uTime * 0.38);
            vec3 sand = vec3(0.07, 0.2, 0.22);
            vec3 light = vec3(0.16, 0.42, 0.4);
            vec3 col = mix(sand, light, smoothstep(0.15, 0.92, c) * 0.55);
            fragColor = vec4(col, 1.0);
          }
        `}
      />
    </mesh>
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
  const shallow = useMemo(() => new THREE.Color("#127888"), []);
  const mid = useMemo(() => new THREE.Color("#083848"), []);
  const deep = useMemo(() => new THREE.Color("#070d16"), []);
  const sky = useMemo(() => new THREE.Color("#b7ebe8"), []);
  const fogColor = useMemo(() => new THREE.Color("#127888"), []);
  const glow = useRef<THREE.PointLight>(null);

  useFrame((_, delta) => {
    const ranges = reefScroll.ranges;
    const progress = reefScroll.progress;
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

    const follow = reefScroll.reducedMotion ? 1 : 1 - Math.exp(-delta * 26);
    const leanTarget = reefScroll.reducedMotion ? 0 : clamp(reefScroll.velocity / 4200, -1, 1);
    reefScroll.lean += (leanTarget - reefScroll.lean) * (1 - Math.exp(-delta * 5));
    const rush = Math.abs(reefScroll.lean);
    if (!reefScroll.reducedMotion) {
      desired.current.y -= rush * 0.42;
      desired.current.z -= rush * 0.9;
      desired.current.x += Math.sin(progress * 16) * 0.08 + reefScroll.lean * 0.28;
      look.current.y -= rush * 0.18;
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
      const glowFollow = 0.18 + Math.abs(reefScroll.lean) * 0.35;
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
}: {
  mobile: boolean;
  reduced: boolean;
}) {
  const reef = useMemo(() => buildReef(mobile), [mobile]);
  const geos = useMemo(
    () => ({
      branch: new THREE.CylinderGeometry(0.09, 0.2, 1, 5),
      fan: new THREE.PlaneGeometry(1, 1.15),
      brain: new THREE.SphereGeometry(0.55, 6, 5),
      tip: new THREE.SphereGeometry(0.16, 6, 5),
      kelp: new THREE.CylinderGeometry(0.04, 0.07, 1, 4),
      rock: new THREE.IcosahedronGeometry(0.55, 0),
      disc: new THREE.CircleGeometry(1, 7),
      fish: new THREE.ConeGeometry(0.13, 0.58, 4),
      bubble: new THREE.SphereGeometry(0.08, 6, 5),
    }),
    [],
  );
  const mats = useMemo(
    () => ({
      coral: new THREE.MeshStandardMaterial({
        color: "#ffffff",
        flatShading: true,
        roughness: 0.5,
        metalness: 0.02,
        emissive: "#4a241c",
        emissiveIntensity: 0.22,
      }),
      fan: new THREE.MeshStandardMaterial({
        color: "#ffffff",
        flatShading: true,
        roughness: 0.42,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
      }),
      tip: new THREE.MeshStandardMaterial({
        color: "#ffffff",
        flatShading: true,
        roughness: 0.35,
        emissive: "#ffd8c8",
        emissiveIntensity: 0.18,
      }),
      kelp: new THREE.MeshStandardMaterial({
        color: "#ffffff",
        flatShading: true,
        roughness: 0.72,
      }),
      rock: new THREE.MeshStandardMaterial({
        color: "#ffffff",
        flatShading: true,
        roughness: 0.9,
      }),
      sand: new THREE.MeshStandardMaterial({
        color: "#ffffff",
        roughness: 1,
      }),
      fish: new THREE.MeshStandardMaterial({
        color: "#ffffff",
        flatShading: true,
        roughness: 0.42,
      }),
      bubble: new THREE.MeshStandardMaterial({
        color: "#e9fffb",
        transparent: true,
        opacity: 0.32,
        roughness: 0.08,
        emissive: "#9ff6ea",
        emissiveIntensity: 0.25,
      }),
    }),
    [],
  );

  return (
    <PerformanceMonitor>
      <AdaptiveDpr />
      <hemisphereLight args={["#c9fbff", "#16342c", 0.72]} />
      <ambientLight intensity={0.38} color="#8fd0d4" />
      <directionalLight position={[6, 14, 8]} intensity={2.5} color="#f3fffb" />
      <CameraRig mobile={mobile} />
      <Sand />
      <Water mobile={mobile} />
      <Field pieces={reef.discs} geometry={geos.disc} material={mats.sand} />
      <Field pieces={reef.rocks} geometry={geos.rock} material={mats.rock} />
      <Field pieces={reef.brains} geometry={geos.brain} material={mats.coral} />
      <Field pieces={reef.branches} geometry={geos.branch} material={mats.coral} />
      <Field pieces={reef.fans} geometry={geos.fan} material={mats.fan} />
      <Field pieces={reef.tips} geometry={geos.tip} material={mats.tip} />
      <Kelp pieces={reef.kelp} geometry={geos.kelp} material={mats.kelp} />
      <School fish={reef.fish} geometry={geos.fish} material={mats.fish} />
      <Bubbles bubbles={reef.bubbles} geometry={geos.bubble} material={mats.bubble} />
      {RAYS.map((ray) => (
        <mesh
          key={ray.position.join("-")}
          position={ray.position}
          rotation={ray.rotation}
          scale={ray.scale}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            color="#e7fff8"
            transparent
            opacity={0.07}
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}
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
    </PerformanceMonitor>
  );
}
