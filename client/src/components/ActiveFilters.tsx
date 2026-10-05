import { hasActiveFilters, type Filters } from "../state/viewState";
import { CloseIcon } from "./icons";

interface Props {
  filters: Filters;
  onClearSearch: () => void;
  onRemoveNationality: (value: string) => void;
  onRemoveHobby: (value: string) => void;
  onClearAll: () => void;
}

function FilterChip({ kind, value, onRemove }: { kind: string; value: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Remove filter: ${kind} ${value}`}
      className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-[12.5px] font-medium text-accent"
    >
      <span className="text-muted">{kind}</span>
      {value}
      <CloseIcon size={10} />
    </button>
  );
}

// The applied filters as removable chips, plus "Clear all" — so what's
// narrowing the list is always visible
export function ActiveFilters({ filters, onClearSearch, onRemoveNationality, onRemoveHobby, onClearAll }: Props) {
  if (!hasActiveFilters(filters)) return null;
  const search = filters.search.trim();

  return (
    <div
      role="group"
      aria-label="Active filters"
      className="flex flex-nowrap items-center gap-2 overflow-x-auto px-4 pb-3 lg:flex-wrap lg:overflow-visible lg:px-7"
    >
      {search !== "" && <FilterChip kind="Name contains" value={`“${search}”`} onRemove={onClearSearch} />}
      {filters.nationalities.map((value) => (
        <FilterChip key={`n-${value}`} kind="Nationality" value={value} onRemove={() => onRemoveNationality(value)} />
      ))}
      {filters.hobbies.map((value) => (
        <FilterChip key={`h-${value}`} kind="Hobby" value={value} onRemove={() => onRemoveHobby(value)} />
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="shrink-0 px-1 text-[12.5px] font-semibold text-muted hover:text-ink"
      >
        Clear all
      </button>
    </div>
  );
}
