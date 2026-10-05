import type { SortDir, SortField } from "../state/viewState";
import { PersonIcon, SlidersIcon } from "./icons";
import { SearchBar } from "./SearchBar";
import { SortControls } from "./SortControls";

interface Props {
  search: string;
  onSearch: (value: string) => void;
  sort: SortField;
  dir: SortDir;
  onSortChange: (patch: { sort?: SortField; dir?: SortDir }) => void;
  filterCount: number;
  onOpenFilters: () => void;
}

// One header for every screen size. On a wide screen it's a single row (logo,
// search, sort) 
// Below 1024px it wraps: logo on the first row, search + a Filters button on the
// second, and the sort controls move down next to the count.
export function Header({ search, onSearch, sort, dir, onSortChange, filterCount, onOpenFilters }: Props) {
  return (
    <header className="shrink-0 border-b border-line bg-surface">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 lg:h-[72px] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)_minmax(0,1fr)] lg:gap-x-[22px] lg:px-7 lg:py-0 xl:grid-cols-[minmax(0,1fr)_minmax(0,560px)_minmax(0,1fr)]">
        <div className="flex items-center gap-2.5">
          <span className="grid size-[30px] place-items-center rounded-lg border-[1.5px] border-ink">
            <PersonIcon size={15} />
          </span>
          <h1 className="font-display text-lg font-semibold tracking-tight">Directory</h1>
        </div>

        <div className="order-3 flex w-full items-center gap-2 lg:order-2 lg:w-auto lg:min-w-0">
          <div className="min-w-0 flex-1">
            <SearchBar value={search} onSearch={onSearch} />
          </div>
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={onOpenFilters}
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-[10px] bg-ink px-3.5 text-[13px] font-semibold text-white lg:hidden"
          >
            <SlidersIcon size={14} />
            Filters
            {filterCount > 0 && (
              <span
                aria-label={`${filterCount} applied`}
                className="grid size-4 place-items-center rounded-full bg-white text-[10.5px] font-bold text-ink"
              >
                {filterCount}
              </span>
            )}
          </button>
        </div>

        <div className="order-2 hidden lg:order-3 lg:block lg:justify-self-end">
          <SortControls sort={sort} dir={dir} onChange={onSortChange} />
        </div>
      </div>
    </header>
  );
}
