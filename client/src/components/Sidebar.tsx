import type { useFacetQueries } from "../hooks/queries";
import { useScrollAnchor } from "../hooks/useScrollAnchor";
import type { Filters } from "../state/viewState";
import { FacetSection } from "./FacetSection";

interface Props {
  facets: ReturnType<typeof useFacetQueries>;
  selection: Pick<Filters, "nationalities" | "hobbies">;
  onToggleNationality: (value: string) => void;
  onToggleHobby: (value: string) => void;
}

export function Sidebar({ facets, selection, onToggleNationality, onToggleHobby }: Props) {
  const scrollAnchor = useScrollAnchor<HTMLElement>(facets.nationalities.isFetching || facets.hobbies.isFetching);

  return (
    <aside
      {...scrollAnchor}
      aria-label="Filters"
      className="flex w-[264px] shrink-0 flex-col gap-[26px] overflow-y-auto px-5 py-[22px] [overflow-anchor:none]"
    >
      <FacetSection
        title="Nationality"
        hint="Top 20 · match any"
        items={facets.nationalities.data ?? []}
        selected={selection.nationalities}
        showSelectedCount
        onToggle={onToggleNationality}
        isLoading={facets.nationalities.isPending}
        isError={facets.nationalities.isError && !facets.nationalities.data}
        onRetry={() => void facets.nationalities.refetch()}
      />
      <FacetSection
        title="Hobbies"
        hint="Top 20 · match all"
        items={facets.hobbies.data ?? []}
        selected={selection.hobbies}
        showSelectedCount
        onToggle={onToggleHobby}
        isLoading={facets.hobbies.isPending}
        isError={facets.hobbies.isError && !facets.hobbies.data}
        onRetry={() => void facets.hobbies.refetch()}
      />
    </aside>
  );
}
