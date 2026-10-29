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
  skills: [pose(0.35, -1.85, -54, 0.9, -2.45, -60), pose(-0.35, -2.85, -62, 0.1, -3.45, -68)],
  approach: [pose(0.15, -3.15, -64, 0.1, -3.7, -70), pose(0.25, -3.7, -72, -0.1, -4.15, -78)],
  contact: [pose(0.1, -3.85, -74, 0, -4.4, -81), pose(-0.05, -3.55, -77, 0, -4.55, -84)],
};

const stationA: V3 = { x: 0, y: 0, z: 0 };
const stationB: V3 = { x: 0, y: 0, z: 0 };

export function writeStation(index: number, out: V3) {
  const t = count <= 1 ? 0 : clamp(index, 0, count - 1) / (count - 1);
  out.x = Math.sin(t * Math.PI * 3) * 3.8;
  out.y = 0.2 - t * 3;
  out.z = -7 - t * 44;
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
    pos.y = y + 1.45;
    pos.z = z + 4.35;
    look.x = x;
    look.y = y + 0.28;
    look.z = z - 0.35;
    return;
  }
  pos.x = x - 0.9;
  pos.y = y + 1.2;
  pos.z = z + 4.9;
  look.x = x + 1.15;
  look.y = y + 0.08;
  look.z = z - 0.85;
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
