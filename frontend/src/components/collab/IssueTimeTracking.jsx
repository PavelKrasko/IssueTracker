import { useCallback, useEffect, useState } from "react";
import { worklogsApi } from "@/api/collabApi";
import { Button, FormAlert, IconButton, TextField } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useIssues } from "@/context/IssuesContext";
import { useProject } from "@/context/ProjectContext";
import { useTeams } from "@/context/TeamsContext";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/utils/cn";
import { formatDate, toISODate } from "@/utils/format";
import { formatMinutes, parseDuration } from "@/utils/time";

export function TimeBar({ spent, estimate, className }) {
  const pct = estimate ? Math.min(100, (spent / estimate) * 100) : spent ? 100 : 0;
  const over = estimate && spent > estimate;
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-neutral", className)} aria-hidden="true">
      <div className={cn("h-full rounded-full", over ? "bg-danger" : "bg-brand")} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function IssueTimeTracking({ issue, onUpdate }) {
  const { user } = useAuth();
  const { current, can } = useProject();
  const { personById } = useTeams();
  const { patchLocal } = useIssues();
  const toast = useToast();
  const [logs, setLogs] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ duration: "", date: toISODate(), note: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [estimateDraft, setEstimateDraft] = useState(null);
  const pid = current.id;

  const load = useCallback(async () => {
    try {
      const res = await worklogsApi.list(pid, issue.id);
      setLogs(res.worklogs);
    } catch {
      setLogs([]);
    }
  }, [pid, issue.id]);
  useEffect(() => {
    load();
  }, [load]);

  const spent = issue.spentMinutes ?? 0;
  const estimate = issue.estimateMinutes;
  const left = estimate != null ? estimate - spent : null;

  const submit = async (e) => {
    e.preventDefault();
    const minutes = parseDuration(form.duration);
    const errs = {};
    if (!minutes || minutes < 1) errs.duration = "Например: 1ч 30м, 45м или 2h.";
    else if (minutes > 1440) errs.duration = "Не больше 24 часов за одну запись.";
    if (form.date > toISODate()) errs.date = "Нельзя списать время на будущую дату.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const res = await worklogsApi.create(pid, issue.id, { minutes, date: form.date, note: form.note });
      setLogs(res.worklogs);
      patchLocal(issue.id, { spentMinutes: res.spentMinutes });
      setForm({ duration: "", date: toISODate(), note: "" });
      setOpen(false);
      toast(`Списано ${formatMinutes(minutes)}`);
    } catch (err) {
      setErrors(err.fields ?? { form: err.message });
    } finally {
      setSaving(false);
    }
  };

  const removeLog = async (id) => {
    try {
      const res = await worklogsApi.remove(pid, id);
      setLogs(res.worklogs);
      patchLocal(issue.id, { spentMinutes: res.spentMinutes });
    } catch (e) {
      toast(e.message, { tone: "error" });
    }
  };

  const saveEstimate = async () => {
    const raw = estimateDraft.trim();
    const minutes = raw === "" ? null : parseDuration(raw);
    if (raw !== "" && minutes == null) {
      toast("Не понял оценку. Пример: 4ч, 1д, 90м", { tone: "error" });
      return;
    }
    try {
      await onUpdate(issue.id, { estimateMinutes: minutes ?? "" });
      setEstimateDraft(null);
    } catch (e) {
      toast(e.message, { tone: "error" });
    }
  };

  return (
    <section aria-labelledby="issue-time" className="mt-6 rounded-lg border border-line p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 id="issue-time" className="flex items-center gap-2 text-sm font-semibold text-ink">
          Учёт времени
        </h3>
        {can.edit && !open && (
          <Button size="sm" iconBefore="timer" onClick={() => setOpen(true)}>
            Списать время
          </Button>
        )}
      </div>

      <TimeBar spent={spent} estimate={estimate} className="mt-3" />
      <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-ink-subtle">Списано</dt>
          <dd className="font-semibold text-ink">{formatMinutes(spent)}</dd>
        </div>
        <div>
          <dt className="text-ink-subtle">Оценка</dt>
          <dd className="font-semibold text-ink">
            {estimateDraft !== null ? (
              <span className="flex items-center gap-1">
                <input
                  autoFocus
                  aria-label="Оценка времени"
                  value={estimateDraft}
                  onChange={(e) => setEstimateDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEstimate();
                    if (e.key === "Escape") setEstimateDraft(null);
                  }}
                  placeholder="4ч"
                  className="h-6 w-16 rounded-sm border border-line-bold/60 bg-surface px-1 text-xs"
                />
                <IconButton size="sm" icon="check" label="Сохранить оценку" onClick={saveEstimate} />
              </span>
            ) : can.edit ? (
              <button type="button" className="rounded-sm hover:underline" onClick={() => setEstimateDraft(estimate != null ? formatMinutes(estimate) : "")}>
                {estimate != null ? formatMinutes(estimate) : "Задать"}
              </button>
            ) : (
              formatMinutes(estimate)
            )}
          </dd>
        </div>
        <div>
          <dt className="text-ink-subtle">{left != null && left < 0 ? "Перерасход" : "Осталось"}</dt>
          <dd className={cn("font-semibold", left != null && left < 0 ? "text-danger-text" : "text-ink")}>{left == null ? "—" : formatMinutes(Math.abs(left))}</dd>
        </div>
      </dl>

      {open && (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3 border-t border-line pt-3" noValidate>
          {errors.form && <FormAlert>{errors.form}</FormAlert>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField
              label="Сколько"
              required
              value={form.duration}
              onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
              error={errors.duration ?? errors.minutes}
              hint={parseDuration(form.duration) ? `= ${formatMinutes(parseDuration(form.duration))}` : "1ч 30м, 45м, 2h, 1:15"}
              placeholder="1ч 30м"
              autoFocus
            />
            <TextField label="Дата" type="date" max={toISODate()} value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} error={errors.date} />
          </div>
          <TextField label="Что сделано" optional value={form.note} maxLength={500} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Например: разобрал логи" />
          <div className="flex gap-2">
            <Button type="submit" size="sm" variant="primary" loading={saving}>
              Списать
            </Button>
            <Button size="sm" variant="subtle" onClick={() => setOpen(false)} disabled={saving}>
              Отмена
            </Button>
          </div>
        </form>
      )}

      {logs?.length > 0 && (
        <ul className="mt-3 flex flex-col divide-y divide-line border-t border-line">
          {logs.map((l) => {
            const who = personById[l.userId]?.name ?? l.userName ?? "Удалённый пользователь";
            return (
              <li key={l.id} className="flex items-center gap-2 py-2 text-xs">
                <span className="w-14 shrink-0 font-semibold tabular-nums text-ink">{formatMinutes(l.minutes)}</span>
                <span className="min-w-0 flex-1 truncate text-ink-subtle">
                  {who} · {formatDate(l.date)}
                  {l.note && <span className="text-ink"> — {l.note}</span>}
                </span>
                {(l.userId === user.id || can.admin) && <IconButton size="sm" icon="trash" label={`Удалить запись ${formatMinutes(l.minutes)}`} onClick={() => removeLog(l.id)} />}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
