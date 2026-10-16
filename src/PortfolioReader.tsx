import { useEffect, useRef, type CSSProperties } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import { exhibits, zones } from "./gameData";

export function PortfolioReader({
  entryId,
  onSelect,
  onClose,
}: {
  entryId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const close = useRef<HTMLButtonElement>(null),
    panel = useRef<HTMLElement>(null);
  const entry = exhibits.find((e) => e.id === entryId) ?? exhibits[0];
  const sector = zones.find((z) => z.id === entry.zone)!;
  const entries = exhibits.filter((e) => e.zone === entry.zone);
  const index = entries.findIndex((e) => e.id === entry.id);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    close.current?.focus();
    return () => previous?.focus();
  }, []);
  return (
    <div className="reader-backdrop" onClick={onClose}>
      <section
        ref={panel}
        className="portfolio-reader"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reader-title"
        style={{ "--sector-color": sector.color } as CSSProperties}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key !== "Tab") return;
          const controls =
            panel.current?.querySelectorAll<HTMLElement>("button, a[href]");
          if (!controls?.length) return;
          const first = controls[0],
            last = controls[controls.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
          if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }}
      >
        <header className="reader-header">
          <span>SETH KALLIS / PORTFOLIO & CV</span>
          <button ref={close} onClick={onClose} aria-label="Close portfolio">
            <X size={19} />
            <kbd>ESC</kbd>
          </button>
        </header>
        <nav className="reader-sectors" aria-label="Portfolio chapters">
          {zones.map((z, i) => (
            <button
              key={z.id}
              aria-current={entry.zone === z.id ? "page" : undefined}
              onClick={() => onSelect(z.firstEntry)}
            >
              <b>{String(i + 1).padStart(2, "0")}</b>
              <span>
                {["About", "Work", "Projects", "Education", "Contact"][i]}
              </span>
            </button>
          ))}
        </nav>
        <div className="reader-chapter">
          <span style={{ background: sector.color }} />
          {sector.name}
          <small>
            {index + 1} / {entries.length}
          </small>
        </div>
        <div className="reader-entries" aria-label="Chapter entries">
          {entries.map((e) => (
            <button
              key={e.id}
              aria-pressed={e.id === entry.id}
              onClick={() => onSelect(e.id)}
            >
              {e.title}
            </button>
          ))}
        </div>
        <article className="reader-article" key={entry.id}>
          <small>{entry.kicker}</small>
          <h1 id="reader-title">{entry.title}</h1>
          <p className="reader-subtitle">{entry.subtitle}</p>
          <p className="reader-body">{entry.text}</p>
          <div className="reader-links">
            {entry.url && (
              <a
                href={entry.url}
                target={entry.url.startsWith("mailto:") ? undefined : "_blank"}
                rel="noreferrer"
              >
                {entry.action ?? "Learn more"}
                <ArrowUpRight size={16} />
              </a>
            )}
            {entry.source && (
              <a href={entry.source} target="_blank" rel="noreferrer">
                Source code
                <ArrowUpRight size={16} />
              </a>
            )}
          </div>
        </article>
        <footer className="reader-footer">
          <button
            aria-label="Previous note"
            onClick={() =>
              onSelect(
                entries[(index + entries.length - 1) % entries.length].id,
              )
            }
          >
            <ChevronLeft size={17} />
            Previous
          </button>
          <button className="resume-racing" onClick={onClose}>
            Continue driving
            <ChevronRight size={17} />
          </button>
          <button
            aria-label="Next note"
            onClick={() => onSelect(entries[(index + 1) % entries.length].id)}
          >
            Next
            <ChevronRight size={17} />
          </button>
        </footer>
        <p className="reader-footnote">
          The car is paused. Continue driving when you’re ready.
        </p>
      </section>
    </div>
  );
}
