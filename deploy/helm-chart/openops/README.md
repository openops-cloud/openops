# openops

![Version: 0.1.0](https://img.shields.io/badge/Version-0.1.0-informational?style=flat-square) ![Type: application](https://img.shields.io/badge/Type-application-informational?style=flat-square) ![AppVersion: 1.16.0](https://img.shields.io/badge/AppVersion-1.16.0-informational?style=flat-square)

A Helm chart for Kubernetes

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| deploy | bool | `true` |  |
| environment | string | `"openops"` |  |
| globalvariables.ANALYTICS_ALLOW_ADHOC_SUBQUERY | bool | `true` |  |
| globalvariables.ANALYTICS_POWERUSER_PASSWORD | string | `"please-change-this-password-1"` |  |
| globalvariables.HOST_AZURE_CONFIG_DIR | string | `""` |  |
| globalvariables.OPS_ANALYTICS_ADMIN_PASSWORD | string | `"please-change-this-password-1"` |  |
| globalvariables.OPS_ANALYTICS_PRIVATE_URL | string | `"http://openops-analytics.openops.svc.cluster.local:8088"` |  |
| globalvariables.OPS_ANALYTICS_PUBLIC_URL | string | `"http://nginx-service.openops.svc.cluster.local"` |  |
| globalvariables.OPS_API_KEY | string | `"api-key"` |  |
| globalvariables.OPS_AWS_PRICING_ACCESS_KEY_ID | string | `""` |  |
| globalvariables.OPS_AWS_PRICING_SECRET_ACCESS_KEY | string | `""` |  |
| globalvariables.OPS_BLOCKS_SOURCE | string | `"FILE"` |  |
| globalvariables.OPS_BLOCKS_SYNC_MODE | string | `"NONE"` |  |
| globalvariables.OPS_DB_TYPE | string | `"POSTGRES"` |  |
| globalvariables.OPS_ENABLE_HOST_SESSION | string | `""` |  |
| globalvariables.OPS_ENCRYPTION_KEY | string | `"abcdef123456789abcdef123456789ab"` |  |
| globalvariables.OPS_ENGINE_URL | string | `"http://openops-engine.openops.svc.cluster.local:3005/execute"` |  |
| globalvariables.OPS_ENRICH_ERROR_CONTEXT | bool | `true` |  |
| globalvariables.OPS_ENVIRONMENT | string | `"prod"` |  |
| globalvariables.OPS_ENVIRONMENT_NAME | string | `"docker-compose"` |  |
| globalvariables.OPS_EXECUTION_MODE | string | `"SANDBOX_CODE_ONLY"` |  |
| globalvariables.OPS_FRONTEND_URL | string | `"http://nginx-service.openops.svc.cluster.local"` |  |
| globalvariables.OPS_JWT_SECRET | string | `"please-change-this-secret"` |  |
| globalvariables.OPS_JWT_TOKEN_LIFETIME_HOURS | int | `168` |  |
| globalvariables.OPS_LOGZIO_METRICS_TOKEN | string | `""` |  |
| globalvariables.OPS_LOGZIO_TOKEN | string | `""` |  |
| globalvariables.OPS_LOG_LEVEL | string | `"info"` |  |
| globalvariables.OPS_LOG_PRETTY | bool | `false` |  |
| globalvariables.OPS_MAX_CONCURRENT_TABLES_REQUESTS | int | `100` |  |
| globalvariables.OPS_OPENOPS_ADMIN_EMAIL | string | `"admin@openops.com"` |  |
| globalvariables.OPS_OPENOPS_ADMIN_PASSWORD | string | `"please-change-this-password-1"` |  |
| globalvariables.OPS_OPENOPS_TABLES_API_URL | string | `"http://openops-tables.openops.svc.cluster.local"` |  |
| globalvariables.OPS_OPENOPS_TABLES_DATABASE_NAME | string | `"tables"` |  |
| globalvariables.OPS_OPENOPS_TABLES_DB_HOST | string | `"postgres"` |  |
| globalvariables.OPS_OPENOPS_TABLES_PUBLIC_URL | string | `"http://nginx-service.openops.svc.cluster.local"` |  |
| globalvariables.OPS_POSTGRES_DATABASE | string | `"openops"` |  |
| globalvariables.OPS_POSTGRES_HOST | string | `"postgres.openops.svc.cluster.local"` |  |
| globalvariables.OPS_POSTGRES_PASSWORD | string | `"please-change-this-password-1"` |  |
| globalvariables.OPS_POSTGRES_PORT | int | `5432` |  |
| globalvariables.OPS_POSTGRES_USERNAME | string | `"postgres"` |  |
| globalvariables.OPS_PUBLIC_URL | string | `"http://nginx-service.openops.svc.cluster.local"` |  |
| globalvariables.OPS_QUEUE_MODE | string | `"REDIS"` |  |
| globalvariables.OPS_REDIS_HOST | string | `"redis.openops.svc.cluster.local"` |  |
| globalvariables.OPS_REDIS_PORT | int | `6379` |  |
| globalvariables.OPS_SLACK_APP_SIGNING_SECRET | string | `""` |  |
| globalvariables.OPS_TABLES_TOKEN_LIFETIME_MINUTES | int | `60` |  |
| globalvariables.OPS_TELEMETRY_COLLECTOR_URL | string | `""` |  |
| globalvariables.OPS_TRIGGER_DEFAULT_POLL_INTERVAL | int | `1` |  |
| globalvariables.OPS_WEBHOOK_TIMEOUT_SECONDS | int | `30` |  |
| nginx.image | string | `"nginx:1.27.4"` |  |
| nginx.replicas | int | `1` |  |
| openopsAnalytics.image | string | `"public.ecr.aws/openops/openops-analytics:0.12.15"` |  |
| openopsAnalytics.replicas | int | `1` |  |
| openopsAnalytics.resources.limits.memory | string | `"600Mi"` |  |
| openopsAnalytics.resources.requests.cpu | string | `"0.5"` |  |
| openopsAnalytics.resources.requests.memory | string | `"400Mi"` |  |
| openopsAnalytics.variables.ADMIN_PASSWORD | string | `"please-change-this-password-1"` |  |
| openopsAnalytics.variables.DATABASE_DB | string | `"analytics"` |  |
| openopsAnalytics.variables.DATABASE_DIALECT | string | `"postgresql"` |  |
| openopsAnalytics.variables.DATABASE_HOST | string | `"postgres.openops.svc.cluster.local"` |  |
| openopsAnalytics.variables.DATABASE_HOST_ALT | string | `"postgres"` |  |
| openopsAnalytics.variables.DATABASE_PASSWORD | string | `"please-change-this-password-1"` |  |
| openopsAnalytics.variables.DATABASE_PORT | string | `"5432"` |  |
| openopsAnalytics.variables.DATABASE_USER | string | `"postgres"` |  |
| openopsAnalytics.variables.GUNICORN_LOGLEVEL | string | `"debug"` |  |
| openopsAnalytics.variables.POWERUSER_PASSWORD | string | `"please-change-this-password-1"` |  |
| openopsAnalytics.variables.SUPERSET_FEATURE_ALLOW_ADHOC_SUBQUERY | string | `"${ANALYTICS_ALLOW_ADHOC_SUBQUERY}"` |  |
| openopsAnalytics.variables.SUPERSET_SECRET_KEY | string | `"abcdef123456789abcdef123456789ab"` |  |
| openopsApp.image | string | `"public.ecr.aws/openops/openops-app:0.2.1"` |  |
| openopsApp.replicas | int | `1` |  |
| openopsApp.resources.limits.memory | string | `"600Mi"` |  |
| openopsApp.resources.requests.cpu | string | `"0.5"` |  |
| openopsApp.resources.requests.memory | string | `"400Mi"` |  |
| openopsApp.variables.OPS_ANALYTICS_VERSION | string | `"0.12.15"` |  |
| openopsApp.variables.OPS_COMPONENT | string | `"app"` |  |
| openopsApp.variables.OPS_OPENOPS_TABLES_VERSION | string | `"0.1.8"` |  |
| openopsApp.variables.OPS_VERSION | string | `"0.2.1"` |  |
| openopsEngine.azureConfigDir | string | `"/tmp/azure"` |  |
| openopsEngine.image | string | `"public.ecr.aws/openops/openops-engine:0.2.1"` |  |
| openopsEngine.replicas | int | `1` |  |
| openopsEngine.resources.limits.memory | string | `"600Mi"` |  |
| openopsEngine.resources.requests.cpu | string | `"0.5"` |  |
| openopsEngine.resources.requests.memory | string | `"400Mi"` |  |
| openopsEngine.variables.OPS_BASE_CODE_DIRECTORY | string | `"/tmp/codes"` |  |
| openopsEngine.variables.OPS_COMPONENT | string | `"engine"` |  |
| openopsEngine.variables.OPS_SERVER_API_URL | string | `"http://openops-app.openops.svc.cluster.local/api/"` |  |
| openopsTables.image | string | `"public.ecr.aws/openops/openops-tables:0.1.8"` |  |
| openopsTables.replicas | int | `1` |  |
| openopsTables.resources.limits.memory | string | `"600Mi"` |  |
| openopsTables.resources.requests.cpu | string | `"0.5"` |  |
| openopsTables.resources.requests.memory | string | `"400Mi"` |  |
| openopsTables.variables.BASEROW_ACCESS_TOKEN_LIFETIME_MINUTES | string | `"30"` |  |
| openopsTables.variables.BASEROW_EXTRA_ALLOWED_HOSTS | string | `"*"` |  |
| openopsTables.variables.BASEROW_JWT_SIGNING_KEY | string | `"your-jwt-signing-key"` |  |
| openopsTables.variables.BASEROW_PRIVATE_URL | string | `"http://openops-tables"` |  |
| openopsTables.variables.BASEROW_PUBLIC_URL | string | `"http://openops-tables"` |  |
| openopsTables.variables.BASEROW_REFRESH_TOKEN_LIFETIME_HOURS | string | `"12"` |  |
| openopsTables.variables.DATABASE_HOST | string | `"postgres.openops.svc.cluster.local"` |  |
| openopsTables.variables.DATABASE_NAME | string | `"tables"` |  |
| openopsTables.variables.DATABASE_PASSWORD | string | `"please-change-this-password-1"` |  |
| openopsTables.variables.DATABASE_PORT | string | `"5432"` |  |
| openopsTables.variables.DATABASE_USER | string | `"postgres"` |  |
| openopsTables.variables.DISABLE_VOLUME_CHECK | string | `"yes"` |  |
| openopsTables.variables.MIGRATE_ON_STARTUP | string | `"true"` |  |
| openopsTables.variables.REDIS_URL | string | `"redis.openops.svc.cluster.local:6379/0"` |  |
| openopsTables.variables.SECRET_KEY | string | `"your-encryption-key"` |  |
| openopsTables.variables.SYNC_TEMPLATES_ON_STARTUP | string | `"false"` |  |
| postgres.image | string | `"postgres:14.4"` |  |
| postgres.replicas | int | `1` |  |
| postgres.resources.limits.memory | string | `"600Mi"` |  |
| postgres.resources.requests.cpu | string | `"0.5"` |  |
| postgres.resources.requests.memory | string | `"400Mi"` |  |
| postgres.variables.POSTGRES_DB | string | `"openops"` |  |
| postgres.variables.POSTGRES_MAX_CONNECTIONS | string | `"300"` |  |
| postgres.variables.POSTGRES_PASSWORD | string | `"please-change-this-password-1"` |  |
| postgres.variables.POSTGRES_USER | string | `"postgres"` |  |
| redis.image | string | `"redis:7.4.0"` |  |
| redis.replicas | int | `1` |  |
| redis.resources.limits.memory | string | `"400Mi"` |  |
| redis.resources.requests.cpu | string | `"0.3"` |  |
| redis.resources.requests.memory | string | `"300Mi"` |  |
| redis.variables | object | `{}` |  |
| redis.volumes[0].mountPath | string | `"/data"` |  |
| redis.volumes[0].name | string | `"redis-data"` |  |

----------------------------------------------
Autogenerated from chart metadata using [helm-docs v1.11.0](https://github.com/norwoodj/helm-docs/releases/v1.11.0)
