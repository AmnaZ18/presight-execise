import {
  SORT_FIELDS,
  SORT_LABELS,
  directionLabel,
  type SortDir,
  type SortField,
} from "../state/viewState";
import { ArrowDownIcon, ArrowUpIcon } from "./icons";
import { SelectMenu } from "./SelectMenu";

const SORT_OPTIONS = SORT_FIELDS.map((field) => ({ value: field, label: SORT_LABELS[field] }));

interface Props {
  sort: SortField;
  dir: SortDir;
  onChange: (patch: { sort?: SortField; dir?: SortDir }) => void;
  compact?: boolean;
}

// Sort field + direction
export function SortControls({ sort, dir, onChange, compact = false }: Props) {
  const label = directionLabel(sort, dir);

  return (
    <div className="flex items-center gap-2.5">
      <SelectMenu
        label="Sort by"
        hideLabel={compact}
        value={sort}
        options={SORT_OPTIONS}
        onChange={(field) => onChange({ sort: field })}
      />

      <button
        type="button"
        onClick={() => onChange({ dir: dir === "asc" ? "desc" : "asc" })}
        aria-label={`Sort direction: ${label}. Activate to reverse.`}
        className="flex items-center gap-1.5 rounded-lg border border-line-strong bg-field px-3 py-2 text-[13px] font-semibold"
      >
        {dir === "asc" ? <ArrowUpIcon size={13} /> : <ArrowDownIcon size={13} />}
        {label}
      </button>
    </div>
  );
}
