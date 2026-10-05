import { useEffect, useRef, useState } from "react";
import { CloseIcon, SearchIcon } from "./icons";

export const SEARCH_DEBOUNCE_MS = 300;

interface Props {
  value: string;
  onSearch: (value: string) => void;
}

export function SearchBar({ value, onSearch }: Props) {
 
  const [text, setText] = useState(value);

  const latestOnSearch = useRef(onSearch);
  useEffect(() => {
    latestOnSearch.current = onSearch;
  });

  useEffect(() => {
    setText(value);
  }, [value]);

  useEffect(() => {
    if (text === value) return;
    const timer = setTimeout(() => latestOnSearch.current(text), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, value]);

  return (
    <form
      role="search"
      className="relative"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(text);
      }}
    >
      <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
      <input
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        aria-label="Search users by name"
        placeholder="Search by name"
        enterKeyHint="search"
        autoComplete="off"
        className="w-full rounded-[10px] border border-line-strong bg-field py-2.5 pl-10 pr-10 text-[14px] placeholder:text-muted"
      />
      {text !== "" && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setText("");
            onSearch("");
          }}
          className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-line"
        >
          <CloseIcon size={12} />
        </button>
      )}
    </form>
  );
}
