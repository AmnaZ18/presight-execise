import { sortSummary, type SortDir, type SortField } from "../state/viewState";

interface Props {
  total: number | undefined;
  loaded: number;
  sort: SortField;
  dir: SortDir;
}

export function ResultsHeader({ total, loaded, sort, dir }: Props) {
  const ready = total !== undefined;

  return (
    <div className="min-w-0">
      <h2 className="font-display text-[20px] font-bold leading-7 lg:text-[24px] lg:leading-8">
        {ready ? `${total.toLocaleString()} ${total === 1 ? "user" : "users"}` : "Loading…"}
      </h2>
      <p aria-live="polite" className="text-[12.5px] text-muted">
        {ready && (
          <>
            Showing {loaded.toLocaleString()} of {total.toLocaleString()}
            <span className="hidden lg:inline"> · sorted by {sortSummary(sort, dir)}</span>
          </>
        )}
      </p>
    </div>
  );
}
