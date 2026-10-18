export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value) {
  if (!value.trim()) return "Введите email.";
  if (!EMAIL_RE.test(value.trim())) return "Введите email в формате name@example.com.";
  return undefined;
}

export const PASSWORD_RULES = [
  { id: "len", label: "Не меньше 8 символов", test: (p) => p.length >= 8 },
  { id: "letter", label: "Хотя бы одна буква", test: (p) => /\p{L}/u.test(p) },
  { id: "digit", label: "Хотя бы одна цифра", test: (p) => /\d/.test(p) },
];

export function validateNewPassword(value) {
  if (!value) return "Придумайте пароль.";
  if (!PASSWORD_RULES.every((r) => r.test(value))) return "Пароль не соответствует требованиям.";
  return undefined;
}

export function focusFirstError(errors, refs) {
  const key = Object.keys(refs).find((k) => errors[k]);
  if (key) refs[key].current?.focus();
  return Boolean(key);
}
