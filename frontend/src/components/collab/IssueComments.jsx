import { useCallback, useEffect, useState } from "react";
import { commentsApi } from "@/api/collabApi";
import { Avatar, Button, ConfirmDialog, FormAlert, IconButton, Skeleton } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useIssues } from "@/context/IssuesContext";
import { useProject } from "@/context/ProjectContext";
import { useTeams } from "@/context/TeamsContext";
import { useToast } from "@/context/ToastContext";
import { formatDateTime } from "@/utils/format";
import { MentionTextarea, useMentions } from "./MentionTextarea";
import { RichText } from "./RichText";

const submitOnCtrlEnter = (fn) => (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    fn();
  }
};

function CommentEditor({ initial = "", submitLabel, onSubmit, onCancel, autoFocus, people }) {
  const m = useMentions(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const send = async () => {
    if (!m.text.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      await onSubmit(m.toBody());
      m.reset("");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      {error && <FormAlert>{error}</FormAlert>}
      <MentionTextarea
        mentions={m}
        people={people}
        label="Комментарий"
        labelHidden
        placeholder="Напишите комментарий… @ — упомянуть участника"
        hint="@ — упомянуть участника · Ctrl+Enter — отправить"
        onKeyDown={submitOnCtrlEnter(send)}
        disabled={saving}
        autoFocus={autoFocus}
      />
      <div className="flex gap-2">
        <Button size="sm" variant="primary" onClick={send} loading={saving} disabled={!m.text.trim()}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button size="sm" variant="subtle" onClick={onCancel} disabled={saving}>
            Отмена
          </Button>
        )}
      </div>
    </div>
  );
}

export function IssueComments({ issue }) {
  const { user } = useAuth();
  const { current, can } = useProject();
  const { people, personById } = useTeams();
  const { patchLocal } = useIssues();
  const toast = useToast();
  const [comments, setComments] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const pid = current.id;

  const load = useCallback(async () => {
    setError("");
    try {
      setComments(await commentsApi.list(pid, issue.id));
    } catch (e) {
      setError(e.message);
    }
  }, [pid, issue.id]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (body) => {
    const c = await commentsApi.create(pid, issue.id, body);
    setComments((list) => [...(list ?? []), c]);

    patchLocal(issue.id, (i) => ({ commentsCount: i.commentsCount + 1, watchers: i.watchers.includes(user.id) ? i.watchers : [...i.watchers, user.id] }));
  };

  const save = async (id, body) => {
    const c = await commentsApi.update(pid, id, body);
    setComments((list) => list.map((x) => (x.id === id ? c : x)));
    setEditing(null);
  };

  const remove = async () => {
    await commentsApi.remove(pid, toDelete.id);
    setComments((list) => list.filter((x) => x.id !== toDelete.id));
    patchLocal(issue.id, (i) => ({ commentsCount: Math.max(0, i.commentsCount - 1) }));
    toast("Комментарий удалён");
  };

  return (
    <section aria-labelledby="issue-comments" className="mt-6">
      <h3 id="issue-comments" className="flex items-center gap-2 text-sm font-semibold text-ink">
        Комментарии
        {comments?.length > 0 && <span className="rounded-full bg-neutral px-1.5 text-xs font-semibold text-ink-subtle">{comments.length}</span>}
      </h3>

      {error && (
        <FormAlert className="mt-2">
          {error}{" "}
          <button type="button" className="underline" onClick={load}>
            Повторить
          </button>
        </FormAlert>
      )}

      {comments === null && !error ? (
        <div className="mt-3 flex flex-col gap-3">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : (
        <ol className="mt-3 flex flex-col gap-4">
          {comments?.map((c) => {
            const author = personById[c.authorId] ?? { name: c.authorName ?? "Удалённый пользователь", email: c.authorId ?? "", avatarUrl: c.authorAvatarUrl };
            const own = c.authorId === user.id;
            return (
              <li key={c.id} className="flex gap-3">
                <Avatar person={author} size="md" decorative />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-semibold text-ink">{author.name}</span>
                    <time dateTime={c.createdAt} className="text-xs text-ink-subtlest">
                      {formatDateTime(c.createdAt)}
                    </time>
                    {c.edited && <span className="text-xs text-ink-subtlest">(изменён)</span>}
                    <span className="ml-auto flex gap-0.5">
                      {own && editing !== c.id && <IconButton size="sm" icon="edit" label="Редактировать комментарий" onClick={() => setEditing(c.id)} />}
                      {(own || can.admin) && <IconButton size="sm" icon="trash" label="Удалить комментарий" onClick={() => setToDelete(c)} />}
                    </span>
                  </div>
                  {editing === c.id ? (
                    <div className="mt-1">
                      <CommentEditor initial={c.body} submitLabel="Сохранить" people={people} onSubmit={(body) => save(c.id, body)} onCancel={() => setEditing(null)} autoFocus />
                    </div>
                  ) : (
                    <RichText body={c.body} className="mt-0.5" />
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {can.edit ? (
        <div className="mt-4 flex gap-3">
          <Avatar person={user} size="md" decorative />
          <CommentEditor submitLabel="Отправить" people={people} onSubmit={add} />
        </div>
      ) : (
        <p className="mt-3 text-xs text-ink-subtlest">Комментировать могут участники проекта с ролью «Участник» и выше.</p>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        title="Удалить комментарий?"
        description="Комментарий исчезнет у всех участников проекта."
        confirmLabel="Удалить"
      />
    </section>
  );
}
