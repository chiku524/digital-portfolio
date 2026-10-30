import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Procedural reef life. Everything is generated once at load (no model downloads),
 * merged into a single geometry per kind and drawn with instancing.
 * Local conventions: flora grows up +Y from y = -0.5 (to match the existing piece
 * layout); fish are 1 unit long, nose toward +X.
 */

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Keep only position/normal (+ optional color / part) so merges line up. */
function clean(geo: THREE.BufferGeometry, shade = 1, part?: number) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  for (const key of Object.keys(g.attributes)) {
    if (key !== "position" && key !== "normal") g.deleteAttribute(key);
  }
  const n = g.attributes.position.count;
  const color = new Float32Array(n * 3).fill(shade);
  g.setAttribute("color", new THREE.BufferAttribute(color, 3));
  if (part !== undefined) g.setAttribute("part", new THREE.BufferAttribute(new Float32Array(n).fill(part), 1));
  return g;
}

function shadeByHeight(geo: THREE.BufferGeometry, low: number, high: number, y0: number, y1: number) {
  const pos = geo.attributes.position;
  const col = geo.attributes.color;
  for (let i = 0; i < pos.count; i += 1) {
    const t = THREE.MathUtils.clamp((pos.getY(i) - y0) / (y1 - y0), 0, 1);
    const v = low + (high - low) * t * t;
    col.setXYZ(i, v, v, v);
  }
}

function segment(from: THREE.Vector3, to: THREE.Vector3, r0: number, r1: number, sides: number) {
  const dir = to.clone().sub(from);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(r1, r0, len, sides, 1, true);
  geo.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  geo.applyQuaternion(q);
  geo.translate(from.x, from.y, from.z);
  return geo;
}

/** Staghorn / finger coral: recursive tapering branches with pale growing tips. */
export function branchingCoral(kind: "staghorn" | "finger", lite: boolean) {
  const rand = rng(kind === "staghorn" ? 11 : 23);
  const parts: THREE.BufferGeometry[] = [];
  const maxDepth = kind === "staghorn" ? (lite ? 2 : 3) : 2;
  const kids = kind === "staghorn" ? 3 : 2;
  const sides = lite ? 4 : 6;
  const grow = (from: THREE.Vector3, dir: THREE.Vector3, len: number, r: number, depth: number) => {
    const to = from.clone().addScaledVector(dir, len);
    const rTip = r * (depth === maxDepth ? 0.55 : 0.72);
    parts.push(clean(segment(from, to, r, rTip, sides)));
    if (depth === maxDepth) {
      const cap = new THREE.SphereGeometry(rTip, sides, 3);
      cap.translate(to.x, to.y, to.z);
      parts.push(clean(cap));
      return;
    }
    for (let k = 0; k < kids; k += 1) {
      const spin = (k / kids) * Math.PI * 2 + rand() * 1.2;
      const tilt = 0.35 + rand() * 0.45;
      const axis = new THREE.Vector3(Math.cos(spin), 0, Math.sin(spin)).cross(dir).normalize();
      const next = dir.clone().applyAxisAngle(axis, tilt).normalize();
      next.y = Math.max(next.y, 0.25);
      grow(to, next.normalize(), len * (0.7 + rand() * 0.15), rTip, depth + 1);
    }
  };
  const trunks = kind === "staghorn" ? 3 : 4;
  for (let i = 0; i < trunks; i += 1) {
    const a = (i / trunks) * Math.PI * 2;
    const dir = new THREE.Vector3(Math.cos(a) * 0.35, 1, Math.sin(a) * 0.35).normalize();
    const base = new THREE.Vector3(Math.cos(a) * 0.05, -0.5, Math.sin(a) * 0.05);
    grow(base, dir, kind === "staghorn" ? 0.42 : 0.5, kind === "staghorn" ? 0.07 : 0.11, 1);
  }
  const geo = mergeGeometries(parts)!;
  geo.computeBoundingBox();
  shadeByHeight(geo, 0.62, 1.15, -0.5, geo.boundingBox!.max.y);
  return geo;
}

