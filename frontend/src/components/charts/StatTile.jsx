import { Icon } from "@/components/icons";
import { cn } from "@/utils/cn";

const TONES = {
  neutral: "bg-neutral text-ink-subtle",
  brand: "bg-brand-subtle text-ink-brand",
  success: "bg-success-subtle text-success-text",
  danger: "bg-danger-subtle text-danger-text",
};

export function StatTile({ label, value, hint, icon, tone = "neutral" }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-lg border border-line bg-surface-raised p-4">
      <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-md", TONES[tone])}>
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-ink-subtle">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold tabular-nums text-ink">{value}</p>
        {hint && <p className="mt-0.5 truncate text-xs text-ink-subtlest">{hint}</p>}
      </div>
    </div>
  );
}
