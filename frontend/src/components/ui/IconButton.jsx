import { forwardRef } from "react";
import { Icon } from "@/components/icons";
import { cn, focusRing } from "@/utils/cn";

const SIZES = { sm: "h-7 w-7", md: "h-8 w-8", lg: "h-10 w-10" };
const VARIANTS = {
  subtle: "text-ink-subtle hover:bg-neutral hover:text-ink active:bg-neutral-hover",
  default: "bg-neutral text-ink hover:bg-neutral-hover active:bg-neutral-pressed",
  danger: "text-ink-subtle hover:bg-danger-subtle hover:text-danger-text",
};

export const IconButton = forwardRef(function IconButton(
  { icon, label, size = "md", variant = "subtle", className, iconClassName = "h-4 w-4", showTitle = true, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={showTitle ? label : undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-sm transition-colors duration-fast",
        SIZES[size],
        VARIANTS[variant],
        "disabled:pointer-events-none disabled:text-ink-disabled",
        focusRing,
        className
      )}
      {...props}
    >
      <Icon name={icon} className={iconClassName} />
    </button>
  );
});
