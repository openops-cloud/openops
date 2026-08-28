
# Docker Compose Deployment

This is a docker compose deployment of the OpenOps platform.


# Installation

See the [getting started guide](https://docs.openops.com/getting-started/deployment/local) for local deployment in our documentation.


# Connections

## Redis configuration

OpenOps supports Redis over TLS for deployments where Redis is not running on the
same private Docker network. The application and worker accept the following
environment variables (prefixed with `OPS_` in the deployment environment):

| Variable | Description |
| --- | --- |
| `OPS_REDIS_URL` | Complete ioredis connection URL. When set, it takes precedence over the host/port settings. |
| `OPS_REDIS_HOST` | Redis hostname, used when `OPS_REDIS_URL` is not set. |
| `OPS_REDIS_PORT` | Redis port, used with `OPS_REDIS_HOST`. |
| `OPS_REDIS_USE_SSL` | Set to `true` to enable TLS when using host/port settings. |
| `OPS_REDIS_USER` | Optional Redis username. |
| `OPS_REDIS_PASSWORD` | Redis password or auth token. Store it in the deployment secret store rather than committing it to an environment file. |
| `OPS_REDIS_DB` | Redis database number; defaults to `0`. |

For an ElastiCache deployment with transit encryption required, use
`OPS_REDIS_USE_SSL=true` together with `OPS_REDIS_HOST`, `OPS_REDIS_PORT`, and
`OPS_REDIS_PASSWORD`. Alternatively, set `OPS_REDIS_URL` to an appropriate `rediss://`
URL. Do not enable a plaintext fallback when the Redis service requires TLS.

These settings are also passed to the workflow engine processes spawned by the worker,
so the app, worker, and engine use the same Redis configuration.

## Azure

To use the Azure CLI block, you need to create a connection to Azure. If you use the OpenOps platform to create the connection, you will have to use a service principal.

However, it is possible to share your local session with the platform for local applications.
To do this, you need to set two environment variables:
- `OPS_ENABLE_HOST_SESSION=true`: enables sharing of the host session with the platform container.
- `HOST_AZURE_CONFIG_DIR=/root/.azure`: defines the path to the host machine's Azure configuration folder that will be shared with the platform container

## Google Cloud

To use the Google Cloud CLI block, you need to create a connection to Google Cloud. If you use the OpenOps platform to create the connection, you will have to use a service account.

However, it is possible to share your local session with the platform for local applications.
To do this, you need to set two environment variables:
- `OPS_ENABLE_HOST_SESSION=true`: enables sharing of the host session with the platform container.
- `HOST_CLOUDSDK_CONFIG=/root/.config/gcloud`: defines the path to the host machine's Google Cloud configuration folder that will be shared with the platform container
