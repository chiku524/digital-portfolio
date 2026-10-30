import { PROJECTS } from "@/content/portfolio";
import { writeStation, type V3 } from "./path";

export type Piece = {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  sx: number;
  sy: number;
  sz: number;
  color: string;
};

export type Swimmer = {
  x: number;
  y: number;
  z: number;
  speed: number;
  phase: number;
  scale: number;
  color: string;
  dir: number;
  top: number;
};

export type Flock = {
  species: "clown" | "tang" | "angel" | "chromis";
  count: number;
  x: number;
  y: number;
  z: number;
  radius: number;
};

export type ReefData = {
  anemones: Piece[];
  grass: Piece[];
  flocks: Flock[];
  branches: Piece[];
  fans: Piece[];
  brains: Piece[];
  tips: Piece[];
  kelp: Piece[];
  rocks: Piece[];
  discs: Piece[];
  fish: Swimmer[];
  bubbles: Swimmer[];
};

const CORAL = ["#ff5d4a", "#ff7a3c", "#ff4d88", "#ffb15a", "#e056ff", "#2ec4b6", "#ff8f6b", "#7d5cff"];
const FANS = ["#ff6d9a", "#ff8f6b", "#c86bff", "#46d6c5"];
const TIPS = ["#ffe1c4", "#ffd0e4", "#d8fff6", "#fff1b8"];
const KELP = ["#147a5a", "#0e5e48", "#1f9a6a", "#0b4a3c"];
const ROCKS = ["#3a4e4c", "#2c3e44", "#4d615c"];
const SAND = ["#2f615c", "#245650", "#3d7368"];
const ANEMONES = ["#ff9ec7", "#c7a6ff", "#9fffd0", "#ffd27a", "#ff8f8f"];
const GRASS = ["#2f8f5a", "#3c9e63", "#2a7a52", "#4a9a5a"];
const FISH = ["#ff8a3d", "#ffd15c", "#4cc3ff", "#f4f7f6", "#ff5fa2"];

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function piece(
  x: number,
  y: number,
  z: number,
  rx: number,
  ry: number,
  rz: number,
  sx: number,
  sy: number,
  sz: number,
  color: string,
): Piece {
  return { x, y, z, rx, ry, rz, sx, sy, sz, color };
}

