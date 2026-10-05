import { uniqueTrimmed } from "../lib/values";

export const SORT_FIELDS = ["first_name", "last_name", "age", "nationality"] as const;
export type SortField = (typeof SORT_FIELDS)[number];
export type SortDir = "asc" | "desc";

export interface Filters {
  search: string;
  nationalities: string[];
  hobbies: string[];
}

export interface ViewState extends Filters {
  sort: SortField;
  dir: SortDir;
}

export const DEFAULT_SORT: SortField = "first_name";
export const DEFAULT_DIR: SortDir = "asc";

export const SORT_LABELS: Record<SortField, string> = {
  first_name: "First name",
  last_name: "Last name",
  age: "Age",
  nationality: "Nationality",
};

function isSortField(value: string | null): value is SortField {
  return SORT_FIELDS.includes(value as SortField);
}

export function parseViewState(params: URLSearchParams): ViewState {
  const sort = params.get("sort");
  return {
    search: params.get("search") ?? "",
    nationalities: uniqueTrimmed(params.getAll("nationality")),
    hobbies: uniqueTrimmed(params.getAll("hobby")),
    sort: isSortField(sort) ? sort : DEFAULT_SORT,
    dir: params.get("dir") === "desc" ? "desc" : DEFAULT_DIR,
  };
}

export function toSearchParams(state: ViewState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.search.trim() !== "") params.set("search", state.search);
  for (const nationality of state.nationalities) params.append("nationality", nationality);
  for (const hobby of state.hobbies) params.append("hobby", hobby);
  if (state.sort !== DEFAULT_SORT) params.set("sort", state.sort);
  if (state.dir !== DEFAULT_DIR) params.set("dir", state.dir);
  return params;
}

export function toFilters(state: Filters): Filters {
  return {
    search: state.search.trim(),
    nationalities: state.nationalities,
    hobbies: state.hobbies,
  };
}

export function facetSelectionCount(state: Filters): number {
  return state.nationalities.length + state.hobbies.length;
}

export function hasActiveFilters(state: Filters): boolean {
  return state.search.trim() !== "" || facetSelectionCount(state) > 0;
}

export function directionLabel(field: SortField, dir: SortDir): string {
  if (field === "age") return dir === "asc" ? "Low–High" : "High–Low";
  return dir === "asc" ? "A–Z" : "Z–A";
}

export function sortSummary(field: SortField, dir: SortDir): string {
  return `${SORT_LABELS[field].toLowerCase()}, ${directionLabel(field, dir)}`;
}
