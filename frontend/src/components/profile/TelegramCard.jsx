import { useCallback, useEffect, useRef, useState } from "react";
import { telegramApi } from "@/api/notificationsApi";
import { Icon } from "@/components/icons";
import { Button, Card, CardHeader, FormAlert, Skeleton, Switch } from "@/components/ui";
import { useToast } from "@/context/ToastContext";

export function TelegramCard() {
  const toast = useToast();
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  const [waiting, setWaiting] = useState(null);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setState(await telegramApi.get());
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
    return () => clearInterval(pollRef.current);
  }, [load]);

  useEffect(() => {
    if (!waiting) return;
    pollRef.current = setInterval(async () => {
      if (Date.now() > waiting.until) {
        clearInterval(pollRef.current);
        setWaiting(null);
        return;
      }
      try {
        const s = await telegramApi.get();
        if (s.linked) {
          clearInterval(pollRef.current);
          setState(s);
          setWaiting(null);
          toast("Telegram подключён — уведомления придут в чат с ботом");
        }
      } catch {
      }
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [waiting, toast]);

  const connect = async () => {
    setBusy(true);
    setError("");
    try {
      const { url } = await telegramApi.link();
      window.open(url, "_blank", "noopener");
      setWaiting({ url, until: Date.now() + 15 * 60 * 1000 });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const setEnabled = async (enabled) => {
    try {
      setState(await telegramApi.setEnabled(enabled));
    } catch (e) {
      toast(e.message, { tone: "error" });
    }
  };

  const unlink = async () => {
    setBusy(true);
    try {
      setState(await telegramApi.unlink());
      toast("Telegram отключён");
    } catch (e) {
      toast(e.message, { tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card id="telegram" aria-labelledby="tg-title" className="scroll-mt-20">
      <CardHeader id="tg-title" title="Telegram" description="Назначения, упоминания, комментарии и смена статуса — сразу в мессенджер" />
      <div className="flex flex-col gap-3 px-4 pb-4 pt-3 sm:px-5">
        {error && <FormAlert>{error}</FormAlert>}
        {!state ? (
          <Skeleton className="h-10" />
        ) : !state.available ? (
          <p className="text-sm text-ink-subtle">
            Бот не настроен на сервере. Администратору: создайте бота у <b>@BotFather</b> и укажите токен в <code className="rounded-xs bg-neutral px-1">TELEGRAM_BOT_TOKEN</code> (см. README).
          </p>
        ) : state.linked ? (
          <>
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#229ED9] text-white">
                <Icon name="send" className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">Подключён{state.username ? ` — @${state.username}` : ""}</p>
                <p className="text-xs text-ink-subtle">Бот: @{state.botUsername || "…"}</p>
              </div>
              <Button size="sm" variant="subtle" onClick={unlink} loading={busy}>
                Отключить
              </Button>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span id="tg-enabled" className="text-sm text-ink">
                Присылать уведомления в Telegram
              </span>
              <Switch checked={state.enabled} onChange={setEnabled} label="Присылать уведомления в Telegram" describedBy="tg-enabled" />
            </div>
          </>
        ) : waiting ? (
          <div className="flex flex-col gap-2 rounded-md border border-line bg-surface-sunken p-3 text-sm">
            <p className="flex items-center gap-2 font-semibold text-ink">
              <span className="h-2 w-2 animate-pulse rounded-full bg-brand" aria-hidden="true" />
              Ждём подтверждения в Telegram…
            </p>
            <p className="text-ink-subtle">
              В открывшемся чате с ботом нажмите <b>«Запустить» / Start</b>. Если Telegram не открылся —{" "}
              <a href={waiting.url} target="_blank" rel="noopener noreferrer" className="text-ink-brand underline">
                откройте ссылку
              </a>
              . Ссылка действует 15 минут.
            </p>
            <div>
              <Button size="sm" variant="subtle" onClick={() => setWaiting(null)}>
                Отмена
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Button iconBefore="send" onClick={connect} loading={busy} disabled={!state.botUsername}>
              Подключить Telegram
            </Button>
            {!state.botUsername && <span className="text-xs text-ink-subtle">Сервер пока не связался с Telegram — попробуйте через минуту.</span>}
          </div>
        )}
      </div>
    </Card>
  );
}
