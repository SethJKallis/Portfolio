import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

// Opt-in local QA overlay. Never mounted for an ordinary portfolio visit.
export function RenderDiagnostics() {
  const { gl } = useThree();
  const output = useRef<HTMLOutputElement | null>(null);
  const samples = useRef<number[]>([]);
  const elapsed = useRef(0);
  useEffect(() => {
    const node = document.createElement("output");
    node.setAttribute("aria-label", "Rendering diagnostics");
    node.style.cssText =
      "position:absolute;z-index:60;left:50%;bottom:8px;transform:translateX(-50%);background:#112e2bee;color:#e9f0c7;padding:7px 12px;font:11px monospace;white-space:nowrap;pointer-events:none";
    node.textContent = "Measuring rendering…";
    gl.domElement.closest(".game-shell")?.appendChild(node);
    output.current = node;
    return () => node.remove();
  }, [gl]);
  useFrame((_, dt) => {
    if (dt <= 0 || dt > 1) return;
    samples.current.push(dt);
    elapsed.current += dt;
    if (elapsed.current < 2) return;
    const sorted = [...samples.current].sort((a, b) => a - b);
    if (output.current)
      output.current.textContent = `${Math.round(samples.current.length / elapsed.current)} FPS · p95 ${Math.round(sorted[Math.floor(sorted.length * 0.95)] * 1000)} ms · ${gl.info.render.calls} draws · ${Math.round(gl.info.render.triangles / 1000)}k triangles · DPR ${gl.getPixelRatio().toFixed(2)}`;
    samples.current = [];
    elapsed.current = 0;
  });
  return null;
}