/** Brain coral: a flattened dome with meandering grooves carved in and shaded dark. */
export function brainCoral(lite: boolean) {
  let geo: THREE.BufferGeometry = new THREE.IcosahedronGeometry(0.55, lite ? 3 : 5);
  geo.deleteAttribute("normal");
  geo.deleteAttribute("uv");
  geo = mergeVertices(geo);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i).normalize();
    const s =
      Math.sin(v.x * 17 + Math.sin(v.z * 13) * 1.8 + Math.sin(v.y * 9)) *
      Math.sin(v.z * 17 + Math.sin(v.x * 11) * 1.8);
    const ridge = 1 - Math.abs(s);
    const groove = Math.pow(ridge, 3);
    const r = 0.55 * (1 - groove * 0.06);
    v.multiplyScalar(r);
    if (v.y < 0) v.y *= 0.3;
    pos.setXYZ(i, v.x, v.y, v.z);
    const shade = 1 - groove * 0.55;
    colors.set([shade, shade, shade], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

/** Sea fan (gorgonian): a flat lace of forking, cross-linked branches. */
export function seaFan(lite: boolean) {
  const rand = rng(37);
  const parts: THREE.BufferGeometry[] = [];
  const depthMax = lite ? 4 : 5;
  const grow = (from: THREE.Vector3, angle: number, len: number, r: number, depth: number) => {
    const to = from.clone().add(new THREE.Vector3(Math.sin(angle) * len, Math.cos(angle) * len, (rand() - 0.5) * 0.02));
    parts.push(clean(segment(from, to, r, r * 0.78, 3)));
    if (depth >= depthMax) return;
    const spread = 0.32 + rand() * 0.2;
    grow(to, angle - spread, len * 0.8, r * 0.78, depth + 1);
    grow(to, angle + spread, len * 0.8, r * 0.78, depth + 1);
  };
  grow(new THREE.Vector3(0, -0.55, 0), 0, 0.28, 0.035, 1);
  const geo = mergeGeometries(parts)!;
  geo.computeBoundingBox();
  const box = geo.boundingBox!;
  const sx = 1 / Math.max(0.001, box.max.x - box.min.x);
  const sy = 1.15 / Math.max(0.001, box.max.y - box.min.y);
  geo.scale(sx, sy, 1);
  geo.translate(0, -0.55 - box.min.y * sy, 0);
  shadeByHeight(geo, 0.7, 1.1, -0.55, 0.6);
  return geo;
}

/** Anemone: a soft column crowned with a ring of tapering tentacles. */
export function anemone(lite: boolean) {
  const rand = rng(53);
  const parts: THREE.BufferGeometry[] = [];
  const column = new THREE.CylinderGeometry(0.2, 0.24, 0.16, 12, 1, false);
  column.translate(0, 0.08, 0);
  parts.push(clean(column, 0.55));
  const count = lite ? 22 : 44;
  for (let i = 0; i < count; i += 1) {
    const a = i * 2.399963;
    const ring = Math.sqrt((i + 0.5) / count) * 0.19;
    const from = new THREE.Vector3(Math.cos(a) * ring, 0.15, Math.sin(a) * ring);
    const out = 0.35 + (ring / 0.19) * 0.9;
    const dir = new THREE.Vector3(Math.cos(a) * out, 1, Math.sin(a) * out).normalize();
    const len = 0.26 + rand() * 0.16;
    const seg = clean(segment(from, from.clone().addScaledVector(dir, len), 0.022, 0.009, 4));
    shadeByHeight(seg, 0.75, 1.25, 0.15, 0.5);
    parts.push(seg);
  }
  const geo = mergeGeometries(parts)!;
  return geo;
}

/** A tuft of curved sea-grass blades rooted at y = 0. */
export function seaGrass(lite: boolean) {
  const rand = rng(71);
  const parts: THREE.BufferGeometry[] = [];
  const blades = lite ? 5 : 9;
  for (let i = 0; i < blades; i += 1) {
    const h = 0.45 + rand() * 0.55;
    const blade = new THREE.PlaneGeometry(0.045, h, 1, 5);
    blade.translate(0, h / 2, 0);
    const pos = blade.attributes.position;
    const lean = (rand() - 0.5) * 0.5;
    for (let k = 0; k < pos.count; k += 1) {
      const t = pos.getY(k) / h;
      pos.setX(k, pos.getX(k) * (1 - t * 0.85) + lean * t * t);
    }
    blade.rotateY(rand() * Math.PI);
    blade.translate((rand() - 0.5) * 0.25, 0, (rand() - 0.5) * 0.25);
    const g = clean(blade);
    shadeByHeight(g, 0.55, 1.1, 0, 1);
    parts.push(g);
  }
  const geo = mergeGeometries(parts)!;
  return geo;
}

/** Kelp: a ruffled ribbon frond from y = -0.5 to 0.5. */
export function kelpFrond(lite: boolean) {
  const seg = lite ? 10 : 18;
  const geo = new THREE.PlaneGeometry(0.2, 1, 2, seg);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i);
    const t = y + 0.5;
    const edge = Math.abs(pos.getX(i)) / 0.1;
    pos.setX(i, pos.getX(i) * (0.4 + Math.sin(t * Math.PI) * 0.9));
    pos.setZ(i, Math.sin(t * 22) * 0.03 * edge + Math.sin(t * 4) * 0.05);
  }
  geo.computeVertexNormals();
  const g = clean(geo);
  shadeByHeight(g, 0.6, 1.1, -0.5, 0.5);
  return g;
}

