import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { parseViewState, toSearchParams, type ViewState } from "../state/viewState";

// The view state (search, filters, sort) lives in the URL to restore the same view
export function useViewState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const queryString = searchParams.toString();
  const state = useMemo(() => parseViewState(new URLSearchParams(queryString)), [queryString]);

  const update = useCallback(
    (patch: Partial<ViewState>, options?: { replace?: boolean }) => {
      setSearchParams((current) => toSearchParams({ ...parseViewState(current), ...patch }), {
        replace: options?.replace,
      });
    },
    [setSearchParams]
  );

  const clearFilters = useCallback(
    () => update({ search: "", nationalities: [], hobbies: [] }),
    [update]
  );

  return { state, update, clearFilters };
}
