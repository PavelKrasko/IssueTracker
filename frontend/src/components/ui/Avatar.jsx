import { useEffect, useState } from "react";
import { avatarColor, initials } from "@/utils/format";
import { cn } from "@/utils/cn";

const SIZES = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-12 w-12 text-base",
  xl: "h-20 w-20 text-xl",
};

export function Avatar({ person, size = "md", className, decorative = false }) {
  const url = person?.avatarUrl || null;
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [url]);

  if (!person) {
    return (
      <span
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : "Не назначено"}
        aria-hidden={decorative || undefined}
        title="Не назначено"
        className={cn("inline-grid shrink-0 place-items-center rounded-full border border-dashed border-line-bold text-ink-subtlest", SIZES[size], className)}
      >
        <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      </span>
    );
  }
  if (url && !broken) {
    return (
      <img
        src={url}
        alt={decorative ? "" : person.name}
        title={person.name}
        loading="lazy"
        referrerPolicy="no-referrer"
        draggable="false"
        onError={() => setBroken(true)}
        className={cn("inline-block shrink-0 select-none rounded-full bg-neutral object-cover", SIZES[size], className)}
      />
    );
  }
  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : person.name}
      aria-hidden={decorative || undefined}
      title={person.name}
      style={{ backgroundColor: avatarColor(person.email || person.name) }}
      className={cn("inline-grid shrink-0 select-none place-items-center rounded-full font-semibold text-white", SIZES[size], className)}
    >
      {initials(person.name)}
    </span>
  );
}

export function AvatarGroup({ people, max = 4, size = "sm", label }) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <span role="img" aria-label={label ?? people.map((p) => p.name).join(", ")} className="flex items-center -space-x-1.5">
      {shown.map((p) => (
        <Avatar key={p.id ?? p.email} person={p} size={size} decorative className="ring-2 ring-surface" />
      ))}
      {rest > 0 && (
        <span aria-hidden="true" className={cn("inline-grid place-items-center rounded-full bg-neutral font-semibold text-ink-subtle ring-2 ring-surface", SIZES[size])}>
          +{rest}
        </span>
      )}
    </span>
  );
}
