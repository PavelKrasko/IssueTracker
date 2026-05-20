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
## Структура проекта
issuetracker-devops/
├── docker/
│   ├── Dockerfile.server "+" Is used
│   ├── Dockerfile.client "+" Is used
│   └── nginx.conf "+" Is used          
├── helm/issuetracker/       
│   ├── Chart.yaml "+" Is used
│   ├── values.yaml "+" Is used          
│   └── templates/
│       └── cert-issuer.yaml "-" Not used
│       └── client-deployment.yaml "+" Is used
│       └── client-service.yaml "+" Is used
│       └── server-deployment.yaml "+" Is used
│       └── server-service.yaml "+" Is used
│       └── mssql-deployment.yaml "+" Is used
│       └── mssql-service.yaml "+" Is used
│       └── ingress.yaml "+" Is used
│       └── secret.yaml "+" Is used
├── argocd/
│   └── Application.yaml "+" Is used
├── monitoring/
│   ├── prometheus-values.yaml
│   └── loki-values.yaml
└── .github/workflows/
    └── deploy.yml