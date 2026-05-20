## Stack. (Стек).
| Layer | Technology |
|-------|-----------|
| Frontend | React + HTML + CSS |
| Backend | ASP.NET Core |
| Database | Microsoft SQL Server |
| Containerization | Docker |
| Orchestration | Kubernetes (kind) |
| Package Manager | Helm |
| Ingress | nginx-ingress + MetalLB |
| TLS | cert-manager + Let's Encrypt |
| GitOps | ArgoCD |
| Tunnel | Cloudflare Tunnel |
## Project Structure. (Структура проекта).

- **Docker/**
  - `Dockerfile.client`
  - `Dockerfile.server`
  - `nginx.conf`
  - `docker-compose.yml`
  - `.env`

- **Helm/issuetracker/**
  - `Chart.yaml`
  - `values.yaml`
  - **templates/**
    - `client-deployment.yaml`
    - `client-service.yaml`
    - `server-deployment.yaml`
    - `server-service.yaml`
    - `mssql.yaml`
    - `mssql-service.yaml`
    - `ingress.yaml`
    - `secret.yaml`
    - `cert-issuer.yaml`

- **ArgoCD/**
  - `Application.yaml`
## Prerequisites. (Необходимые инструменты).

Before deploying, make sure you have the following tools installed. (Перед развертыванием убедитесь, что у вас установлены следующие инструменты):

### Docker
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### kind
```bash
curl -Lo ./kind https://kind.sigs.k8s.io/dl/latest/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind
```

### kubectl
```bash
curl -LO "https://dl.k8s.io/release/$(curl -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/kubectl
```

### Helm
```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### cloudflared
```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb
rm cloudflared.deb
```
| Tool | Purpose | Install |
|------|---------|---------|
| Docker | Container runtime | [docs.docker.com](https://docs.docker.com/get-docker/) |
| kind | Local Kubernetes cluster | [kind.sigs.k8s.io](https://kind.sigs.k8s.io/) |
| kubectl | Kubernetes CLI | [kubernetes.io](https://kubernetes.io/docs/tasks/tools/) |
| Helm | Kubernetes package manager | [helm.sh](https://helm.sh/docs/intro/install/) |
| cloudflared | Cloudflare Tunnel (expose without port forwarding) | [developers.cloudflare.com](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/) |
---

## Deploy — Step by Step. (Развертывание — Шаг за шагом).
### 1. Create kind cluster. (Создать своего рода кластер).

```bash
kind create cluster --config kind-config.yaml
```

```yaml
# kind-config.yaml
apiVersion: kind.x-k8s.io/v1alpha4
kind: Cluster
name: kind
nodes:
  - role: control-plane
  - role: worker
  - role: worker
networking:
  disableDefaultCNI: false
```
