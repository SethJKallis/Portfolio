import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  Compass,
  Map,
  RotateCcw,
  RefreshCw,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  exhibits,
  zones,
  type DriveInput,
  type Telemetry,
  type ZoneId,
} from "./gameData";
import type { BreakMaterial } from "./impactMath";
import { raceSpawn, trackSamples, mapPosition, circuitLength } from "./circuit";
import { PortfolioReader } from "./PortfolioReader";
import { nextPortfolioStop } from "./portfolioStops";
const World = lazy(() => import("./World"));
const initial: Telemetry = {
  x: raceSpawn.x,
  z: raceSpawn.z,
  speed: 0,
  heading: raceSpawn.heading,
  near: null,
  airborne: false,
  flipped: false,
  progress: 0,
  lap: 0,
  lapTime: 0,
  bestLap: null,
};
function raceTime(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${(seconds % 60).toFixed(1).padStart(4, "0")}`;
}
const mapPath =
  trackSamples
    .map((p, i) => {
      const m = mapPosition(p.x, p.z);
      return `${i ? "L" : "M"}${m.x},${m.z}`;
    })
    .join(" ") + " Z";
function AudioEngine() {
  let context: AudioContext | null = null,
    oscillator: OscillatorNode | null = null;
  return {
    set(enabled: boolean) {
      if (enabled) {
        if (!context) {
          context = new AudioContext();
          oscillator = context.createOscillator();
          const gain = context.createGain(),
            filter = context.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.value = 190;
          oscillator.type = "sawtooth";
          oscillator.frequency.value = 35;
          gain.gain.value = 0.015;
          oscillator.connect(filter).connect(gain).connect(context.destination);
          oscillator.start();
        }
        void context.resume();
      } else if (context) void context.suspend();
    },
    speed(speed: number) {
      if (context && oscillator)
        oscillator.frequency.setTargetAtTime(
          32 + speed * 1.2,
          context.currentTime,
          0.1,
        );
    },
    honk() {
      if (!context || context.state !== "running") return;
      const o = context.createOscillator(),
        g = context.createGain();
      o.type = "square";
      o.frequency.value = 260;
      g.gain.setValueAtTime(0.04, context.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.25);
      o.connect(g).connect(context.destination);
      o.start();
      o.stop(context.currentTime + 0.26);
    },
    crash(speed: number) {
      if (!context || context.state !== "running") return;
      const buffer = context.createBuffer(
          1,
          Math.floor(context.sampleRate * 0.2),
          context.sampleRate,
        ),
        samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++)
        samples[i] = (Math.random() * 2 - 1) * (1 - i / samples.length);
      const source = context.createBufferSource(),
        filter = context.createBiquadFilter(),
        gain = context.createGain();
      source.buffer = buffer;
      filter.type = "lowpass";
      filter.frequency.value = 1300;
      gain.gain.setValueAtTime(
        Math.min(0.075, 0.025 + speed * 0.003),
        context.currentTime,
      );
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.2);
      source.connect(filter).connect(gain).connect(context.destination);
      source.start();
    },
    dispose() {
      void context?.close();
    },
  };
}
export default function App() {
  const input = useRef<DriveInput>({
    keys: new Set(),
    throttle: 0,
    steering: 0,
    brake: false,
    jump: 0,
    reset: 0,
  });
  const [telemetry, setTelemetry] = useState(initial),
    [inspection, setInspection] = useState<string | null>(null),
    [ready, setReady] = useState(false),
    [help, setHelp] = useState(false),
    [map, setMap] = useState(false),
    [sound, setSound] = useState(false),
    [visited, setVisited] = useState<ZoneId[]>([]),
    [worldReset, setWorldReset] = useState(0),
    [impactToast, setImpactToast] = useState<string | null>(null);
  const impactTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const discovered = useRef(new Set<ZoneId>());
  const audio = useRef<ReturnType<typeof AudioEngine> | null>(null),
    near = useRef<string | null>(null),
    paused = useRef(false),
    inspectionRef = useRef<string | null>(null);
  if (!audio.current) audio.current = AudioEngine();
  const introduced = useRef(false);
  const openPortfolio = useCallback((id: string) => {
    paused.current = true;
    inspectionRef.current = id;
    input.current.keys.clear();
    input.current.throttle = 0;
    input.current.steering = 0;
    input.current.brake = false;
    const chapter = exhibits.find((entry) => entry.id === id)?.zone;
    if (chapter && !discovered.current.has(chapter)) {
      discovered.current.add(chapter);
      setVisited([...discovered.current]);
    }
    setHelp(false);
    setInspection(id);
  }, []);
  const onReady = useCallback(() => {
    setReady(true);
    if (!introduced.current) {
      introduced.current = true;
      openPortfolio("hello");
    }
  }, [openPortfolio]);
  const onBreak = useCallback((kind: BreakMaterial, speed: number) => {
    setImpactToast(
      {
        crate: "CRATE SPLINTERED",
        pot: "POT SHATTERED",
        barrier: "BARRIER BUSTED",
      }[kind],
    );
    audio.current?.crash(speed);
    if (impactTimer.current) clearTimeout(impactTimer.current);
    impactTimer.current = setTimeout(() => setImpactToast(null), 2200);
  }, []);
  const rebuild = useCallback(() => {
    input.current.keys.clear();
    input.current.throttle = 0;
    input.current.steering = 0;
    input.current.brake = false;
    setWorldReset((n) => n + 1);
    setInspection(null);
    setHelp(false);
    setImpactToast(null);
    if (impactTimer.current) clearTimeout(impactTimer.current);
  }, []);
  const onTelemetry = useCallback(
    (t: Telemetry) => {
      setTelemetry(t);
      near.current = t.near;
      audio.current?.speed(t.speed);
      if (paused.current) return;
      const stop = nextPortfolioStop(t, discovered.current);
      if (stop) {
        openPortfolio(stop.firstEntry);
      }
    },
    [openPortfolio],
  );
  useEffect(() => {
    paused.current = help || !!inspection;
    inspectionRef.current = inspection;
    input.current.keys.clear();
    input.current.throttle = 0;
    input.current.steering = 0;
    input.current.brake = false;
  }, [help, inspection]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.metaKey || e.altKey || (e.ctrlKey && e.key !== "Control")) return;
      const k = e.key.toLowerCase();
      if (
        (k === " " || k === "enter") &&
        e.target instanceof HTMLElement &&
        e.target.closest("button,a,select,input,textarea")
      )
        return;
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k))
        e.preventDefault();
      if (
        e.repeat &&
        ["e", "enter", " ", "r", "v", "m", "h", "escape"].includes(k)
      )
        return;
      if (k === "escape") {
        setInspection(null);
        setHelp(false);
        return;
      }
      if (k === "m") {
        setMap((v) => !v);
        return;
      }
      if (k === "r") {
        input.current.reset++;
        setInspection(null);
        return;
      }
      if (k === "v") {
        rebuild();
        return;
      }
      if (k === "h") {
        audio.current?.honk();
        return;
      }
      if (k === "e" || k === "enter") {
        if (inspectionRef.current) setInspection(null);
        else if (near.current) openPortfolio(near.current);
        else openPortfolio("hello");
        return;
      }
      if (paused.current) return;
      input.current.keys.add(k);
      if (k === " ") input.current.jump++;
    };
    const up = (e: KeyboardEvent) =>
      input.current.keys.delete(e.key.toLowerCase());
    const blur = () => {
      input.current.keys.clear();
      input.current.throttle = 0;
      input.current.steering = 0;
      input.current.brake = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [rebuild, openPortfolio]);
  useEffect(() => () => audio.current?.dispose(), []);
  useEffect(
    () => () => {
      if (impactTimer.current) clearTimeout(impactTimer.current);
    },
    [],
  );
  const current = exhibits.find((e) => e.id === (inspection || telemetry.near)),
    zone = zones.find(
      (z) => Math.hypot(z.x - telemetry.x, z.z - telemetry.z) < 14,
    );
  function reset() {
    input.current.reset++;
    setInspection(null);
  }
  function touch(
    control: "throttle" | "steering" | "brake",
    value: number | boolean,
  ) {
    if (control === "brake") input.current.brake = Boolean(value);
    else input.current[control] = Number(value);
  }
  return (
    <main className="game-shell">
      <div
        className="game-canvas"
        tabIndex={0}
        aria-label="Seth Kallis’s racing portfolio. CV chapters open automatically at career landmarks. Drive with WASD. Press E to revisit a chapter."
      >
        <Suspense fallback={null}>
          <World
            input={input}
            inspection={inspection}
            paused={help || !!inspection}
            onTelemetry={onTelemetry}
            onReady={onReady}
            onBreak={onBreak}
            worldReset={worldReset}
            visited={visited}
          />
        </Suspense>
      </div>
      {!ready && (
        <div className="loading-screen">
          <span className="loading-mark">
            SK<span>↗</span>
          </span>
          <p>BUILDING A WORLD WORTH EXPLORING</p>
          <div className="loading-road">
            <i />
          </div>
          <small>Starting your engine…</small>
        </div>
      )}
      <header className="game-header">
        <div className="game-brand">
          <span className="brand-mark">
            s<span>k</span>
          </span>
          <div>
            SETH KALLIS<small>GRAND PRIX / THE PORTFOLIO CIRCUIT</small>
          </div>
        </div>
        <div className="header-tools">
          <button
            className="portfolio-link"
            onClick={() => openPortfolio("hello")}
            aria-label="Browse portfolio"
          >
            <BookOpen size={16} />
            <span>Portfolio</span>
          </button>
          <button
            className="hud-button"
            onClick={rebuild}
            aria-label="Rebuild world (V)"
            title="Rebuild world (V)"
          >
            <RefreshCw size={16} />
          </button>
          <a
            href="/seth-kallis-profile.pdf"
            target="_blank"
            rel="noreferrer"
            className="cv-link"
            aria-label="Open professional profile PDF"
          >
            <BookOpen size={15} />
            <span>Read CV</span>
            <ArrowUpRight size={12} />
          </a>
          <button
            onClick={() => {
              setSound((s) => {
                audio.current?.set(!s);
                return !s;
              });
            }}
            className="hud-button"
            aria-label={sound ? "Mute engine audio" : "Enable engine audio"}
          >
            {sound ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
          <button
            onClick={() => setHelp(true)}
            className="hud-button help-button"
            aria-label="Open driving controls"
          >
            ?
          </button>
        </div>
      </header>
      {!inspection && (
        <div className="location-hud">
          <span className="live-dot" />
          <p>
            {zone ? zone.name : "Kallis Motor Circuit"}
            <small>
              {zone
                ? zone.description
                : `${(circuitLength / 1000).toFixed(2)} km · Straights, switchbacks & infield esses`}
            </small>
          </p>
        </div>
      )}
      {inspection && (
        <PortfolioReader
          entryId={inspection}
          onSelect={openPortfolio}
          onClose={() => setInspection(null)}
        />
      )}
      {!inspection && (
        <aside className="race-hud" aria-label="Lap timing">
          <div>
            <small>LAP</small>
            <strong>{String(telemetry.lap + 1).padStart(2, "0")}</strong>
          </div>
          <div>
            <small>CURRENT</small>
            <strong>{raceTime(telemetry.lapTime)}</strong>
          </div>
          <div className="best-lap">
            <small>BEST</small>
            <strong>
              {telemetry.bestLap === null ? "—" : raceTime(telemetry.bestLap)}
            </strong>
          </div>
          <i className="lap-progress">
            <i style={{ width: `${telemetry.progress * 100}%` }} />
          </i>
        </aside>
      )}
      {!inspection && (
        <div className="bottom-left">
          <button
            className="map-toggle"
            onClick={() => setMap((v) => !v)}
            aria-expanded={map}
            aria-label="Toggle world map"
          >
            <Map size={16} />
            <span>{map ? "Close map" : "Circuit map"}</span>
            <kbd>M</kbd>
          </button>
          <div className="discovery">
            <span>{String(visited.length).padStart(2, "0")}</span> / 05 CHAPTERS
            EXPLORED
          </div>
          <nav className="stamp-collection" aria-label="Portfolio chapters">
            {zones.map((z, i) => (
              <button
                key={z.id}
                className={visited.includes(z.id) ? "collected" : ""}
                onClick={() => openPortfolio(z.firstEntry)}
                aria-label={`Read ${z.name}`}
                title={z.name}
              >
                {visited.includes(z.id) ? "✓" : String(i + 1).padStart(2, "0")}
              </button>
            ))}
          </nav>
        </div>
      )}
      {impactToast && !inspection && (
        <div className="impact-toast" role="status">
          <span>✦</span>
          <strong>{impactToast}</strong>
        </div>
      )}
      {map && !inspection && (
        <aside className="world-map" aria-label="World map">
          <div className="map-top">
            KALLIS MOTOR CIRCUIT
            <Compass size={14} />
          </div>
          <div className="map-plot">
            <svg
              className="circuit-map-svg"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d={mapPath} fill="none" stroke="#839b87" strokeWidth="10" />
              <path d={mapPath} fill="none" stroke="#263f41" strokeWidth="7" />
              <path
                d={mapPath}
                fill="none"
                stroke="#ced8b3"
                strokeWidth=".5"
                strokeDasharray="1 2"
              />
            </svg>
            {zones.map((z, i) => (
              <div
                key={z.id}
                className={`map-zone ${visited.includes(z.id) ? "discovered" : ""}`}
                style={{
                  left: `${mapPosition(z.x, z.z).x}%`,
                  top: `${mapPosition(z.x, z.z).z}%`,
                }}
              >
                <span style={{ background: z.color }}>{i + 1}</span>
                <small>{z.name}</small>
              </div>
            ))}
            <div
              className="map-car"
              style={{
                left: `${mapPosition(telemetry.x, telemetry.z).x}%`,
                top: `${mapPosition(telemetry.x, telemetry.z).z}%`,
                transform: `translate(-50%,-50%) rotate(${-telemetry.heading}rad)`,
              }}
            >
              ▲
            </div>
          </div>
          <p>CV chapters open automatically when you reach a landmark.</p>
        </aside>
      )}
      {!inspection && (
        <div className="drive-instructions">
          <div className="compact-controls">
            <span>
              WASD / ARROWS <b>drive</b>
            </span>
            <i />
            <span>
              SHIFT <b>boost</b>
            </span>
            <i />
            <span>
              SPACE <b>hop</b>
            </span>
            <i />
            <span>
              DRAG <b>look around</b>
            </span>
          </div>
        </div>
      )}
      {!inspection && current && (
        <button
          className="interaction-prompt"
          onClick={() => openPortfolio(current.id)}
        >
          <kbd>E</kbd>
          <span>
            <small>REVISIT THIS CHAPTER / E</small>
            {zones.find((z) => z.id === current.zone)?.name}
          </span>
          <ChevronRight size={18} />
        </button>
      )}
      {!inspection && (
        <div className="speed-hud">
          <div>
            <strong>
              {String(Math.round(telemetry.speed)).padStart(2, "0")}
            </strong>
            <span>KM/H</span>
          </div>
          <div className="speed-track">
            <i
              style={{
                width: `${Math.min(100, (telemetry.speed / 160) * 100)}%`,
              }}
            />
          </div>
          <small
            className={`vehicle-state ${telemetry.flipped ? "flipped" : ""}`}
          >
            {telemetry.flipped
              ? "TUMBLED · R TO RESET"
              : telemetry.airborne
                ? "AIRBORNE"
                : "WHEELS DOWN"}
          </small>
          <button onClick={reset} aria-label="Respawn vehicle">
            <RotateCcw size={13} />
            <span>UNSTUCK</span>
            <kbd>R</kbd>
          </button>
        </div>
      )}
      {!inspection && (
        <div className="touch-driving" aria-label="Touch driving controls">
          <div>
            {[
              { label: "Steer left", value: 1, symbol: "←" },
              { label: "Steer right", value: -1, symbol: "→" },
            ].map((c) => (
              <button
                key={c.label}
                aria-label={c.label}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  touch("steering", c.value);
                }}
                onPointerUp={() => touch("steering", 0)}
                onPointerCancel={() => touch("steering", 0)}
              >
                {c.symbol}
              </button>
            ))}
          </div>
          <div>
            <button
              className="jump-touch"
              aria-label="Jump vehicle"
              onClick={() => input.current.jump++}
            >
              ↟
            </button>
            {[
              { label: "Reverse", value: -1, symbol: "↓" },
              { label: "Accelerate", value: 1, symbol: "↑" },
            ].map((c) => (
              <button
                key={c.label}
                aria-label={c.label}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  touch("throttle", c.value);
                }}
                onPointerUp={() => touch("throttle", 0)}
                onPointerCancel={() => touch("throttle", 0)}
              >
                {c.symbol}
              </button>
            ))}
          </div>
        </div>
      )}
      {help && (
        <div className="help-backdrop" onClick={() => setHelp(false)}>
          <section
            className="controls-card"
            role="dialog"
            aria-modal="true"
            aria-label="Driving controls"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="help-close hud-button"
              onClick={() => setHelp(false)}
              aria-label="Close driving controls"
            >
              <X size={18} />
            </button>
            <p className="mini-label">YOUR GRID BRIEFING</p>
            <h1>
              Find your
              <br />
              <em>racing line.</em>
            </h1>
            <p>
              Take on 1.28 km of pit straights, infield esses, switchbacks, and
              technical corners. You control every turn: W accelerates, A/D
              steers, and S brakes before a bend. Shift boosts on the straights.
              Open any portfolio chapter from the Portfolio button, or press E
              near a landmark. New chapters open automatically and pause the car
              while you read. Jumps and smashable props stay in optional outside
              lanes. R recovers the car.
            </p>
            <div className="controls-list">
              {[
                ["W / ↑", "Accelerate"],
                ["S / ↓", "Brake & reverse"],
                ["A D / ← →", "Steer"],
                ["SHIFT", "Boost"],
                ["B / CTRL", "Handbrake"],
                ["SPACE", "Jump"],
                ["E / ENTER", "Inspect nearby exhibit"],
                ["DRAG / WHEEL", "Orbit / zoom camera"],
                ["R", "Respawn at the start"],
                ["V", "Rebuild all props & debris"],
                ["M / H", "Map / honk (audio on)"],
              ].map(([key, label]) => (
                <div key={key}>
                  <kbd>{key}</kbd>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <button
              className="drive-button"
              onClick={() => {
                setHelp(false);
              }}
            >
              Let’s drive <ChevronRight size={17} />
            </button>
          </section>
        </div>
      )}
      <div className="sr-only" role="status" aria-live="polite">
        {!inspection && current
          ? `Near ${current.title}. Press E to inspect.`
          : zone
            ? zone.name
            : ""}
      </div>
    </main>
  );
}
