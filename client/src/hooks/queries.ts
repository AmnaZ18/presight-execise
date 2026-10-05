import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { fetchTopHobbies, fetchTopNationalities, fetchUsers } from "../api/client";
import { DEFAULT_DIR, DEFAULT_SORT, toFilters, type Filters, type ViewState } from "../state/viewState";

export const PAGE_SIZE = 60;

export function usersQueryKey(state: ViewState) {
  return ["users", toFilters(state), state.sort, state.dir] as const;
}

export function useUsersQuery(state: ViewState) {
  const filters = toFilters(state);
  return useInfiniteQuery({
    queryKey: usersQueryKey(state),
    queryFn: ({ pageParam, signal }) =>
      fetchUsers({ filters, sort: state.sort, dir: state.dir, page: pageParam, pageSize: PAGE_SIZE }, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
  });
}

export function useFacetQueries(filters: Filters) {
  const key = toFilters(filters);

  const hobbies = useQuery({
    queryKey: ["facet", "hobbies", key],
    queryFn: ({ signal }) => fetchTopHobbies(key, signal),
    placeholderData: keepPreviousData,
  });

  const nationalities = useQuery({
    queryKey: ["facet", "nationalities", key],
    queryFn: ({ signal }) => fetchTopNationalities(key, signal),
    placeholderData: keepPreviousData,
  });

  return { hobbies, nationalities };
}

export function useResultCount(filters: Filters) {
  const key = toFilters(filters);
  return useQuery({
    queryKey: ["count", key],
    queryFn: async ({ signal }) =>
      (await fetchUsers({ filters: key, sort: DEFAULT_SORT, dir: DEFAULT_DIR, page: 1, pageSize: 1 }, signal)).total,
    placeholderData: keepPreviousData,
  });
}
