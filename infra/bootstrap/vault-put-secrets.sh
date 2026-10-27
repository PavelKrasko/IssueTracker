#!/usr/bin/env bash
set -euo pipefail
STAND="${1:?usage: $0 dev|prod}"
KEYS_FILE="$HOME/.vault-keys.json"
CREDS_FILE="$HOME/.issuetracker/$STAND.env"
ROOT_TOKEN="$(jq -r '.root_token' "$KEYS_FILE")"
BASE="secret/issuetracker/$STAND"
v() {
  kubectl -n vault exec vault-0 -- env VAULT_TOKEN="$ROOT_TOKEN" vault "$@"
}
[ -f "$CREDS_FILE" ] || { echo "Нет файла $CREDS_FILE" >&2; exit 1; }
if ! v kv get "$BASE/postgres" > /dev/null 2>&1; then
  DB_PASS="$(openssl rand -hex 24)"
  v kv put "$BASE/postgres" \
    POSTGRES_USER=issuetracker \
    POSTGRES_PASSWORD="$DB_PASS" \
    POSTGRES_DB=issuetracker > /dev/null
  v kv put "$BASE/backend" \
    DATABASE_URL="postgres://issuetracker:${DB_PASS}@it-postgres:5432/issuetracker?sslmode=disable" \
    JWT_SECRET="$(openssl rand -hex 32)" > /dev/null
  echo "Созданы пароль БД и JWT для $STAND"
fi
mapfile -t PAIRS < <(grep -E '^[A-Z_]+=' "$CREDS_FILE" | tr -d '\r')
v kv patch "$BASE/backend" "${PAIRS[@]}" > /dev/null
echo "Секреты $STAND записаны в $BASE: $(printf '%s\n' "${PAIRS[@]}" | cut -d= -f1 | tr '\n' ' ')"