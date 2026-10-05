import type { User } from "../api/types";
import { avatarColors, initials } from "../lib/avatar";
import { chipClass, matchedChipClass } from "./chipStyles";
import { MoreHobbies } from "./MoreHobbies";

// The card shows up to 2 hobbies; anything beyond that collapses into "+n".
export const VISIBLE_HOBBIES = 2;

export function UserCard({ user, highlight = [] }: { user: User; highlight?: string[] }) {
  const { bg, fg } = avatarColors(user.avatar);
  const shown = user.hobbies.slice(0, VISIBLE_HOBBIES);
  const hidden = user.hobbies.slice(VISIBLE_HOBBIES);

  return (
    <article className="flex gap-3.5 rounded-[14px] border border-line bg-surface p-[18px]">
      <div
        aria-hidden="true"
        className="flex size-[46px] shrink-0 items-center justify-center rounded-full font-display text-[14px] font-semibold"
        style={{ backgroundColor: bg, color: fg }}
      >
        {initials(user.first_name, user.last_name)}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h3 className="truncate text-[15.5px] font-semibold leading-6">
          {user.first_name} {user.last_name}
        </h3>

        <div className="flex items-baseline justify-between gap-2 text-[12.5px] text-muted">
          <span className="truncate">{user.nationality}</span>
          <span className="shrink-0">
            Age <span className="font-semibold text-ink">{user.age}</span>
          </span>
        </div>

        {/* Always the same height, even with no hobbies */}
        {shown.length > 0 ? (
          <ul aria-label="Hobbies" className="flex min-h-[22px] gap-1.5 overflow-hidden">
            {shown.map((hobby) => {
              const matched = highlight.includes(hobby);
              return (
                <li key={hobby} className={`min-w-0 truncate ${matched ? matchedChipClass : chipClass}`}>
                  {hobby}
                  {matched && <span className="sr-only"> (matches your filter)</span>}
                </li>
              );
            })}
            {hidden.length > 0 && <MoreHobbies hobbies={hidden} highlight={highlight} />}
          </ul>
        ) : (
          <div className="min-h-[22px]" />
        )}
      </div>
    </article>
  );
}
