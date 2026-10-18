import { cn } from "@/utils/cn";

export function Spinner({ className = "h-4 w-4", label }) {
  return (
    <span role={label ? "status" : undefined} className="inline-flex">
      <svg className={cn("animate-spin", className)} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}

export function PageSpinner({ label = "Загрузка…" }) {
  return (
    <div className="grid min-h-[50vh] flex-1 place-items-center text-ink-subtle">
      <div className="flex flex-col items-center gap-3">
        <Spinner className="h-6 w-6" />
        <p className="text-sm">{label}</p>
      </div>
    </div>
  );
}
