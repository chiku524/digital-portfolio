"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { fish as fishGeometry, type Species } from "./geometry";
import { fishMaterial } from "./materials";
import type { Flock } from "./reef-data";
import { reefScroll } from "./scroll";

const LENGTH: Record<Species, number> = { clown: 0.5, tang: 0.72, angel: 0.85, chromis: 0.34 };
const SPEED: Record<Species, [number, number]> = {
  clown: [0.12, 0.38],
  tang: [0.3, 0.75],
  angel: [0.18, 0.5],
  chromis: [0.45, 1.05],
};

type Sim = {
  flock: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  yaw: number;
  roll: number;
  size: number;
};

const steer = new THREE.Vector3();
const tmp = new THREE.Vector3();
const center = new THREE.Vector3();
const heading = new THREE.Vector3();
const home = new THREE.Vector3();

/**
 * One species = one instanced mesh. Each fish flocks with its own group
 * (separation / alignment / cohesion) around a slowly wandering home point,
 * so schools turn and bank together instead of sliding along rails.
 */
function Species({ species, flocks, lite }: { species: Species; flocks: Flock[]; lite: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const groups = useMemo(() => flocks.filter((flock) => flock.species === species), [flocks, species]);
  const sims = useMemo(() => {
    const list: Sim[] = [];
    let seed = species.length * 97;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    groups.forEach((flock, index) => {
      for (let k = 0; k < flock.count; k += 1) {
        const a = rand() * Math.PI * 2;
        list.push({
          flock: index,
          pos: new THREE.Vector3(
            flock.x + Math.cos(a) * flock.radius * rand(),
            flock.y + (rand() - 0.5) * flock.radius * 0.5,
            flock.z + Math.sin(a) * flock.radius * rand(),
          ),
          vel: new THREE.Vector3(Math.cos(a + 1.57), 0, Math.sin(a + 1.57)).multiplyScalar(SPEED[species][0] * 2),
          yaw: 0,
          roll: 0,
          size: LENGTH[species] * (0.85 + rand() * 0.3),
        });
      }
    });
    return list;
  }, [groups, species]);

  const geometry = useMemo(() => {
    const geo = fishGeometry(species, lite);
    const phase = new Float32Array(sims.length);
    const beat = new Float32Array(sims.length);
    sims.forEach((_, i) => {
      phase[i] = (i * 2.399) % (Math.PI * 2);
      beat[i] = (species === "chromis" ? 11 : species === "angel" ? 5 : 8) * (0.85 + ((i * 0.37) % 0.3));
    });
    geo.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phase, 1));
    geo.setAttribute("aBeat", new THREE.InstancedBufferAttribute(beat, 1));
    return geo;
  }, [species, lite, sims]);
  const material = useMemo(() => fishMaterial(species), [species]);

  const simsRef = useRef<Sim[]>([]);
  useLayoutEffect(() => {
    simsRef.current = sims;
  }, [sims]);

  useLayoutEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useFrame(({ clock }, delta) => {
    const mesh = ref.current;
    const sims = simsRef.current;
    if (!mesh || !sims.length) return;
    const dt = Math.min(delta, 0.05);
    const time = clock.elapsedTime;
    const calm = reefScroll.reducedMotion ? 0.25 : 1;
    const rush = 1 + Math.abs(reefScroll.lean) * 1.6;
    const [minSpeed, maxSpeed] = SPEED[species];

    for (let i = 0; i < sims.length; i += 1) {
      const fish = sims[i];
      const flock = groups[fish.flock];
      home.set(
        flock.x + Math.sin(time * 0.11 + fish.flock * 1.7) * flock.radius,
        flock.y + Math.sin(time * 0.17 + fish.flock) * flock.radius * 0.25,
        flock.z + Math.cos(time * 0.09 + fish.flock * 2.3) * flock.radius,
      );
      steer.set(0, 0, 0);
      center.set(0, 0, 0);
      heading.set(0, 0, 0);
      let mates = 0;
      for (let j = 0; j < sims.length; j += 1) {
        const other = sims[j];
        if (j === i || other.flock !== fish.flock) continue;
        tmp.subVectors(fish.pos, other.pos);
        const d = tmp.length();
        if (d < fish.size * 1.6 && d > 0.0001) steer.addScaledVector(tmp, 1.6 / (d * d));
        center.add(other.pos);
        heading.add(other.vel);
        mates += 1;
      }
      if (mates) {
        center.divideScalar(mates).sub(fish.pos);
        steer.addScaledVector(center, 0.45);
        heading.divideScalar(mates).sub(fish.vel);
        steer.addScaledVector(heading, 0.8);
      }
      tmp.subVectors(home, fish.pos);
      const far = tmp.length() / flock.radius;
      steer.addScaledVector(tmp, 0.25 + Math.max(0, far - 1) * 0.9);
      steer.y -= fish.vel.y * 1.5;
      const limit = 1.4;
      if (steer.lengthSq() > limit * limit) steer.setLength(limit);
      fish.vel.addScaledVector(steer, dt);
      const speed = THREE.MathUtils.clamp(fish.vel.length(), minSpeed, maxSpeed);
      fish.vel.setLength(speed);
      fish.pos.addScaledVector(fish.vel, dt * calm * rush);

      const yaw = Math.atan2(-fish.vel.z, fish.vel.x);
      let turn = yaw - fish.yaw;
      if (turn > Math.PI) turn -= Math.PI * 2;
      if (turn < -Math.PI) turn += Math.PI * 2;
      fish.yaw += turn * (1 - Math.exp(-dt * 6));
      fish.roll += (THREE.MathUtils.clamp(-turn * 2.5, -0.6, 0.6) - fish.roll) * (1 - Math.exp(-dt * 4));
      const pitch = Math.asin(THREE.MathUtils.clamp(fish.vel.y / speed, -0.6, 0.6));

      dummy.position.copy(fish.pos);
      dummy.rotation.set(fish.roll, fish.yaw, pitch, "YZX");
      dummy.scale.setScalar(fish.size);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (!sims.length) return null;
  return <instancedMesh ref={ref} args={[geometry, material, sims.length]} frustumCulled={false} />;
}

export default function Fishes({ flocks, lite }: { flocks: Flock[]; lite: boolean }) {
  return (
    <>
      {(["chromis", "clown", "tang", "angel"] as const).map((species) => (
        <Species key={species} species={species} flocks={flocks} lite={lite} />
      ))}
    </>
  );
}
