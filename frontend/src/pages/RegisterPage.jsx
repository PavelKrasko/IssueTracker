import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { OrDivider, SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { Icon } from "@/components/icons";
import { Button, Checkbox, FieldError, FormAlert, PasswordField, TextField } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { cn, focusRing } from "@/utils/cn";
import { focusFirstError, PASSWORD_RULES, validateEmail, validateNewPassword } from "@/utils/validation";

export default function RegisterPage() {
  const { register, oauthLogin } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", name: "", password: "", terms: false });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [loading, setLoading] = useState(false);
  const refs = { email: useRef(null), name: useRef(null), password: useRef(null), terms: useRef(null) };

  const set = (key) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    const v = {
      email: validateEmail(form.email),
      name: form.name.trim() ? undefined : "Введите имя и фамилию.",
      password: validateNewPassword(form.password),
      terms: form.terms ? undefined : "Чтобы создать аккаунт, примите условия использования.",
    };
    setErrors(v);
    if (focusFirstError(v, refs)) return;

    setLoading(true);
    try {
      await register(form);
      navigate("/app/board", { replace: true });
    } catch (err) {
      setLoading(false);
      if (err.fields) setErrors(err.fields);
      setFormError(
        err.code === "EMAIL_TAKEN" ? (
          <>
            {err.message}{" "}
            <Link to="/login" state={{ email: form.email }} className={cn("font-semibold underline", focusRing)}>
              Войти с этим email
            </Link>
          </>
        ) : (
          err.message
        )
      );
      refs.email.current?.focus();
    }
  };

  const onSocial = (provider) => oauthLogin(provider);

  return (
    <AuthLayout
      title="Создайте аккаунт"
      subtitle="Бесплатно, без карты и пробного периода"
      footer={
        <>
          Уже есть аккаунт?{" "}
          <Link to="/login" className={cn("rounded-sm text-ink-brand hover:underline", focusRing)}>
            Войти
          </Link>
        </>
      }
    >
      <SocialAuthButtons onAuth={onSocial} disabled={loading} verb="Зарегистрироваться" />
      <OrDivider />

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError && <FormAlert>{formError}</FormAlert>}
        <TextField
          ref={refs.email}
          label="Email"
          type="email"
          size="lg"
          autoComplete="email"
          inputMode="email"
          placeholder="name@example.com"
          required
          value={form.email}
          onChange={set("email")}
          error={errors.email}
          disabled={loading}
        />
        <TextField
          ref={refs.name}
          label="Имя и фамилия"
          size="lg"
          autoComplete="name"
          required
          maxLength={100}
          value={form.name}
          onChange={set("name")}
          error={errors.name}
          disabled={loading}
        />
        <div className="flex flex-col gap-2">
          <PasswordField
            ref={refs.password}
            label="Пароль"
            autoComplete="new-password"
            required
            value={form.password}
            onChange={set("password")}
            error={errors.password}
            describedBy="password-rules"
            disabled={loading}
          />
          <ul id="password-rules" aria-label="Требования к паролю" className="flex flex-col gap-1">
            {PASSWORD_RULES.map((r) => {
              const ok = r.test(form.password);
              return (
                <li key={r.id} className={cn("flex items-center gap-1.5 text-xs", ok ? "text-success-text" : "text-ink-subtlest")}>
                  <Icon name={ok ? "check" : "circle"} className="h-3.5 w-3.5" />
                  {r.label}
                  <span className="sr-only">{ok ? " — выполнено" : " — не выполнено"}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex flex-col gap-1">
          <Checkbox
            ref={refs.terms}
            checked={form.terms}
            onChange={set("terms")}
            disabled={loading}
            aria-invalid={errors.terms ? true : undefined}
            aria-describedby={errors.terms ? "terms-error" : undefined}
            label={<span className="text-xs text-ink-subtle">Я принимаю условия использования и политику конфиденциальности IssueTracker.</span>}
          />
          {errors.terms && <FieldError id="terms-error">{errors.terms}</FieldError>}
        </div>
        <Button type="submit" variant="primary" size="lg" full loading={loading}>
          {loading ? "Создаём аккаунт…" : "Зарегистрироваться"}
        </Button>
      </form>
    </AuthLayout>
  );
}
