import { useId, useState } from "react";
import type { FacetCount } from "../api/types";
import { includesValue } from "../lib/values";

export const COLLAPSED_COUNT = 8;

export function barPercent(count: number, scale: number): number {
  if (scale <= 0) return 0;
  return Math.min(100, (count / scale) * 100);
}

interface Props {
  title: string;
  hint: string;
  items: FacetCount[];
  selected: string[];
  onToggle: (value: string) => void;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  // "sidebar": filters within desktop view. "sheet": the mobile view
  variant?: "sidebar" | "sheet";
  // Show how many values are ticked
  showSelectedCount?: boolean;
}

export function FacetSection({
  title,
  hint,
  items,
  selected,
  onToggle,
  isLoading,
  isError,
  onRetry,
  variant = "sidebar",
  showSelectedCount = false,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const headingId = useId();
  const isSheet = variant === "sheet";

  const selectedCount = selected.length;
  const hasCountLabel = showSelectedCount && selectedCount > 0;
 
  const headerSpacing = isSheet ? `px-2 pt-[18px] ${hasCountLabel ? "" : "pb-1.5"}` : hasCountLabel ? "" : "mb-3";

  const visible =
    isSheet || expanded
      ? items
      : items.filter((item, index) => index < COLLAPSED_COUNT || includesValue(selected, item.value));

  const unselectedMax = Math.max(0, ...items.filter((item) => !includesValue(selected, item.value)).map((i) => i.count));
  const scale = unselectedMax > 0 ? unselectedMax : Math.max(0, ...items.map((i) => i.count));

  return (
    <section aria-labelledby={headingId}>
      <div className={`flex items-baseline justify-between ${headerSpacing}`}>
        <h3 id={headingId} className="font-display text-[11.5px] font-bold uppercase tracking-[0.06em]">
          {title}
        </h3>
        <span className="text-[11px] text-muted">{hint}</span>
      </div>

      {showSelectedCount && (
        <p
          aria-live="polite"
          className={hasCountLabel ? `text-[11px] text-muted ${isSheet ? "px-2 pb-1.5 pt-0.5" : "mb-3 mt-0.5"}` : "sr-only"}
        >
          {hasCountLabel ? `${selectedCount} selected` : ""}
        </p>
      )}

      {isLoading ? (
        <div role="status" aria-label={`Loading ${title.toLowerCase()}`} className="flex flex-col gap-1">
          {Array.from({ length: isSheet ? 6 : COLLAPSED_COUNT }, (_, i) => (
            <div key={i} className={`rounded-[7px] bg-line motion-safe:animate-pulse ${isSheet ? "h-10" : "h-7"}`} />
          ))}
        </div>
      ) : isError ? (
        <div role="alert" className="rounded-lg bg-danger-soft px-3 py-2.5 text-[12.5px] text-danger">
          Couldn't load {title.toLowerCase()}.{" "}
          <button type="button" onClick={onRetry} className="font-semibold underline">
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className="px-1.5 text-[12.5px] text-muted">No options for this search.</p>
      ) : (
        <ul className="flex flex-col gap-px">
          {visible.map((item) => {
            const isSelected = includesValue(selected, item.value);
            return (
              <li key={item.value}>
                <label
                  className={`flex cursor-pointer items-center rounded-[7px] ${
                    isSheet ? "min-h-11 gap-3.5 px-2" : "gap-2 px-1.5 py-1.5"
                  } ${isSelected ? "bg-accent-soft" : "hover:bg-black/[0.03]"}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(item.value)}
                    className={`shrink-0 accent-accent ${isSheet ? "size-5" : "size-3.5"}`}
                  />
                  <span
                    title={item.value}
                    className={`min-w-0 flex-1 truncate ${isSheet ? "text-[14.5px]" : "text-[13.5px]"} ${
                      isSelected ? "font-semibold" : ""
                    }`}
                  >
                    {item.value}
                  </span>
                  {!isSheet && (
                    <span
                      aria-hidden="true"
                      className={`h-1 w-11 shrink-0 overflow-hidden rounded-full ${
                        isSelected ? "bg-accent-track" : "bg-line"
                      }`}
                    >
                      <span
                        className={`block h-full rounded-full ${isSelected ? "bg-accent" : "bg-bar"}`}
                        style={{ width: `${barPercent(item.count, scale)}%` }}
                      />
                    </span>
                  )}
                  <span
                    className={`text-right tabular-nums ${isSheet ? "text-[13px]" : "w-7 text-[12px]"} ${
                      isSelected ? "font-semibold text-accent" : "text-muted"
                    }`}
                  >
                    {item.count.toLocaleString()}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {!isSheet && !isLoading && !isError && items.length > COLLAPSED_COUNT && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 px-1.5 text-[12.5px] font-semibold text-accent hover:underline"
        >
          {expanded ? "Show less" : `Show all ${items.length}`}
        </button>
      )}
    </section>
  );
}
