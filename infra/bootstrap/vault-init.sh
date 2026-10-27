#!/usr/bin/env bash
set -euo pipefail
KEYS_FILE="$HOME/.vault-keys.json"
v() {
  kubectl -n vault exec vault-0 -- vault "$@"
}
if [ ! -f "$KEYS_FILE" ]; then
  v operator init -format=json > "$KEYS_FILE"
  chmod 600 "$KEYS_FILE"
  echo "Ключи сохранены в $KEYS_FILE — скопируй их в менеджер паролей."
fi
for i in 0 1 2; do
  v operator unseal "$(jq -r ".unseal_keys_b64[$i]" "$KEYS_FILE")" > /dev/null
done
v status