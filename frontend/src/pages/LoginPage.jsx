import { useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { oauthErrorMessage } from "@/components/auth/oauthMessages";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { OrDivider, SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { Button, FormAlert, PasswordField, TextField } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { cn, focusRing } from "@/utils/cn";
import { focusFirstError, validateEmail } from "@/utils/validation";

export default function LoginPage() {
  const { login, oauthLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const from = location.state?.from ?? "/app/board";

  const [email, setEmail] = useState(location.state?.email ?? "");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const refs = { email: useRef(null), password: useRef(null) };

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    const v = { email: validateEmail(email), password: password ? undefined : "Введите пароль." };
    setErrors(v);
    if (focusFirstError(v, refs)) return;

    setLoading(true);
    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      setFormError(err.message);
      setLoading(false);
      refs.password.current?.focus();
    }
  };

  const onSocial = (provider) => oauthLogin(provider);
  const oauthError = oauthErrorMessage(params.get("oauth_error"), params.get("provider"));

  return (
    <AuthLayout
      title="Войдите, чтобы продолжить"
      footer={
        <>
          Нет аккаунта?{" "}
          <Link to="/register" className={cn("rounded-sm text-ink-brand hover:underline", focusRing)}>
            Зарегистрироваться
          </Link>
        </>
      }
    >
      {oauthError && <FormAlert className="mb-4">{oauthError}</FormAlert>}
      <SocialAuthButtons onAuth={onSocial} disabled={loading} />
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
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErrors((x) => ({ ...x, email: undefined }));
          }}
          error={errors.email}
          disabled={loading}
        />
        <PasswordField
          ref={refs.password}
          label="Пароль"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setErrors((x) => ({ ...x, password: undefined }));
          }}
          error={errors.password}
          disabled={loading}
        />
        <Button type="submit" variant="primary" size="lg" full loading={loading}>
          {loading ? "Выполняется вход…" : "Войти"}
        </Button>
      </form>

    </AuthLayout>
  );
}
