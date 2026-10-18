import { useState } from "react";
import { FormAlert, Spinner } from "@/components/ui";
import { cn, focusRing } from "@/utils/cn";
import { ProviderIcon } from "./ProviderIcon";

export const PROVIDERS = [
  { id: "google", label: "Google" },
  { id: "github", label: "GitHub" },
];

export function SocialAuthButtons({ onAuth, disabled, verb = "Продолжить" }) {
  const [pending, setPending] = useState(null);
  const [error, setError] = useState("");

  const run = async (provider) => {
    setError("");
    setPending(provider.id);
    try {
      await onAuth(provider.id);
    } catch (e) {
      setError(`Не удалось войти через ${provider.label}. ${e.message}`);
      setPending(null);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {error && <FormAlert>{error}</FormAlert>}
      {PROVIDERS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => run(p)}
          disabled={disabled || pending !== null}
          aria-busy={pending === p.id || undefined}
          className={cn(
            "relative flex h-10 w-full items-center justify-center rounded-sm border border-line-bold/60 bg-surface px-12 text-sm font-semibold text-ink transition-colors duration-fast",
            "hover:bg-surface-hovered active:bg-surface-pressed",
            "disabled:cursor-not-allowed disabled:border-line disabled:text-ink-disabled",
            focusRing
          )}
        >
          <span className="absolute left-4 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center">
            {pending === p.id ? <Spinner className="h-4 w-4" /> : <ProviderIcon provider={p.id} />}
          </span>
          <span className="truncate">{pending === p.id ? `Подключаемся к ${p.label}…` : `${verb} с ${p.label}`}</span>
        </button>
      ))}
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-ink-subtlest" role="separator" aria-label="или">
      <span className="h-px flex-1 bg-line" />
      <span aria-hidden="true">или</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
