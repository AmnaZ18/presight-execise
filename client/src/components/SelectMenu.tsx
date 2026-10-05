import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { CheckIcon, ChevronDownIcon } from "./icons";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  label: string;
  hideLabel?: boolean;
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
}

export function SelectMenu<T extends string>({ label, hideLabel = false, value, options, onChange }: Props<T>) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const baseId = useId();
  const labelId = `${baseId}-label`;
  const listId = `${baseId}-list`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );
  const lastIndex = options.length - 1;

  function openMenu(index = selectedIndex) {
    setActiveIndex(index);
    setOpen(true);
  }

  function choose(index: number) {
    onChange(options[index].value);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openMenu();
      } else if (event.key === "Home") {
        event.preventDefault();
        openMenu(0);
      } else if (event.key === "End") {
        event.preventDefault();
        openMenu(lastIndex);
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) => Math.min(lastIndex, index + 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => Math.max(0, index - 1));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(lastIndex);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(activeIndex);
        break;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span id={labelId} className={hideLabel ? "sr-only" : "text-[13px] text-muted"}>
        {label}
      </span>

      <div ref={rootRef} className="relative">
        <button
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-labelledby={labelId}
          aria-activedescendant={open ? optionId(activeIndex) : undefined}
          onClick={() => (open ? setOpen(false) : openMenu())}
          onKeyDown={handleKeyDown}
          onKeyUp={(event) => {
            if (event.key === " ") event.preventDefault();
          }}
          onBlur={() => setOpen(false)}
          className="flex items-center gap-2 rounded-lg border border-line-strong bg-field py-2 pl-3 pr-2.5 text-[13px] font-semibold text-ink"
        >
          {options[selectedIndex].label}
          <ChevronDownIcon
            size={12}
            className={`text-muted transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-labelledby={labelId}
            onMouseDown={(event) => event.preventDefault()}
            className="absolute right-0 top-full z-30 mt-1.5 w-44 rounded-xl border border-line bg-surface p-1 shadow-lg"
          >
            {options.map((option, index) => {
              const selected = option.value === value;
              return (
                <li
                  key={option.value}
                  id={optionId(index)}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(index)}
                  className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 text-[13px] lg:min-h-9 ${
                    index === activeIndex ? "bg-black/[0.05]" : ""
                  } ${selected ? "font-semibold" : ""}`}
                >
                  {option.label}
                  {selected && <CheckIcon size={14} className="text-accent" />}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
