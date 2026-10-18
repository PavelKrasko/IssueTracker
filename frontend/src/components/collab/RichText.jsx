import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/utils/cn";
import { segments } from "@/utils/mentions";

export function RichText({ body, className }) {
  const { user } = useAuth();
  const parts = useMemo(() => segments(body), [body]);
  return (
    <div className={cn("whitespace-pre-wrap break-words text-sm text-ink", className)}>
      {parts.map((p, i) => {
        if (p.type === "mention") {
          const me = p.id === user?.id;
          return (
            <span
              key={i}
              className={cn("rounded-sm px-0.5 font-medium", me ? "bg-brand text-ink-inverse" : "bg-brand-subtle text-ink-brand")}
              title={me ? "Это вы" : undefined}
            >
              @{p.value}
            </span>
          );
        }
        if (p.type === "link") {
          return (
            <a key={i} href={p.value} target="_blank" rel="noopener noreferrer" className="break-all text-ink-brand underline-offset-2 hover:underline">
              {p.value}
            </a>
          );
        }
        return <span key={i}>{p.value}</span>;
      })}
    </div>
  );
}
