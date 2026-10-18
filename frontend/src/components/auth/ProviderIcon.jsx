import { Icon } from "@/components/icons";
import { cn } from "@/utils/cn";

export function ProviderIcon({ provider, className = "h-5 w-5" }) {
  return (
    <span aria-hidden="true" className={cn("inline-grid shrink-0 place-items-center text-ink", className)}>
      <Icon name={provider} className="h-full w-full" />
    </span>
  );
}
