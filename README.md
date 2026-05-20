## 🏗️ Stack
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
## 📁 Project Structure

- 📁 **Docker/**
  - 🐳 `Dockerfile.client` — React app (nginx)
  - 🐳 `Dockerfile.server` — ASP.NET Core API
  - ⚙️ `nginx.conf` — Proxy /api → issuetracker-server
  - 🐳 `docker-compose.yml` — Local development
  - 🔒 `.env` — Local only, not committed

- 📁 **Helm/issuetracker/**
  - 📄 `Chart.yaml`
  - ⚙️ `values.yaml`
  - 📁 **templates/**
    - `client-deployment.yaml`
    - `client-service.yaml`
    - `server-deployment.yaml`
    - `server-service.yaml`
    - `mssql.yaml`
    - `mssql-service.yaml`
    - `ingress.yaml`
    - `secret.yaml`
    - `cert-issuer.yaml`

- 📁 **ArgoCD/**
  - 📄 `Application.yaml`
