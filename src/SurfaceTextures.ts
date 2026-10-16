import * as THREE from "three";

export function surfaceTexture(kind: "asphalt" | "grass" | "carbon" | "bark") {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  const pixels = ctx.createImageData(512, 512);
  let seed = 7331;
  for (let y = 0; y < 512; y++)
    for (let x = 0; x < 512; x++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const noise = seed / 4294967296;
      let value = 150 + (noise - 0.5) * 55;
      if (kind === "asphalt")
        value =
          160 +
          (noise - 0.5) * 40 +
          Math.sin(x * 0.08) * Math.sin(y * 0.05) * 4;
      if (kind === "grass")
        value =
          180 +
          (noise - 0.5) * 38 +
          Math.sin(x * 0.035) * Math.sin(y * 0.045) * 16;
      if (kind === "carbon")
        value =
          75 +
          ((Math.floor(x / 8) + Math.floor(y / 8)) % 2 ? 25 : 0) +
          noise * 14;
      if (kind === "bark")
        value =
          150 + Math.sin(x * 0.38 + Math.sin(y * 0.02) * 2) * 32 + noise * 35;
      const i = (y * 512 + x) * 4;
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
      pixels.data[i + 3] = 255;
    }
  ctx.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}
