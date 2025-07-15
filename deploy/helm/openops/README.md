# OpenOps Helm Chart

This Helm chart deploys the OpenOps application stack to a Kubernetes cluster.

## Components

- **nginx**: Reverse proxy and load balancer (exposed via LoadBalancer)
- **openops-app**: Main application server
- **openops-engine**: Task execution engine
- **openops-tables**: Data tables service (Baserow)
- **openops-analytics**: Analytics dashboard (Superset)
- **postgres**: PostgreSQL database
- **redis**: Redis cache

## Installation

1. Create a values file with your configuration:

```yaml
secrets:
  encryptionKey: "your-encryption-key"
  jwtSecret: "your-jwt-secret"
  adminEmail: "admin@example.com"
  adminPassword: "your-admin-password"
  analyticsAdminPassword: "your-analytics-password"
  analyticsPoweruserPassword: "your-poweruser-password"
  postgresUsername: "postgres"
  postgresPassword: "your-postgres-password"
  postgresDatabase: "openops"
  tablesPublicUrl: "https://your-domain.com/openops-tables"
  tablesDbHost: "postgres"
  tablesDatabaseName: "tables"
  postgresHost: "postgres"
```

2. Install the chart:

```bash
helm install openops ./deploy/helm/openops -f values.yaml
```

## Storage

The chart creates PersistentVolumeClaims for:
- PostgreSQL data (20Gi)
- Redis data (5Gi)
- Tables data (10Gi)
- Azure CLI config (1Gi)
- Google Cloud SDK config (1Gi)

You can configure storage classes in the values.yaml file.

## Networking

- nginx service is exposed as LoadBalancer on port 80
- All other services use ClusterIP for internal communication
- The nginx configuration routes traffic to appropriate backend services

## Dependencies

The deployments include proper dependency management with health checks and readiness probes.