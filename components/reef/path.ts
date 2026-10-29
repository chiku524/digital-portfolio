import { PROJECTS } from "@/content/portfolio";
import { clamp, smoothstep } from "./scroll";

export type V3 = { x: number; y: number; z: number };

type Pose = { pos: V3; look: V3 };

const count = PROJECTS.length;

function pose(px: number, py: number, pz: number, lx: number, ly: number, lz: number): Pose {
  return { pos: { x: px, y: py, z: pz }, look: { x: lx, y: ly, z: lz } };
}

const POSES: Record<string, [Pose, Pose]> = {
  top: [pose(0, 8.9, 12.2, 0.5, 2.1, -1.6), pose(0.1, 4.5, 7.4, 0.35, 1.45, -2.8)],
  about: [pose(0.15, 4, 6.6, 0.25, 1.15, -2.2), pose(-0.25, 1.9, 1, 0.55, 0.4, -5.5)],
  skills: [pose(0.35, -1.55, -47, 0.9, -2.15, -53), pose(-0.4, -2.55, -55, 0.1, -3.15, -61)],
  approach: [pose(0.15, -2.85, -57, 0.1, -3.35, -63), pose(0.3, -3.45, -65, -0.15, -3.85, -71)],
  contact: [pose(0.1, -3.55, -67, 0, -4.15, -74), pose(-0.05, -3.25, -70, 0, -4.35, -77)],
};

const stationA: V3 = { x: 0, y: 0, z: 0 };
const stationB: V3 = { x: 0, y: 0, z: 0 };

export function writeStation(index: number, out: V3) {
  const t = count <= 1 ? 0 : clamp(index, 0, count - 1) / (count - 1);
  out.x = Math.sin(t * Math.PI * 3) * 2.8;
  out.y = 0.15 - t * 2.7;
  out.z = -8 - t * 36;
  return out;
}

function mix(out: V3, a: V3, b: V3, t: number) {
  out.x = a.x + (b.x - a.x) * t;
  out.y = a.y + (b.y - a.y) * t;
  out.z = a.z + (b.z - a.z) * t;
}

function sampleWork(t: number, mobile: boolean, pos: V3, look: V3) {
  const f = clamp(t, 0, 1) * (count - 1);
  const i = Math.min(count - 2, Math.floor(f));
  const u = smoothstep(f - i);
  writeStation(i, stationA);
  writeStation(i + 1, stationB);
  const x = stationA.x + (stationB.x - stationA.x) * u;
  const y = stationA.y + (stationB.y - stationA.y) * u;
  const z = stationA.z + (stationB.z - stationA.z) * u;
  if (mobile) {
    pos.x = x;
    pos.y = y + 1.9;
    pos.z = z + 6.2;
    look.x = x;
    look.y = y + 0.62;
    look.z = z - 0.8;
    return;
  }
  pos.x = x - 0.45;
  pos.y = y + 1.28;
  pos.z = z + 5.15;
  look.x = x + 0.7;
  look.y = y + 0.12;
  look.z = z - 1.5;
}

export function samplePose(id: string, t: number, mobile: boolean, pos: V3, look: V3) {
  if (id === "work") {
    sampleWork(t, mobile, pos, look);
    return;
  }
  const pair = POSES[id] ?? POSES.top;
  const u = smoothstep(t);
  mix(pos, pair[0].pos, pair[1].pos, u);
  mix(look, pair[0].look, pair[1].look, u);
  if (mobile) {
    pos.y += 0.4;
    look.y += 0.55;
  }
}
