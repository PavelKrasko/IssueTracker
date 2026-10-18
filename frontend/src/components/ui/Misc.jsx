import { Icon } from "@/components/icons";
import { STATUS_BY_ID } from "@/constants/issues";
import { cn } from "@/utils/cn";

export function EmptyState({ icon = "inbox", title, children, action, tone = "neutral", role, compact = false, className }) {
  return (
    <div role={role} className={cn("mx-auto flex max-w-md flex-col items-center text-center", compact ? "py-8" : "py-16", className)}>
      <span
        className={cn(
          "grid h-12 w-12 place-items-center rounded-full",
          tone === "danger" ? "bg-danger-subtle text-danger-text" : "bg-brand-subtle text-ink-brand"
        )}
      >
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-ink">{title}</h2>
      {children && <div className="mt-1 text-sm text-ink-subtle">{children}</div>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs text-ink-subtle">{eyebrow}</p>}
        <h1 className="text-xl font-semibold text-ink sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-subtle">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ as: Tag = "section", className, children, ...props }) {
  return (
    <Tag className={cn("rounded-lg border border-line bg-surface-raised", className)} {...props}>
      {children}
    </Tag>
  );
}

export function CardHeader({ title, description, actions, id }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 px-4 pt-4 sm:px-5">
      <div className="min-w-0">
        <h2 id={id} className="text-sm font-semibold text-ink">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-xs text-ink-subtle">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function StatusLozenge({ status, className }) {
  const s = STATUS_BY_ID[status];
  if (!s) return null;
  return (
    <span className={cn("inline-flex max-w-full items-center truncate rounded-sm px-1.5 py-px text-2xs font-bold uppercase tracking-wide", s.lozenge, className)}>
      {s.label}
    </span>
  );
}

export function Skeleton({ className }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-sm bg-neutral", className)} />;
}

export function Kbd({ children }) {
  return <kbd className="rounded-xs border border-line bg-surface-sunken px-1 font-sans text-2xs text-ink-subtle">{children}</kbd>;
}
