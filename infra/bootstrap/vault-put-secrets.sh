#!/usr/bin/env bash
set -euo pipefail
STAND="${1:?usage: $0 dev|prod}"
KEYS_FILE="$HOME/.vault-keys.json"
ROOT_TOKEN="$(jq -r '.root_token' "$KEYS_FILE")"
BASE="secret/issuetracker/$STAND"
v() {
  kubectl -n vault exec vault-0 -- env VAULT_TOKEN="$ROOT_TOKEN" vault "$@"
}
if v kv get "$BASE/postgres" > /dev/null 2>&1; then
  echo "$BASE уже заполнен, ничего не меняю."
  exit 0
fi
DB_PASS="$(openssl rand -hex 24)"
v kv put "$BASE/postgres" \
  POSTGRES_USER=issuetracker \
  POSTGRES_PASSWORD="$DB_PASS" \
  POSTGRES_DB=issuetracker > /dev/null
v kv put "$BASE/backend" \
  DATABASE_URL="postgres://issuetracker:${DB_PASS}@it-postgres:5432/issuetracker?sslmode=disable" \
  JWT_SECRET="$(openssl rand -hex 32)" > /dev/null
echo "Секреты записаны в $BASE"