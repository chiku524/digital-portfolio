import * as THREE from "three";

/** One clock for every swaying / swimming shader, advanced once per frame. */
export const oceanTime = { value: 0 };
export const oceanMotion = { value: 1 };

type Sway = { amp: number; freq: number; base: number; height: number };

const SWAY_HEAD = /* glsl */ `
uniform float uTime;
uniform float uMotion;
uniform float uAmp;
uniform float uFreq;
uniform float uBase;
uniform float uHeight;
`;

const SWAY_BODY = /* glsl */ `
float hN = clamp((position.y - uBase) / uHeight, 0.0, 1.0);
vec3 ip = vec3(0.0);
#ifdef USE_INSTANCING
  ip = instanceMatrix[3].xyz;
#endif
float ph = ip.x * 0.7 + ip.z * 0.45;
float sway = sin(uTime * uFreq + ph - hN * 1.6) + 0.35 * sin(uTime * uFreq * 2.3 + ph * 1.7 + position.y * 3.0);
float bend = hN * hN * uAmp * uMotion;
transformed.x += sway * bend;
transformed.z += cos(uTime * uFreq * 0.8 + ph) * bend * 0.6;
`;

/** Rim-lit "subsurface" glow so soft tissue reads as translucent rather than plastic. */
const SSS = /* glsl */ `
float rim = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 2.2);
totalEmissiveRadiance += diffuseColor.rgb * (uSss * (0.35 + rim));
`;

export function reefMaterial(options: {
  roughness?: number;
  sss?: number;
  sway?: Sway;
  side?: THREE.Side;
  key: string;
}) {
  const mat = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    vertexColors: true,
    roughness: options.roughness ?? 0.7,
    metalness: 0,
    side: options.side ?? THREE.FrontSide,
  });
  const sway = options.sway;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSss = { value: options.sss ?? 0 };
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uSss;")
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\n${SSS}`);
    if (sway) {
      Object.assign(shader.uniforms, {
        uTime: oceanTime,
        uMotion: oceanMotion,
        uAmp: { value: sway.amp },
        uFreq: { value: sway.freq },
        uBase: { value: sway.base },
        uHeight: { value: sway.height },
      });
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", `#include <common>\n${SWAY_HEAD}`)
        .replace("#include <begin_vertex>", `#include <begin_vertex>\n${SWAY_BODY}`);
    }
  };
  mat.customProgramCacheKey = () => `reef-${options.key}`;
  return mat;
}

const PATTERNS: Record<string, string> = {
  clown: /* glsl */ `
    vec3 orange = vec3(1.0, 0.33, 0.04);
    vec3 white = vec3(0.98, 0.97, 0.95);
    vec3 black = vec3(0.02);
    float x = p.x;
    float w1 = 1.0 - smoothstep(0.045, 0.06, abs(x - 0.27 + p.y * 0.12));
    float w2 = 1.0 - smoothstep(0.065, 0.08, abs(x + 0.02 - p.y * 0.1));
    float w3 = 1.0 - smoothstep(0.03, 0.045, abs(x + 0.33));
    float e1 = 1.0 - smoothstep(0.075, 0.085, abs(x - 0.27 + p.y * 0.12));
    float e2 = 1.0 - smoothstep(0.095, 0.105, abs(x + 0.02 - p.y * 0.1));
    float e3 = 1.0 - smoothstep(0.06, 0.07, abs(x + 0.33));
    col = orange;
    col = mix(col, black, max(max(e1, e2), e3) * 0.9);
    col = mix(col, white, max(max(w1, w2), w3));
    if (part > 0.5) {
      col = mix(orange, black, smoothstep(0.08, 0.16, abs(p.y) - 0.18) + smoothstep(-0.58, -0.64, x));
    }
  `,
  tang: /* glsl */ `
    vec3 blue = vec3(0.05, 0.22, 0.85);
    vec3 black = vec3(0.01, 0.02, 0.06);
    vec3 yellow = vec3(1.0, 0.82, 0.08);
    float curve = p.y - (0.06 + 0.5 * (p.x - 0.05) * (p.x - 0.05) * -1.0 + 0.1);
    float palette = (1.0 - smoothstep(0.03, 0.05, abs(curve))) * step(-0.34, p.x) * step(p.x, 0.26);
    float loop = 1.0 - smoothstep(0.035, 0.05, abs(length((p.xy - vec2(-0.12, 0.0)) * vec2(1.0, 2.2)) - 0.12));
    col = blue;
    col = mix(col, black, max(palette, loop * step(p.y, 0.05)));
    col = mix(col, yellow, smoothstep(-0.42, -0.46, p.x));
    if (part > 0.5 && p.x > -0.4) col = mix(blue * 0.8, black, smoothstep(0.02, 0.1, abs(p.y) - 0.3));
  `,
  angel: /* glsl */ `
    vec3 navy = vec3(0.04, 0.1, 0.42);
    vec3 yellow = vec3(1.0, 0.8, 0.12);
    vec3 pale = vec3(0.55, 0.85, 1.0);
    float stripe = smoothstep(0.35, 0.6, sin((p.x * 0.8 + p.y * 0.55) * 52.0));
    col = mix(navy, yellow, stripe * smoothstep(0.3, 0.2, p.x));
    col = mix(col, vec3(0.02), (1.0 - smoothstep(0.03, 0.05, abs(p.x - 0.24))) * 0.9);
    col = mix(col, pale, (1.0 - smoothstep(0.02, 0.04, abs(p.x - 0.3))) * step(0.0, p.y));
    col = mix(col, yellow, smoothstep(-0.42, -0.46, p.x));
    if (part > 0.5 && p.x > -0.4) col = mix(navy, pale, smoothstep(0.05, 0.14, abs(p.y) - 0.38));
  `,
  chromis: /* glsl */ `
    vec3 belly = vec3(0.88, 0.94, 0.96);
    vec3 back = vec3(0.12, 0.48, 0.92);
    col = mix(belly, back, smoothstep(-0.08, 0.12, p.y));
    if (part > 0.5) col = back * 0.85;
  `,
};

/** Fish skin: species coloration from body-space patterns plus a swimming body wave. */
export function fishMaterial(species: string) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    roughness: species === "chromis" ? 0.28 : 0.42,
    metalness: species === "chromis" ? 0.35 : 0.05,
    sheen: 0.6,
    sheenColor: new THREE.Color("#cdeffc"),
    clearcoat: 0.6,
    clearcoatRoughness: 0.35,
    side: THREE.DoubleSide,
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
        attribute float aPhase;
        attribute float aBeat;
        varying vec3 vLocal;
        varying float vPart;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vLocal = position;
        vPart = part;
        float tailW = smoothstep(0.3, -0.75, position.x);
        float wave = sin(position.x * 6.5 - uTime * aBeat + aPhase);
        transformed.z += wave * (0.025 + tailW * tailW * 0.16) * uMotion;
        transformed.x -= abs(wave) * tailW * 0.015 * uMotion;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vLocal;
        varying float vPart;`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        {
          vec3 p = vLocal;
          float part = vPart;
          vec3 col = vec3(1.0);
          ${PATTERNS[species]}
          if (vPart > 1.5) {
            col = vec3(0.015);
          }
          col *= 0.82 + 0.18 * smoothstep(-0.2, 0.25, p.y);
          diffuseColor.rgb = col;
        }`,
      );
  };
  mat.customProgramCacheKey = () => `fish-${species}`;
  return mat;
}