/** Rock: noisy, smooth-shaded boulder with algae-tinted tops and dark crevices. */
export function rock(lite: boolean) {
  let geo: THREE.BufferGeometry = new THREE.IcosahedronGeometry(0.55, lite ? 2 : 3);
  geo.deleteAttribute("normal");
  geo.deleteAttribute("uv");
  geo = mergeVertices(geo);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i).normalize();
    const n =
      Math.sin(v.x * 4.1 + 1.3) * Math.sin(v.y * 3.7 + 0.4) * Math.sin(v.z * 4.6 + 2.1) * 0.22 +
      Math.sin(v.x * 11 + v.z * 7) * 0.04;
    v.multiplyScalar(0.55 * (1 + n));
    if (v.y < -0.1) v.y = -0.1 + (v.y + 0.1) * 0.4;
    pos.setXYZ(i, v.x, v.y, v.z);
    const top = THREE.MathUtils.clamp(v.y / 0.4, 0, 1);
    const crevice = 0.75 + n * 1.2;
    colors.set([crevice * (1 - top * 0.25), crevice * (1 + top * 0.25), crevice * (1 - top * 0.1)], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

export type Species = "clown" | "tang" | "angel" | "chromis";

const BODY: Record<Species, { h: number; w: number; dorsal: number; tail: number; fork: number }> = {
  clown: { h: 0.46, w: 0.26, dorsal: 0.12, tail: 0.22, fork: 0.02 },
  tang: { h: 0.66, w: 0.18, dorsal: 0.1, tail: 0.3, fork: 0.1 },
  angel: { h: 0.82, w: 0.15, dorsal: 0.24, tail: 0.3, fork: 0 },
  chromis: { h: 0.4, w: 0.2, dorsal: 0.08, tail: 0.26, fork: 0.12 },
};

function fin(points: [number, number][], z: number, part = 1) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ShapeGeometry(shape, 4);
  geo.translate(0, 0, z);
  return clean(geo, 1, part);
}

/** A fish: tapered laterally-flattened body, forked tail, dorsal/anal/pectoral fins and eyes. */
export function fish(species: Species, lite: boolean) {
  const b = BODY[species];
  const body = new THREE.SphereGeometry(0.5, lite ? 14 : 22, lite ? 10 : 16);
  const pos = body.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const taper = x < 0 ? 1 + x * 1.25 : 1 - x * x * 0.6;
    const hump = 1 + Math.max(0, pos.getY(i)) * 0.15;
    pos.setXYZ(i, x * 0.92, pos.getY(i) * b.h * taper * hump, pos.getZ(i) * b.w * taper);
  }
  body.computeVertexNormals();
  const parts: THREE.BufferGeometry[] = [clean(body, 1, 0)];
  const t = b.tail;
  parts.push(
    fin(
      [
        [-0.4, 0.02],
        [-0.42 - t, t * 0.95],
        [-0.38 - t + b.fork, 0],
        [-0.42 - t, -t * 0.95],
        [-0.4, -0.02],
      ],
      0,
    ),
  );
  const top = b.h * 0.42;
  const d = b.dorsal;
  parts.push(
    fin(
      [
        [0.22, top * 0.9],
        [0.08, top + d],
        [-0.22, top + d * (species === "angel" ? 1.4 : 0.8)],
        [-0.42, top * 0.2],
        [-0.3, top * 0.6],
      ],
      0,
    ),
  );
  parts.push(
    fin(
      [
        [0.02, -top * 0.85],
        [-0.12, -top - d * (species === "angel" ? 1.1 : 0.5)],
        [-0.38, -top * 0.35],
        [-0.3, -top * 0.6],
      ],
      0,
    ),
  );
  for (const side of [1, -1]) {
    const pec = fin(
      [
        [0.18, 0],
        [0.02, 0.06],
        [-0.04, -0.06],
      ],
      0,
    );
    pec.rotateX(side * 1.1);
    pec.translate(0, -b.h * 0.08, side * b.w * 0.38);
    parts.push(pec);
    const eye = new THREE.SphereGeometry(0.05, 8, 6);
    eye.scale(1, 1, 0.5);
    eye.translate(0.31, b.h * 0.07, side * b.w * 0.36);
    parts.push(clean(eye, 1, 2));
  }
  const geo = mergeGeometries(parts)!;
  return geo;
}
