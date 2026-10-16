import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const url = "http://127.0.0.1:4173/";
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
async function ready() {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(800) });
    return r.ok && r.headers.get("x-portfolio") === "seth-kallis-world";
  } catch {
    return false;
  }
}
await access(resolve(root, "dist/index.html")).catch(() => {
  throw new Error(
    "Build the portfolio first: npm install, then npm run build.",
  );
});
if (!(await ready())) {
  // A local preview, bound only to this computer. No cloud service is required.
  const child = spawn(process.execPath, [resolve(root, "scripts/serve.mjs")], {
    cwd: root,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
  let attempts = 0;
  while (!(await ready())) {
    if (attempts++ > 30)
      throw new Error(
        "Could not start the portfolio. Check whether another application is using port 4173.",
      );
    await delay(200);
  }
}
const browser =
  process.platform === "win32"
    ? spawn("rundll32.exe", ["url.dll,FileProtocolHandler", url], {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      })
    : spawn(process.platform === "darwin" ? "open" : "xdg-open", [url], {
        detached: true,
        stdio: "ignore",
      });
browser.unref();
console.log(`Portfolio ready at ${url}`);
