import { Icon } from "@/components/icons";
import { docKind } from "@/constants/docs";
import { cn } from "@/utils/cn";

export function DocIcon({ doc, size = "md" }) {
  const kind = docKind(doc);
  return (
    <span
      aria-hidden="true"
      className={cn("grid shrink-0 place-items-center rounded-md bg-surface-sunken", kind.color, size === "lg" ? "h-12 w-12" : "h-9 w-9")}
    >
      <Icon name={kind.icon} className={size === "lg" ? "h-6 w-6" : "h-5 w-5"} />
    </span>
  );
}
