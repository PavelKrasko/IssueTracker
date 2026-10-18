import { forwardRef, useId, useState } from "react";
import { Icon } from "@/components/icons";
import { cn, focusRing } from "@/utils/cn";

export const controlClasses = (error) =>
  cn(
    "w-full rounded-sm border bg-surface text-sm text-ink placeholder:text-ink-subtlest transition-colors duration-fast",
    error ? "border-danger" : "border-line-bold/60 hover:border-line-bold",
    "focus-visible:border-line-focus focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-line-focus",
    "disabled:cursor-not-allowed disabled:border-line disabled:bg-neutral disabled:text-ink-disabled"
  );

export function FieldError({ id, children }) {
  return (
    <p id={id} className="flex items-start gap-1 text-xs text-danger-text">
      <Icon name="alert" className="mt-px h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

function useFieldIds(idProp, error, hint, extraDescribedBy) {
  const auto = useId();
  const id = idProp ?? auto;
  const describedBy = [error ? `${id}-error` : hint ? `${id}-hint` : null, extraDescribedBy].filter(Boolean).join(" ") || undefined;
  return { id, describedBy };
}

export function FieldShell({ id, label, required, optional, error, hint, className, children, labelHidden }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <label htmlFor={id} className={cn("text-xs font-semibold text-ink-subtle", labelHidden && "sr-only")}>
        {label}
        {required && <span className="text-danger-text" aria-hidden="true"> *</span>}
        {optional && <span className="font-normal text-ink-subtlest"> (необязательно)</span>}
      </label>
      {children}
      {error ? (
        <FieldError id={`${id}-error`}>{error}</FieldError>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-ink-subtlest">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export const TextField = forwardRef(function TextField(
  { label, error, hint, required, optional, className, labelHidden, id: idProp, size = "md", describedBy: extra, ...props },
  ref
) {
  const { id, describedBy } = useFieldIds(idProp, error, hint, extra);
  return (
    <FieldShell {...{ id, label, required, optional, error, hint, className, labelHidden }}>
      <input
        ref={ref}
        id={id}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(controlClasses(error), size === "lg" ? "h-10 px-3" : "h-9 px-2")}
        {...props}
      />
    </FieldShell>
  );
});

export const TextareaField = forwardRef(function TextareaField(
  { label, error, hint, required, optional, className, id: idProp, rows = 4, ...props },
  ref
) {
  const { id, describedBy } = useFieldIds(idProp, error, hint);
  return (
    <FieldShell {...{ id, label, required, optional, error, hint, className }}>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(controlClasses(error), "min-h-[80px] resize-y px-2 py-2")}
        {...props}
      />
    </FieldShell>
  );
});

export const SelectField = forwardRef(function SelectField(
  { label, error, hint, required, optional, className, labelHidden, id: idProp, options, placeholder, size = "md", ...props },
  ref
) {
  const { id, describedBy } = useFieldIds(idProp, error, hint);
  return (
    <FieldShell {...{ id, label, required, optional, error, hint, className, labelHidden }}>
      <div className="relative">
        <select
          ref={ref}
          id={id}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(controlClasses(error), "appearance-none pl-2 pr-8", size === "sm" ? "h-8" : size === "lg" ? "h-10" : "h-9")}
          {...props}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon name="chevronDown" className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
      </div>
    </FieldShell>
  );
});

export const PasswordField = forwardRef(function PasswordField(
  { label, error, hint, required, className, id: idProp, describedBy: extra, size = "lg", ...props },
  ref
) {
  const { id, describedBy } = useFieldIds(idProp, error, hint, extra);
  const [visible, setVisible] = useState(false);
  return (
    <FieldShell {...{ id, label, required, error, hint, className }}>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={visible ? "text" : "password"}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(controlClasses(error), size === "lg" ? "h-10 pl-3" : "h-9 pl-2", "pr-10")}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? "Скрыть пароль" : "Показать пароль"}
          disabled={props.disabled}
          className={cn(
            "absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-sm text-ink-subtle hover:bg-neutral disabled:text-ink-disabled",
            focusRing
          )}
        >
          <Icon name={visible ? "eyeOff" : "eye"} />
        </button>
      </div>
    </FieldShell>
  );
});

export const SearchInput = forwardRef(function SearchInput({ value, onChange, label = "Поиск", placeholder, className, inputClassName, ...props }, ref) {
  const id = useId();
  return (
    <div className={cn("relative", className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Icon name="search" className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtlest" />
      <input
        ref={ref}
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? label}
        autoComplete="off"
        className={cn(controlClasses(false), "h-8 pl-8 pr-8 [&::-webkit-search-cancel-button]:hidden", inputClassName)}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Очистить поиск"
          className={cn("absolute right-1 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-sm text-ink-subtle hover:bg-neutral", focusRing)}
        >
          <Icon name="x" className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
});
