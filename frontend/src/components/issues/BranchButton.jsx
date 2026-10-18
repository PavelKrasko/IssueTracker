import { useState } from "react";
import { Icon } from "@/components/icons";
import { useToast } from "@/context/ToastContext";
import { cn, focusRing } from "@/utils/cn";
import { branchName } from "@/utils/translit";

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

export function BranchButton({ issue }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const name = branchName(issue);
  const command = `git checkout -b ${name}`;

  const onCopy = async () => {
    if (await copy(command)) {
      setCopied(true);
      toast("Команда скопирована — вставьте её в терминал");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast("Не удалось скопировать — выделите текст вручную", { tone: "error" });
    }
  };

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md border border-line bg-surface-sunken px-2 py-1.5">
      <Icon name="gitBranch" className="h-4 w-4 shrink-0 text-ink-subtle" />
      <code className="min-w-0 flex-1 truncate font-mono text-xs text-ink" title={command}>
        {name}
      </code>
      <button
        type="button"
        onClick={onCopy}
        className={cn("inline-flex shrink-0 items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-medium text-ink-brand hover:bg-brand-subtle", focusRing)}
        aria-label={`Скопировать команду: ${command}`}
      >
        <Icon name={copied ? "check" : "copy"} className="h-3.5 w-3.5" />
        {copied ? "Скопировано" : "git checkout"}
      </button>
    </div>
  );
}
