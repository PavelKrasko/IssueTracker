import { Link } from "react-router-dom";
import { Button } from "@/components/ui";
import { DOC_CATEGORY_BY_ID } from "@/constants/docs";
import { useDocuments } from "@/context/DocumentsContext";
import { cn, focusRing } from "@/utils/cn";
import { DocActions } from "./DocActions";
import { DocIcon } from "./DocIcon";
import { DocLink } from "./DocLink";

export function IssueDocs({ issue }) {
  const { docs, openUpload, openLink } = useDocuments();
  const linked = docs.filter((d) => d.issueId === issue.id);

  return (
    <section aria-labelledby="issue-docs" className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="issue-docs" className="text-sm font-semibold text-ink">
          Документы{linked.length > 0 && <span className="ml-1 font-normal text-ink-subtle">({linked.length})</span>}
        </h3>
        <div className="flex gap-1">
          <Button size="sm" variant="subtle" iconBefore="upload" onClick={() => openUpload({ issueId: issue.id })}>
            Файл
          </Button>
          <Button size="sm" variant="subtle" iconBefore="link" onClick={() => openLink({ issueId: issue.id })}>
            Ссылка
          </Button>
        </div>
      </div>

      {linked.length === 0 ? (
        <p className="mt-2 text-sm text-ink-subtlest">
          Нет привязанных документов. Все документы проекта —{" "}
          <Link to="/app/docs" className={cn("rounded-sm text-ink-brand hover:underline", focusRing)}>
            в разделе «Документы»
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-2 flex flex-col divide-y divide-line rounded-lg border border-line">
          {linked.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-3 py-2">
              <DocIcon doc={d} />
              <div className="min-w-0 flex-1">
                <DocLink doc={d} className="block truncate text-sm font-medium" />
                <p className="truncate text-xs text-ink-subtle">{DOC_CATEGORY_BY_ID[d.category]?.label}</p>
              </div>
              <DocActions doc={d} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
