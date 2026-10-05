import type { Filters, SortDir, SortField } from "../state/viewState";
import type { FacetCount, UsersPage } from "./types";

const API_BASE: string = import.meta.env.VITE_API_BASE ?? "/api";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function filterParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search !== "") params.set("search", filters.search);
  for (const nationality of filters.nationalities) params.append("nationality", nationality);
  for (const hobby of filters.hobbies) params.append("hobby", hobby);
  return params;
}

async function getJson<T>(path: string, params: URLSearchParams, signal?: AbortSignal): Promise<T> {
  const query = params.toString();
  const response = await fetch(`${API_BASE}${path}${query ? `?${query}` : ""}`, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new ApiError(`Request to ${path} failed (${response.status})`, response.status);
  }
  return (await response.json()) as T;
}

export interface UsersRequest {
  filters: Filters;
  sort: SortField;
  dir: SortDir;
  page: number;
  pageSize: number;
}

export function fetchUsers(request: UsersRequest, signal?: AbortSignal): Promise<UsersPage> {
  const params = filterParams(request.filters);
  params.set("sort", request.sort);
  params.set("dir", request.dir);
  params.set("page", String(request.page));
  params.set("pageSize", String(request.pageSize));
  return getJson<UsersPage>("/users", params, signal);
}

export async function fetchTopHobbies(filters: Filters, signal?: AbortSignal): Promise<FacetCount[]> {
  const body = await getJson<{ hobbies: FacetCount[] }>("/hobbies/top", filterParams(filters), signal);
  return body.hobbies;
}

export async function fetchTopNationalities(filters: Filters, signal?: AbortSignal): Promise<FacetCount[]> {
  const body = await getJson<{ nationalities: FacetCount[] }>(
    "/nationalities/top",
    filterParams(filters),
    signal
  );
  return body.nationalities;
}
