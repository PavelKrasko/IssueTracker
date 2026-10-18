import { Link } from "react-router-dom";
import { Icon } from "@/components/icons";
import { cn, focusRing } from "@/utils/cn";

export function Logo({ to = "/", size = "md", showText = true, className }) {
  return (
    <Link to={to} aria-label="IssueTracker — на главную" className={cn("inline-flex shrink-0 items-center gap-2 rounded-sm p-1", focusRing, className)}>
      <span className={cn("grid place-items-center rounded-md bg-brand text-ink-inverse", size === "lg" ? "h-9 w-9" : "h-7 w-7")}>
        <Icon name="layers" className={size === "lg" ? "h-5 w-5" : "h-4 w-4"} strokeWidth={2.4} />
      </span>
      {showText && <span className={cn("font-semibold text-ink", size === "lg" ? "text-lg" : "text-base")}>IssueTracker</span>}
    </Link>
  );
}
