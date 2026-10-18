import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components/icons";
import { cn, focusRing } from "@/utils/cn";
import { Spinner } from "./Spinner";

const VARIANTS = {
  primary: "bg-brand text-ink-inverse hover:bg-brand-hover active:bg-brand-pressed",
  default: "bg-neutral text-ink hover:bg-neutral-hover active:bg-neutral-pressed",
  subtle: "bg-transparent text-ink-subtle hover:bg-neutral hover:text-ink active:bg-neutral-hover",
  outline: "border border-line bg-surface text-ink hover:bg-surface-hovered active:bg-surface-pressed",
  danger: "bg-danger text-ink-inverse hover:bg-danger/90 active:bg-danger/80",
  link: "bg-transparent px-0 text-ink-brand underline-offset-2 hover:underline",
};

const SIZES = {
  sm: "h-7 gap-1 px-2 text-xs",
  md: "h-8 gap-1.5 px-3 text-sm",
  lg: "h-10 gap-2 px-4 text-sm",
};

export const buttonClasses = ({ variant = "default", size = "md", full = false, className } = {}) =>
  cn(
    "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-sm font-medium transition-colors duration-fast",
    SIZES[size],
    VARIANTS[variant],
    full && "w-full",
    "disabled:pointer-events-none disabled:border-transparent disabled:bg-neutral disabled:text-ink-disabled",
    focusRing,
    className
  );

export const Button = forwardRef(function Button(
  { variant, size, full, loading = false, disabled, iconBefore, iconAfter, className, children, type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, full, className })}
      {...props}
    >
      {loading ? <Spinner /> : iconBefore && <Icon name={iconBefore} />}
      {children}
      {!loading && iconAfter && <Icon name={iconAfter} />}
    </button>
  );
});

export function ButtonLink({ to, variant, size, full, iconBefore, iconAfter, className, children, ...props }) {
  return (
    <Link to={to} className={buttonClasses({ variant, size, full, className })} {...props}>
      {iconBefore && <Icon name={iconBefore} />}
      {children}
      {iconAfter && <Icon name={iconAfter} />}
    </Link>
  );
}
