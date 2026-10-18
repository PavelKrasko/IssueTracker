import { useAuth } from "@/context/AuthContext";
import { useIssueUI } from "@/context/IssueUIContext";
import { useIssues } from "@/context/IssuesContext";
import { useTeams } from "@/context/TeamsContext";
import { DOC_CATEGORY_BY_ID, docKind } from "@/constants/docs";
import { useAttachmentUrl } from "@/hooks/useAttachmentUrl";
import { cn, focusRing } from "@/utils/cn";
import { formatBytes } from "@/utils/files";
import { formatDate } from "@/utils/format";
import { DocActions } from "./DocActions";
import { DocIcon } from "./DocIcon";
import { DocLink } from "./DocLink";

function CategoryTag({ id }) {
  return <span className="inline-flex max-w-full truncate rounded-sm bg-neutral px-1.5 py-px text-xs text-ink-subtle">{DOC_CATEGORY_BY_ID[id]?.label ?? "Прочее"}</span>;
}

function useLookups() {
  const { user } = useAuth();
  const { personById } = useTeams();
  const { issues } = useIssues();
  const issueById = Object.fromEntries(issues.map((i) => [i.id, i]));
  const authorName = (id) => (id === user.id ? "Вы" : personById[id]?.name ?? "—");
  return { issueById, authorName };
}

function IssueRef({ issue }) {
  const { openIssue } = useIssueUI();
  if (!issue) return <span className="text-ink-subtlest">—</span>;
  return (
    <button type="button" onClick={() => openIssue(issue.key)} title={issue.title} className={cn("rounded-sm text-sm font-semibold text-ink-brand hover:underline", focusRing)}>
      {issue.key}
    </button>
  );
}

const sizeOf = (doc) => (doc.kind === "link" ? "Ссылка" : formatBytes(doc.size));

export function DocTable({ docs }) {
  const { issueById, authorName } = useLookups();
  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-line md:block">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <caption className="sr-only">Документы проекта</caption>
          <thead className="bg-surface-sunken">
            <tr className="border-b border-line text-left text-xs font-semibold text-ink-subtle">
              <th scope="col" className="h-10 px-3">Название</th>
              <th scope="col" className="w-36 px-3">Категория</th>
              <th scope="col" className="w-24 px-3">Задача</th>
              <th scope="col" className="w-28 px-3">Размер</th>
              <th scope="col" className="w-36 px-3">Добавил</th>
              <th scope="col" className="w-28 px-3">Дата</th>
              <th scope="col" className="w-12 px-2"><span className="sr-only">Действия</span></th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id} className="border-b border-line last:border-0 hover:bg-surface-hovered">
                <td className="max-w-0 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <DocIcon doc={d} />
                    <div className="min-w-0">
                      <DocLink doc={d} className="block truncate font-medium" />
                      <p className="truncate text-xs text-ink-subtle">{d.description || docKind(d).label}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2"><CategoryTag id={d.category} /></td>
                <td className="px-3 py-2"><IssueRef issue={issueById[d.issueId]} /></td>
                <td className="whitespace-nowrap px-3 py-2 text-ink-subtle">{sizeOf(d)}</td>
                <td className="truncate px-3 py-2 text-ink-subtle">{authorName(d.uploadedBy)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-ink-subtle">{formatDate(d.createdAt)}</td>
                <td className="px-2 py-1"><DocActions doc={d} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-2 md:hidden" aria-label="Документы проекта">
        {docs.map((d) => (
          <li key={d.id} className="flex items-start gap-3 rounded-lg border border-line bg-surface-raised p-3">
            <DocIcon doc={d} />
            <div className="min-w-0 flex-1">
              <DocLink doc={d} className="block break-words font-medium" />
              <p className="mt-0.5 text-xs text-ink-subtle">
                {sizeOf(d)} · {formatDate(d.createdAt)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <CategoryTag id={d.category} />
                <IssueRef issue={issueById[d.issueId]} />
              </div>
            </div>
            <DocActions doc={d} />
          </li>
        ))}
      </ul>
    </>
  );
}

function Preview({ doc }) {
  const kind = docKind(doc);
  const isImage = kind.icon === "fileImage";
  const { url } = useAttachmentUrl(isImage ? { url: doc.url } : null);
  if (isImage && url) return <img src={url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />;
  return <DocIcon doc={doc} size="lg" />;
}

export function DocGrid({ docs }) {
  const { issueById } = useLookups();
  return (
    <ul className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Документы проекта">
      {docs.map((d) => (
        <li key={d.id} className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface-raised">
          <div className="relative grid h-28 place-items-center overflow-hidden bg-surface-sunken">
            <Preview doc={d} />
          </div>
          <div className="flex flex-1 flex-col gap-2 p-3">
            <div className="flex items-start gap-2">
              <DocLink doc={d} className="line-clamp-2 min-w-0 flex-1 break-words text-sm font-medium" />
              <DocActions doc={d} />
            </div>
            {d.description && <p className="line-clamp-2 text-xs text-ink-subtle">{d.description}</p>}
            <div className="mt-auto flex flex-wrap items-center gap-2 text-xs text-ink-subtle">
              <CategoryTag id={d.category} />
              <IssueRef issue={issueById[d.issueId]} />
              <span className="ml-auto">{sizeOf(d)}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
