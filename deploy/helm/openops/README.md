# OpenOps Helm Chart

> **Note**: This chart is a work in progress and may not be production-ready.

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

1. Edit the values.yaml file. Make sure to replace all passwords, encryption key, api key and JWT secret.
2. Install the chart:

```bash
helm install openops ./deploy/helm/openops -n openops --create-namespace
```

## Storage

The chart creates PersistentVolumeClaims for:
- PostgreSQL data (20Gi)
- Redis data (5Gi)
- Tables data (10Gi)

You can configure storage classes in the values.yaml file.

## Networking

- nginx service is exposed as LoadBalancer on port 80
- All other services use ClusterIP for internal communication
- The nginx configuration routes traffic to appropriate backend services

## Dependencies

The deployments include proper dependency management with health checks and readiness probes.
