export type PerfTier = "low" | "mid" | "high";

type NavigatorHints = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };

/** Static hints: core count, memory, touch/mobile and data-saver. */
export function staticTier(): PerfTier {
  const nav = navigator as NavigatorHints;
  const cores = nav.hardwareConcurrency || 4;
  const memory = nav.deviceMemory ?? 8;
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent) || window.matchMedia("(pointer: coarse)").matches;
  if (nav.connection?.saveData || cores <= 2 || memory <= 2) return "low";
  if (mobile || cores <= 4 || memory <= 4) return "mid";
  return "high";
}

/** Samples requestAnimationFrame for a short window and returns the average FPS. */
export function sampleFps(duration = 700): Promise<number> {
  return new Promise((resolve) => {
    let frames = 0;
    let start = 0;
    const step = (time: number) => {
      if (!start) start = time;
      frames += 1;
      if (time - start < duration) requestAnimationFrame(step);
      else resolve((frames * 1000) / Math.max(1, time - start));
    };
    requestAnimationFrame(step);
    // Hidden tabs never fire rAF; don't block on them.
    setTimeout(() => resolve(60), duration + 600);
  });
}

/** Combines static hints with a measured frame rate; a struggling main thread drops one tier. */
export async function detectTier(): Promise<PerfTier> {
  const base = staticTier();
  const fps = await sampleFps();
  if (fps < 32) return base === "high" ? "mid" : "low";
  return base;
}

export const TIER_DPR: Record<PerfTier, [number, number]> = {
  low: [0.75, 1],
  mid: [1, 1.25],
  high: [1, 1.5],
};
