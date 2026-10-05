import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { chipClass, matchedChipClass } from "./chipStyles";

const SHOW_DELAY_MS = 80;
const GAP = 6;
const EDGE = 8;

export function MoreHobbies({ hobbies, highlight = [] }: { hobbies: string[]; highlight?: string[] }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const chipRef = useRef<HTMLLIElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);

  const count = hobbies.length;
  const label = `${count} more ${count === 1 ? "hobby" : "hobbies"}`;
  const matches = hobbies.filter((hobby) => highlight.includes(hobby)).length;

  const chipLabel = matches > 0 ? `${label}, ${matches} ${matches === 1 ? "matches" : "match"} your filter` : label;

  const hide = useCallback(() => {
    window.clearTimeout(timer.current);
    setOpen(false);
    setPosition(null);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useLayoutEffect(() => {
    if (!open) return;
    const chip = chipRef.current;
    const tooltip = tooltipRef.current;
    if (!chip || !tooltip) return;

    const anchor = chip.getBoundingClientRect();
    const { offsetWidth: width, offsetHeight: height } = tooltip;
    const left = Math.max(EDGE, Math.min(anchor.left, window.innerWidth - width - EDGE));
    const below = anchor.bottom + GAP;
    const top = below + height > window.innerHeight - EDGE ? Math.max(EDGE, anchor.top - GAP - height) : below;
    setPosition({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") hide();
    };
    
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, hide]);

  return (
    <>
      <li
        ref={chipRef}
        aria-label={chipLabel}
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => {
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => setOpen(true), SHOW_DELAY_MS);
        }}
        onMouseLeave={hide}
        className={`shrink-0 ${matches > 0 ? matchedChipClass : chipClass}`}
      >
        +{count}
      </li>

      {open &&
        createPortal(
          <div
            ref={tooltipRef}
            id={id}
            role="tooltip"
            className="pointer-events-none fixed z-50 w-max max-w-[240px] rounded-xl border border-line bg-surface p-3"
            style={position ?? { top: 0, left: 0, visibility: "hidden" }}
          >
            <p className="mb-1.5 text-[12px] text-muted">{label}</p>
            <ul className="flex flex-wrap gap-1.5">
              {hobbies.map((hobby) => {
                const matched = highlight.includes(hobby);
                return (
                  <li key={hobby} className={matched ? matchedChipClass : chipClass}>
                    {hobby}
                    {matched && <span className="sr-only"> (matches your filter)</span>}
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body
        )}
    </>
  );
}
