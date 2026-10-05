import { useMemo, useState } from "react";
import { ActiveFilters } from "./components/ActiveFilters";
import { Header } from "./components/Header";
import { MobileFiltersSheet } from "./components/MobileFiltersSheet";
import { ResultsHeader } from "./components/ResultsHeader";
import { Sidebar } from "./components/Sidebar";
import { SortControls } from "./components/SortControls";
import { EmptyState, ErrorState, LoadingState } from "./components/States";
import { UserList } from "./components/UserList";
import { useFacetQueries, useUsersQuery } from "./hooks/queries";
import { useViewState } from "./hooks/useViewState";
import { toggleValue } from "./lib/values";
import { facetSelectionCount, hasActiveFilters, toFilters } from "./state/viewState";

export default function App() {
  const { state, update, clearFilters } = useViewState();
  const [filtersOpen, setFiltersOpen] = useState(false);

  // The list and both sidebar lists all depend on the same view state, so
  // changing the search or a filter refreshes all three together.
  const users = useUsersQuery(state);
  const facets = useFacetQueries(state);

  const loadedUsers = useMemo(() => users.data?.pages.flatMap((page) => page.users) ?? [], [users.data]);
  const total = users.data?.pages[0]?.total;


  const listKey = JSON.stringify([toFilters(state), state.sort, state.dir]);

  let results;
  if (users.isPending) {
    results = <LoadingState />;
  } else if (users.isError && !users.data) {
    results = <ErrorState onRetry={() => void users.refetch()} />;
  } else if (loadedUsers.length === 0) {
    results = <EmptyState hasFilters={hasActiveFilters(state)} onClear={clearFilters} />;
  } else {
    results = (
      <UserList
        key={listKey}
        users={loadedUsers}
        hasNextPage={users.hasNextPage}
        isFetchingNextPage={users.isFetchingNextPage}
        isFetchNextPageError={users.isFetchNextPageError}
        fetchNextPage={() => void users.fetchNextPage()}
        highlightHobbies={state.hobbies}
      />
    );
  }

  return (
    <div className="flex h-dvh flex-col">
      <Header
        search={state.search}
        onSearch={(search) => update({ search }, { replace: true })}
        sort={state.sort}
        dir={state.dir}
        onSortChange={(patch) => update(patch)}
        filterCount={facetSelectionCount(state)}
        onOpenFilters={() => setFiltersOpen(true)}
      />

      <div className="flex min-h-0 flex-1">
        <div className="hidden min-h-0 lg:flex">
          <Sidebar
            facets={facets}
            selection={state}
            onToggleNationality={(value) => update({ nationalities: toggleValue(state.nationalities, value) })}
            onToggleHobby={(value) => update({ hobbies: toggleValue(state.hobbies, value) })}
          />
        </div>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-end justify-between gap-3 px-4 pb-3 pt-4 lg:px-7 lg:pt-[22px]">
            <ResultsHeader total={total} loaded={loadedUsers.length} sort={state.sort} dir={state.dir} />
            <div className="lg:hidden">
              <SortControls sort={state.sort} dir={state.dir} onChange={(patch) => update(patch)} compact />
            </div>
          </div>

          <ActiveFilters
            filters={state}
            onClearSearch={() => update({ search: "" })}
            onRemoveNationality={(value) => update({ nationalities: toggleValue(state.nationalities, value) })}
            onRemoveHobby={(value) => update({ hobbies: toggleValue(state.hobbies, value) })}
            onClearAll={clearFilters}
          />

          {results}
        </main>
      </div>

      <MobileFiltersSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        applied={toFilters(state)}
        onApply={(selection) => update(selection)}
      />
    </div>
  );
}
