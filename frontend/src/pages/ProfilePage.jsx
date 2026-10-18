import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { oauthErrorMessage } from "@/components/auth/oauthMessages";
import { ProviderIcon } from "@/components/auth/ProviderIcon";
import { TelegramCard } from "@/components/profile/TelegramCard";
import { PROVIDERS } from "@/components/auth/SocialAuthButtons";
import { Icon } from "@/components/icons";
import { Avatar, Button, Card, CardHeader, FormAlert, PageHeader, PasswordField, StatusLozenge, TextareaField, TextField } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useIssueUI } from "@/context/IssueUIContext";
import { useProject } from "@/context/ProjectContext";
import { useIssues } from "@/context/IssuesContext";
import { useTeams } from "@/context/TeamsContext";
import { useToast } from "@/context/ToastContext";
import { cn, focusRing } from "@/utils/cn";
import { formatDateFull, isOverdue } from "@/utils/format";
import { focusFirstError, PASSWORD_RULES, validateNewPassword } from "@/utils/validation";

function ProfileForm({ user, onCancel, onSaved }) {
  const { updateProfile } = useAuth();
  const [form, setForm] = useState({ name: user.name, jobTitle: user.jobTitle ?? "", about: user.about ?? "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const refs = { name: useRef(null) };

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const v = { name: form.name.trim() ? undefined : "Введите имя и фамилию." };
    setErrors(v);
    if (focusFirstError(v, refs)) return;
    setSaving(true);
    setFormError("");
    try {
      await updateProfile(form);
      onSaved();
    } catch (err) {
      setFormError(err.message);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {formError && <FormAlert>{formError}</FormAlert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField ref={refs.name} label="Имя и фамилия" required maxLength={100} value={form.name} onChange={set("name")} error={errors.name} disabled={saving} autoFocus />
        <TextField label="Должность" optional maxLength={80} value={form.jobTitle} onChange={set("jobTitle")} disabled={saving} placeholder="Например: Frontend-разработчик" />
      </div>
      <TextareaField label="О себе" optional rows={3} maxLength={500} value={form.about} onChange={set("about")} disabled={saving} hint={`${form.about.length}/500`} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="subtle" onClick={onCancel} disabled={saving}>
          Отмена
        </Button>
        <Button type="submit" variant="primary" loading={saving}>
          Сохранить профиль
        </Button>
      </div>
    </form>
  );
}

function PasswordForm({ hasPassword }) {
  const { changePassword } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ current: "", next: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const refs = { current: useRef(null), next: useRef(null) };

  const submit = async (e) => {
    e.preventDefault();
    const v = { current: hasPassword && !form.current ? "Введите текущий пароль." : undefined, next: validateNewPassword(form.next) };
    setErrors(v);
    if (focusFirstError(v, refs)) return;
    setSaving(true);
    try {
      await changePassword(form);
      setForm({ current: "", next: "" });
      toast(hasPassword ? "Пароль изменён" : "Пароль задан — теперь можно входить по email");
    } catch (err) {
      setErrors(err.fields ?? { next: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {hasPassword && (
        <PasswordField
          ref={refs.current}
          size="md"
          label="Текущий пароль"
          autoComplete="current-password"
          required
          value={form.current}
          onChange={(e) => setForm((f) => ({ ...f, current: e.target.value }))}
          error={errors.current}
          disabled={saving}
        />
      )}
      <PasswordField
        ref={refs.next}
        size="md"
        label="Новый пароль"
        autoComplete="new-password"
        required
        value={form.next}
        onChange={(e) => setForm((f) => ({ ...f, next: e.target.value }))}
        error={errors.next}
        hint={PASSWORD_RULES.map((r) => r.label.toLowerCase()).join(", ")}
        disabled={saving}
      />
      <div>
        <Button type="submit" loading={saving}>
          {hasPassword ? "Изменить пароль" : "Задать пароль"}
        </Button>
      </div>
    </form>
  );
}

function ConnectedAccounts({ user }) {
  const { linkProvider, disconnectProvider } = useAuth();
  const toast = useToast();
  const [pending, setPending] = useState(null);

  const toggle = async (p, connected) => {
    setPending(p.id);
    if (connected) return linkProvider(p.id);
    try {
      await disconnectProvider(p.id);
      toast(`${p.label} отключён`);
    } catch (e) {
      toast(e.message, { tone: "error" });
    } finally {
      setPending(null);
    }
  };

  return (
    <ul className="flex flex-col divide-y divide-line">
      {PROVIDERS.map((p) => {
        const connected = Boolean(user.connected?.[p.id]);
        return (
          <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
            <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink">
              <ProviderIcon provider={p.id} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{p.label}</p>
              <p className={cn("text-xs", connected ? "text-success-text" : "text-ink-subtle")}>{connected ? "Подключён — можно входить в один клик" : "Не подключён"}</p>
            </div>
            <Button variant={connected ? "subtle" : "default"} loading={pending === p.id} onClick={() => toggle(p, !connected)}>
              {connected ? "Отключить" : "Подключить"}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

const AVATAR_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const AVATAR_MAX = 2 * 1024 * 1024;

function AvatarEditor() {
  const { user, uploadAvatar, removeAvatar } = useAuth();
  const { reloadMembers } = useProject();
  const { reload: reloadTeams } = useTeams();
  const toast = useToast();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(null);

  const refreshLists = () => Promise.allSettled([reloadMembers?.(), reloadTeams?.()]);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) {
      toast("Подходят PNG, JPG, GIF и WebP.", { tone: "error" });
      return;
    }
    if (file.size > AVATAR_MAX) {
      toast("Фото больше 2 МБ — выберите файл поменьше.", { tone: "error" });
      return;
    }
    setBusy("upload");
    try {
      await uploadAvatar(file);
      await refreshLists();
      toast("Фото профиля обновлено");
    } catch (err) {
      toast(err.message, { tone: "error" });
    } finally {
      setBusy(null);
    }
  };

  const onRemove = async () => {
    setBusy("remove");
    try {
      await removeAvatar();
      await refreshLists();
      toast("Фото удалено");
    } catch (err) {
      toast(err.message, { tone: "error" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex shrink-0 flex-col items-start gap-2 sm:items-center">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={!!busy}
        aria-label="Сменить фото профиля"
        className={cn("group relative rounded-full disabled:cursor-wait", focusRing)}
      >
        <Avatar person={user} size="xl" decorative />
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-0 grid place-items-center rounded-full bg-black/50 text-white opacity-0 transition-opacity duration-fast group-hover:opacity-100 group-focus-visible:opacity-100",
            busy && "opacity-100"
          )}
        >
          {busy ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Icon name="camera" className="h-6 w-6" />}
        </span>
      </button>
      <input ref={inputRef} type="file" accept={AVATAR_TYPES.join(",")} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={onFile} />
      <div className="flex gap-1">
        <Button size="sm" variant="subtle" iconBefore="upload" disabled={!!busy} onClick={() => inputRef.current?.click()}>
          {user.avatarUrl ? "Сменить" : "Загрузить фото"}
        </Button>
        {user.avatarUrl && (
          <Button size="sm" variant="subtle" iconBefore="trash" loading={busy === "remove"} disabled={!!busy} onClick={onRemove}>
            Удалить
          </Button>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { issues } = useIssues();
  const { teams, status: teamsStatus } = useTeams();
  const { openIssue } = useIssueUI();
  const toast = useToast();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    if (window.location.hash) document.querySelector(window.location.hash)?.scrollIntoView({ block: "start" });
  }, []);

  useEffect(() => {
    const linked = params.get("linked");
    const err = params.get("oauth_error");
    if (!linked && !err) return;
    if (linked) toast(`${linked === "google" ? "Google" : "GitHub"} подключён`);
    if (err) toast(oauthErrorMessage(err, params.get("provider")), { tone: "error", duration: 8000 });
    setParams({}, { replace: true });
  }, []);

  const mine = useMemo(() => issues.filter((i) => i.assigneeId === user.id), [issues, user.id]);
  const myOpen = mine.filter((i) => i.status !== "done");
  const myTeams = teams.filter((t) => t.members.some((m) => m.email === user.email));

  const summary = [
    { label: "Открытые", value: myOpen.length, to: "/app/board?mine=1" },
    { label: "Выполненные", value: mine.length - myOpen.length, to: "/app/issues?mine=1&status=done" },
    { label: "Просроченные", value: mine.filter(isOverdue).length, to: "/app/issues?mine=1&overdue=1", danger: true },
  ];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader title="Профиль" />

      <Card className="p-4 sm:p-6">
        {editing ? (
          <ProfileForm
            user={user}
            onCancel={() => setEditing(false)}
            onSaved={() => {
              setEditing(false);
              toast("Профиль сохранён");
            }}
          />
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <AvatarEditor />
            <div className="min-w-0 flex-1">
              <h2 className="break-words text-xl font-semibold text-ink">{user.name}</h2>
              <p className="mt-0.5 text-sm text-ink-subtle">{user.jobTitle || "Должность не указана"}</p>
              <dl className="mt-3 flex flex-col gap-1 text-sm">
                <div className="flex items-center gap-2 text-ink-subtle">
                  <Icon name="mail" />
                  <dt className="sr-only">Email</dt>
                  <dd className="min-w-0 break-all text-ink">{user.email}</dd>
                </div>
                <div className="flex items-center gap-2 text-ink-subtle">
                  <Icon name="calendar" />
                  <dt className="sr-only">В IssueTracker с</dt>
                  <dd>В IssueTracker с {formatDateFull(user.createdAt)}</dd>
                </div>
              </dl>
              {user.about && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-ink">{user.about}</p>}
            </div>
            <Button iconBefore="edit" onClick={() => setEditing(true)} className="self-start">
              Редактировать
            </Button>
          </div>
        )}
      </Card>

      <section aria-labelledby="my-work" className="flex flex-col gap-3">
        <h2 id="my-work" className="text-base font-semibold text-ink">
          Мои задачи
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {summary.map((s) => (
            <Link
              key={s.label}
              to={s.to}
              className={cn("rounded-lg border border-line bg-surface-raised p-3 transition-colors duration-fast hover:bg-surface-hovered sm:p-4", focusRing)}
            >
              <p className="truncate text-xs font-semibold text-ink-subtle">{s.label}</p>
              <p className={cn("mt-1 text-2xl font-semibold tabular-nums", s.danger && s.value ? "text-danger-text" : "text-ink")}>{s.value}</p>
            </Link>
          ))}
        </div>
        {myOpen.length > 0 && (
          <Card as="div">
            <ul className="divide-y divide-line">
              {myOpen.slice(0, 5).map((i) => (
                <li key={i.id}>
                  <button
                    type="button"
                    data-issue-key={i.key}
                    onClick={() => openIssue(i.key)}
                    className={cn("flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-hovered", focusRing)}
                  >
                    <span className="shrink-0 text-xs font-semibold text-ink-subtle">{i.key}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{i.title}</span>
                    <StatusLozenge status={i.status} />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Команды" description={myTeams.length ? "Вы участник этих команд" : "Вы управляете командами проекта"} />
          <div className="px-4 pb-4 pt-2 sm:px-5">
            {teamsStatus === "loading" ? (
              <p className="text-sm text-ink-subtle">Загрузка…</p>
            ) : teams.length === 0 ? (
              <p className="text-sm text-ink-subtle">
                В этом проекте команд пока нет.{" "}
                <Link to="/app/teams" className={cn("rounded-sm text-ink-brand hover:underline", focusRing)}>
                  Создать команду
                </Link>
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {(myTeams.length ? myTeams : teams).map((t) => (
                  <li key={t.id} className="rounded-full bg-discovery-subtle px-3 py-1 text-sm text-discovery-text">
                    {t.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Связанные аккаунты" description="Вход через Google и GitHub" />
          <div className="px-4 pb-2 sm:px-5">
            <ConnectedAccounts user={user} />
          </div>
        </Card>

        <TelegramCard />

        <Card>
          <CardHeader title={user.hasPassword ? "Пароль" : "Задать пароль"} description={user.hasPassword ? "Смена пароля для входа по email" : "Сейчас вы входите только через Google или GitHub"} />
          <div className="px-4 pb-4 pt-3 sm:px-5">
            <PasswordForm hasPassword={user.hasPassword} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Сеанс" description="Выход на этом устройстве" />
          <div className="px-4 pb-4 pt-3 sm:px-5">
            <Button
              variant="outline"
              iconBefore="logOut"
              onClick={async () => {
                await logout();
                navigate("/", { replace: true });
              }}
            >
              Выйти из аккаунта
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
