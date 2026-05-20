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
issuetracker-infrastructure/
├── Docker/
│   ├── Dockerfile.client      
│   ├── Dockerfile.server       
│   ├── nginx.conf              
│   ├── docker-compose.yml       
│   └── .env                     
│
├── Helm/issuetracker/
│   ├── Chart.yaml               
│   ├── values.yaml              
│   └── templates/
│       ├── client-deployment.yaml   
│       ├── client-service.yaml      
│       ├── server-deployment.yaml   
│       ├── server-service.yaml      
│       ├── mssql.yaml               
│       ├── mssql-service.yaml       
│       ├── ingress.yaml             
│       ├── secret.yaml              
│       └── cert-issuer.yaml         
│
└── ArgoCD/
    └── Application.yaml         
