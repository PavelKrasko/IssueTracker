import { forwardRef, useId } from "react";
import { cn, focusRing } from "@/utils/cn";

export const Checkbox = forwardRef(function Checkbox({ label, description, className, id: idProp, ...props }, ref) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <label htmlFor={id} className={cn("flex cursor-pointer items-start gap-2 text-sm text-ink", props.disabled && "cursor-not-allowed text-ink-disabled", className)}>
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className={cn("mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded-xs accent-brand disabled:cursor-not-allowed", focusRing)}
        {...props}
      />
      <span className="min-w-0">
        {label}
        {description && <span className="block text-xs text-ink-subtlest">{description}</span>}
      </span>
    </label>
  );
});

export function Switch({ checked, onChange, label, disabled, id: idProp, describedBy }) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-normal",
        checked ? "bg-brand hover:bg-brand-hover" : "bg-neutral-pressed hover:bg-line-bold",
        "disabled:cursor-not-allowed disabled:opacity-50",
        focusRing
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block h-4 w-4 rounded-full bg-surface shadow-raised transition-transform duration-normal",
          checked ? "translate-x-[18px]" : "translate-x-0.5"
        )}
      />
    </button>
  );
}
