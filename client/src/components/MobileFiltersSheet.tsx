import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useFacetQueries, useResultCount } from "../hooks/queries";
import { useScrollAnchor } from "../hooks/useScrollAnchor";
import { toggleValue } from "../lib/values";
import { hasActiveFilters, type Filters } from "../state/viewState";
import { FacetSection } from "./FacetSection";
import { CloseIcon } from "./icons";

export interface FacetSelection {
  nationalities: string[];
  hobbies: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  applied: Filters;
  onApply: (selection: FacetSelection) => void;
}

export function applyLabel(total: number | undefined, hasFilters: boolean): string {
  if (total === 0) return "No users match";
  if (!hasFilters) return "Show all users";
  if (total === undefined) return "Show results";
  return `Show ${total.toLocaleString()} ${total === 1 ? "user" : "users"}`;
}

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

export function MobileFiltersSheet(props: Props) {
  return props.open ? <SheetContent {...props} /> : null;
}

function SheetContent({ onClose, applied, onApply }: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  const [draft, setDraft] = useState<FacetSelection>({
    nationalities: applied.nationalities,
    hobbies: applied.hobbies,
  });


  const draftFilters: Filters = { search: applied.search, ...draft };
  const facets = useFacetQueries(draftFilters);
  const count = useResultCount(draftFilters);

  const scrollAnchor = useScrollAnchor(facets.nationalities.isFetching || facets.hobbies.isFetching);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden" onKeyDown={handleKeyDown}>
      <div className="absolute inset-0 bg-ink/55" onClick={onClose} aria-hidden="true" />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="sheet-enter absolute inset-x-0 bottom-0 top-[52px] flex flex-col rounded-t-[20px] bg-surface outline-none"
      >
        <div aria-hidden="true" className="flex shrink-0 justify-center pb-0.5 pt-2.5">
          <div className="h-1 w-10 rounded-full bg-line-strong" />
        </div>

        <div className="flex shrink-0 items-center justify-between border-b border-line py-1 pl-5 pr-2">
          <h2 id={titleId} className="font-display text-[22px] font-semibold">
            Filters
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setDraft({ nationalities: [], hobbies: [] })}
              className="min-h-11 px-3 text-[13.5px] font-semibold text-accent"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close filters"
              className="grid size-11 place-items-center"
            >
              <CloseIcon size={16} />
            </button>
          </div>
        </div>

        <div {...scrollAnchor} className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 [overflow-anchor:none]">
          <FacetSection
            variant="sheet"
            title="Nationality"
            hint="Top 20 · match any"
            items={facets.nationalities.data ?? []}
            selected={draft.nationalities}
            showSelectedCount
            onToggle={(value) => setDraft((d) => ({ ...d, nationalities: toggleValue(d.nationalities, value) }))}
            isLoading={facets.nationalities.isPending}
            isError={facets.nationalities.isError && !facets.nationalities.data}
            onRetry={() => void facets.nationalities.refetch()}
          />
          <div className="mt-2.5 border-t border-line" />
          <FacetSection
            variant="sheet"
            title="Hobbies"
            hint="Top 20 · match all"
            items={facets.hobbies.data ?? []}
            selected={draft.hobbies}
            showSelectedCount
            onToggle={(value) => setDraft((d) => ({ ...d, hobbies: toggleValue(d.hobbies, value) }))}
            isLoading={facets.hobbies.isPending}
            isError={facets.hobbies.isError && !facets.hobbies.data}
            onRetry={() => void facets.hobbies.refetch()}
          />
        </div>

        <div className="shrink-0 border-t border-line bg-surface px-4 pb-5 pt-3">
          <button
            type="button"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
            className="min-h-12 w-full rounded-xl bg-accent text-[15px] font-semibold text-white"
          >
            {applyLabel(count.data, hasActiveFilters(draftFilters))}
          </button>
        </div>
      </div>
    </div>
  );
}
