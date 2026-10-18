import { Icon } from "@/components/icons";
import { cn } from "@/utils/cn";

const TONES = {
  danger: { box: "border-danger bg-danger-subtle text-danger-text", icon: "alert" },
  info: { box: "border-brand bg-brand-subtle text-ink", icon: "info" },
  success: { box: "border-success bg-success-subtle text-success-text", icon: "checkCircle" },
};

export function FormAlert({ tone = "danger", children, className }) {
  const t = TONES[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex items-start gap-2 rounded-sm border-l-4 p-3 text-sm", t.box, className)}>
      <Icon name={t.icon} className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}
