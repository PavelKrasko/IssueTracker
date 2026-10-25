#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
ARGOCD_CHART_VERSION="${ARGOCD_CHART_VERSION:?set ARGOCD_CHART_VERSION}"

helm repo add argo https://argoproj.github.io/argo-helm
helm repo update
helm upgrade --install argocd argo/argo-cd \
  --namespace argocd --create-namespace \
  --version "$ARGOCD_CHART_VERSION" \
  -f "$ROOT_DIR/infra/bootstrap/argocd-values.yaml" \
  --wait
kubectl apply -f "$ROOT_DIR/infra/deploy/argocd/root.yaml"