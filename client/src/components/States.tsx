import { AlertIcon, SearchIcon } from "./icons";

export function LoadingState() {
  return (
    <div
      role="status"
      aria-label="Loading users"
      className="grid gap-4 px-4 pb-6 sm:grid-cols-2 lg:px-7 xl:grid-cols-3"
    >
      {Array.from({ length: 9 }, (_, i) => (
        <div
          key={i}
          className="flex gap-3.5 rounded-[14px] border border-line bg-surface p-[18px] motion-safe:animate-pulse"
        >
          <div className="size-[46px] shrink-0 rounded-full bg-line" />
          <div className="flex flex-1 flex-col gap-2.5 pt-1">
            <div className="h-3.5 w-3/5 rounded-md bg-line" />
            <div className="h-3 w-2/5 rounded-md bg-line" />
            <div className="h-4 w-4/5 rounded-full bg-line" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Message({
  icon,
  tone,
  title,
  body,
  action,
  role,
}: {
  icon: React.ReactNode;
  tone: "neutral" | "danger";
  title: string;
  body: string;
  action?: React.ReactNode;
  role?: "alert";
}) {
  return (
    <div role={role} className="flex flex-1 flex-col items-center justify-center gap-3.5 px-6 py-16 text-center">
      <div
        className={`grid size-14 place-items-center rounded-full ${
          tone === "danger" ? "bg-danger-soft text-danger" : "bg-accent-soft text-accent"
        }`}
      >
        {icon}
      </div>
      <div>
        <h3 className="font-display text-base font-semibold">{title}</h3>
        <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted">{body}</p>
      </div>
      {action}
    </div>
  );
}

// Two different reasons for an empty list, so two different messages
// a search or filter that matches nobody
// directory itself has no users.
export function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  if (!hasFilters) {
    return (
      <Message
        tone="neutral"
        icon={<SearchIcon size={26} />}
        title="The directory is empty"
        body="There are no users to show yet."
      />
    );
  }

  return (
    <Message
      tone="neutral"
      icon={<SearchIcon size={26} />}
      title="No users found"
      body="Try a different search term or remove a filter to see more results."
      action={
        <button
          type="button"
          onClick={onClear}
          className="rounded-[9px] border border-ink bg-surface px-[18px] py-2.5 text-[13px] font-semibold"
        >
          Clear filters
        </button>
      }
    />
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Message
      role="alert"
      tone="danger"
      icon={<AlertIcon size={26} />}
      title="Couldn't load the directory"
      body="Something went wrong while fetching users. Check your connection and try again."
      action={
        <button
          type="button"
          onClick={onRetry}
          className="rounded-[9px] border border-ink bg-ink px-[18px] py-2.5 text-[13px] font-semibold text-white"
        >
          Retry
        </button>
      }
    />
  );
}
