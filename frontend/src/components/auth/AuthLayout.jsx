import { Link } from "react-router-dom";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { cn, focusRing } from "@/utils/cn";

export function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-full flex-col bg-surface-sunken">
      <div className="flex justify-end p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <ThemeToggle />
      </div>
      <main className="flex flex-1 items-start justify-center px-4 pb-8 sm:items-center">
        <div className="w-full max-w-[400px]">
          <div className="rounded-lg bg-surface-raised px-6 py-8 shadow-overlay sm:px-10">
            <div className="flex justify-center">
              <Logo size="lg" />
            </div>
            <h1 className="mt-6 text-center text-base font-semibold text-ink">{title}</h1>
            {subtitle && <p className="mt-1 text-center text-sm text-ink-subtle">{subtitle}</p>}
            <div className="mt-6">{children}</div>
            {footer && <div className="mt-6 border-t border-line pt-4 text-center text-sm text-ink-subtle">{footer}</div>}
          </div>
          <p className="mt-6 text-center text-xs text-ink-subtlest">Одна учётная запись для всех проектов в IssueTracker.</p>
        </div>
      </main>
      <footer className="px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-xs text-ink-subtlest">
        <Link to="/" className={cn("rounded-sm text-ink-brand hover:underline", focusRing)}>
          На главную
        </Link>
        <span aria-hidden="true"> · </span>© {new Date().getFullYear()} IssueTracker
      </footer>
    </div>
  );
}
