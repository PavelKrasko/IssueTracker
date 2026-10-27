#!/usr/bin/env bash
set -euo pipefail
KEYS_FILE="$HOME/.vault-keys.json"
ROOT_TOKEN="$(jq -r '.root_token' "$KEYS_FILE")"
v() {
  kubectl -n vault exec -i vault-0 -- env VAULT_TOKEN="$ROOT_TOKEN" vault "$@"
}
v secrets enable -path=secret kv-v2 || true
v auth enable kubernetes || true
v write auth/kubernetes/config kubernetes_host=https://kubernetes.default.svc:443
v policy write issuetracker-read - <<EOF
path "secret/data/issuetracker/*" {
  capabilities = ["read"]
}
EOF
v write auth/kubernetes/role/external-secrets \
  bound_service_account_names=external-secrets \
  bound_service_account_namespaces=external-secrets \
  audience=vault \
  policies=issuetracker-read \
  ttl=1h

echo "Vault настроен."