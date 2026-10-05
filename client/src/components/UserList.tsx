import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef } from "react";
import type { User } from "../api/types";
import { useElementWidth } from "../hooks/useElementWidth";
import { chunk, columnsForWidth } from "../lib/layout";
import { SpinnerIcon } from "./icons";
import { UserCard } from "./UserCard";

const ROW_HEIGHT_ESTIMATE = 134;

const PREFETCH_ROWS = 4;

interface Props {
  users: User[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
  fetchNextPage: () => void;
  highlightHobbies: string[];
}

export function UserList({
  users,
  hasNextPage,
  isFetchingNextPage,
  isFetchNextPageError,
  fetchNextPage,
  highlightHobbies,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const columns = columnsForWidth(useElementWidth(scrollRef));
  const rows = useMemo(() => chunk(users, columns), [users, columns]);

  // One extra "footer" row after the cards: a spinner while the next page loads,
  // or a retry button if it failed.
  const hasFooter = hasNextPage || isFetchNextPageError;
  const rowCount = rows.length + (hasFooter ? 1 : 0);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT_ESTIMATE,
    overscan: 4,
  });

  useEffect(() => {
    virtualizer.measure();
  }, [columns, virtualizer]);

  const virtualItems = virtualizer.getVirtualItems();
  const lastVisibleIndex = virtualItems.length > 0 ? virtualItems[virtualItems.length - 1].index : -1;

  // Infinite scroll
  useEffect(() => {
    if (rows.length === 0 || !hasNextPage || isFetchingNextPage || isFetchNextPageError) return;
    if (lastVisibleIndex >= rows.length - PREFETCH_ROWS) fetchNextPage();
  }, [lastVisibleIndex, rows.length, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  return (
    <div
      ref={scrollRef}
      role="region"
      aria-label="Search results"
      tabIndex={0}
      className="min-h-0 flex-1 overflow-y-auto px-4 lg:px-7"
    >
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualItems.map((item) => {
          const row = rows[item.index];
          return (
            <div
              key={item.key}
              ref={virtualizer.measureElement}
              data-index={item.index}
              className="absolute left-0 top-0 w-full pb-4"
              style={{ transform: `translateY(${item.start}px)` }}
            >
              {row ? (
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                  {row.map((user) => (
                    <UserCard key={user.id} user={user} highlight={highlightHobbies} />
                  ))}
                </div>
              ) : (
                <ListFooter isError={isFetchNextPageError} onRetry={fetchNextPage} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ListFooter({ isError, onRetry }: { isError: boolean; onRetry: () => void }) {
  if (isError) {
    return (
      <div role="alert" className="flex items-center justify-center gap-3 py-5 text-[13px] text-muted">
        Couldn't load more users.
        <button type="button" onClick={onRetry} className="font-semibold text-accent underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div role="status" className="flex items-center justify-center gap-2.5 py-5 text-[13px] text-muted">
      <SpinnerIcon />
      Loading more users…
    </div>
  );
}