export function buildReef(lite: boolean): ReefData {
  const rand = mulberry32(524);
  const branches: Piece[] = [];
  const fans: Piece[] = [];
  const brains: Piece[] = [];
  const tips: Piece[] = [];
  const kelp: Piece[] = [];
  const rocks: Piece[] = [];
  const discs: Piece[] = [];
  const fish: Swimmer[] = [];
  const bubbles: Swimmer[] = [];
  const spot: V3 = { x: 0, y: 0, z: 0 };
  const anemones: Piece[] = [];
  const grass: Piece[] = [];
  const flocks: Flock[] = [];

  const addColony = (x: number, y: number, z: number, scale: number) => {
    brains.push(
      piece(
        x,
        y - 0.82 * scale,
        z,
        rand() * 0.3,
        rand() * Math.PI,
        rand() * 0.2,
        (0.9 + rand() * 0.5) * scale,
        (0.55 + rand() * 0.25) * scale,
        (0.85 + rand() * 0.4) * scale,
        CORAL[Math.floor(rand() * CORAL.length)],
      ),
    );
    discs.push(
      piece(x, y - 1.12 * scale, z, -Math.PI / 2, 0, rand(), 1.7 * scale, 1.7 * scale, 1, SAND[Math.floor(rand() * SAND.length)]),
    );
    const branchCount = lite ? 4 : 7;
    for (let k = 0; k < branchCount; k += 1) {
      const ang = rand() * Math.PI * 2;
      const rad = (0.25 + rand() * 0.95) * scale;
      branches.push(
        piece(
          x + Math.cos(ang) * rad,
          y - 0.55 * scale + rand() * 0.85 * scale,
          z + Math.sin(ang) * rad,
          (rand() - 0.5) * 0.8,
          rand() * Math.PI,
          (rand() - 0.5) * 0.6,
          0.45 + rand() * 0.7,
          (0.7 + rand() * 1.15) * scale,
          0.45 + rand() * 0.7,
          CORAL[k % CORAL.length],
        ),
      );
    }
    const fanCount = lite ? 1 : 2;
    for (let k = 0; k < fanCount; k += 1) {
      const ang = rand() * Math.PI * 2;
      fans.push(
        piece(
          x + Math.cos(ang) * 0.7 * scale,
          y - 0.2 * scale,
          z + Math.sin(ang) * 0.7 * scale,
          (rand() - 0.5) * 0.4,
          ang,
          (rand() - 0.5) * 0.3,
          (0.7 + rand() * 0.6) * scale,
          (0.9 + rand() * 0.7) * scale,
          1,
          FANS[k % FANS.length],
        ),
      );
    }
    const tipCount = lite ? 2 : 4;
    for (let k = 0; k < tipCount; k += 1) {
      const ang = rand() * Math.PI * 2;
      tips.push(
        piece(
          x + Math.cos(ang) * rand() * scale,
          y + rand() * 0.45 * scale,
          z + Math.sin(ang) * rand() * scale,
          0,
          0,
          0,
          0.45 + rand() * 0.7,
          0.45 + rand() * 0.7,
          0.45 + rand() * 0.7,
          TIPS[k % TIPS.length],
        ),
      );
    }
    const ground = y - 1.12 * scale;
    if (rand() > 0.5) {
      const ang = rand() * Math.PI * 2;
      const s = (0.8 + rand() * 0.6) * scale;
      anemones.push(
        piece(x + Math.cos(ang) * 1.1 * scale, ground, z + Math.sin(ang) * 1.1 * scale, 0, rand() * Math.PI, 0, s, s * (0.9 + rand() * 0.3), s, ANEMONES[Math.floor(rand() * ANEMONES.length)]),
      );
    }
    const tufts = lite ? 2 : 5;
    for (let k = 0; k < tufts; k += 1) {
      const ang = rand() * Math.PI * 2;
      const rad = (1.1 + rand() * 0.9) * scale;
      const s = 0.7 + rand() * 0.8;
      grass.push(
        piece(x + Math.cos(ang) * rad, ground - 0.05, z + Math.sin(ang) * rad, 0, rand() * Math.PI, 0, s, s * (0.8 + rand() * 0.8), s, GRASS[Math.floor(rand() * GRASS.length)]),
      );
    }
    if (rand() > 0.45) {
      rocks.push(
        piece(
          x + (rand() - 0.5) * 2.2,
          y - 1.05 * scale,
          z + (rand() - 0.5) * 2.2,
          rand(),
          rand(),
          rand(),
          0.5 + rand() * 0.8,
          0.28 + rand() * 0.35,
          0.5 + rand() * 0.7,
          ROCKS[Math.floor(rand() * ROCKS.length)],
        ),
      );
    }
  };

  PROJECTS.forEach((_, index) => {
    writeStation(index, spot);
    addColony(spot.x, spot.y, spot.z, 1);
  });

  const filler = lite ? 16 : 36;
  for (let i = 0; i < filler; i += 1) {
    const t = i / filler;
    const z = 6 - t * 94;
    const x = Math.sin(t * 17.2) * 6.5 + (rand() - 0.5) * 2.4;
    const y = 0.4 - t * 4.6;
    addColony(x, y, z, 0.55 + rand() * 0.45);
  }

  const kelpCount = lite ? 20 : 46;
  for (let i = 0; i < kelpCount; i += 1) {
    const deep = i < kelpCount * 0.62;
    const z = deep ? -52 - rand() * 22 : 2 - rand() * 48;
    const x = (rand() - 0.5) * (deep ? 8 : 12);
    const height = 1.6 + rand() * 2.4;
    kelp.push(
      piece(
        x,
        (deep ? -3.1 : -0.4) + height * 0.5,
        z,
        (rand() - 0.5) * 0.15,
        rand() * Math.PI,
        (rand() - 0.5) * 0.15,
        0.7 + rand() * 0.5,
        height,
        0.7 + rand() * 0.5,
        KELP[i % KELP.length],
      ),
    );
  }

  const fishCount = lite ? 22 : 46;
  for (let i = 0; i < fishCount; i += 1) {
    fish.push({
      x: (rand() - 0.5) * 7.2,
      y: 1.35 - rand() * 4.8,
      z: 8 - rand() * 88,
      speed: 0.55 + rand() * 0.95,
      phase: rand() * Math.PI * 2,
      scale: 0.95 + rand() * 1.15,
      color: FISH[i % FISH.length],
      dir: rand() > 0.45 ? 1 : -1,
      top: 0,
    });
  }

  const bubbleCount = lite ? 14 : 28;
  for (let i = 0; i < bubbleCount; i += 1) {
    const base = -2 - rand() * 4;
    bubbles.push({
      x: (rand() - 0.5) * 10,
      y: base + rand() * 6,
      z: 4 - rand() * 74,
      speed: 0.25 + rand() * 0.55,
      phase: rand() * Math.PI * 2,
      scale: 0.35 + rand() * 0.8,
      color: "#e7fffb",
      dir: 1,
      top: base + 7 + rand() * 3,
    });
  }

  const clownHomes = lite ? 3 : 7;
  anemones.forEach((home, index) => {
    if (index % 2 !== 0 || flocks.length >= clownHomes) return;
    flocks.push({ species: "clown", count: lite ? 2 : 3, x: home.x, y: home.y + 0.45 * home.sy, z: home.z, radius: 0.45 });
  });
  const schools: Array<[Flock["species"], number, number, number]> = [
    ["chromis", lite ? 3 : 6, lite ? 7 : 14, 1.6],
    ["tang", lite ? 2 : 4, 3, 2.2],
    ["angel", lite ? 2 : 3, 2, 2.4],
  ];
  schools.forEach(([species, groups, count, radius], s) => {
    for (let g = 0; g < groups; g += 1) {
      const t = (g + 0.3 + s * 0.27) / groups;
      flocks.push({
        species,
        count,
        x: Math.sin(t * 17.2 + s) * 3.6,
        y: 0.4 - t * 4.6 + 0.7 + rand() * 0.9,
        z: 6 - t * 86,
        radius,
      });
    }
  });

  return { anemones, grass, flocks, branches, fans, brains, tips, kelp, rocks, discs, fish, bubbles };
}
