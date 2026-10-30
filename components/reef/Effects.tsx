"use client";

import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";

/** Premium finishing pass: soft bloom on emissive highlights, film grain and a lens vignette. */
export default function Effects({ mobile }: { mobile: boolean }) {
  return (
    <EffectComposer multisampling={mobile ? 0 : 2} enableNormalPass={false}>
      <Bloom
        mipmapBlur
        luminanceThreshold={0.82}
        luminanceSmoothing={0.22}
        intensity={mobile ? 0.55 : 0.85}
        radius={0.72}
      />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.32} />
      <Vignette eskil={false} offset={0.28} darkness={0.62} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
