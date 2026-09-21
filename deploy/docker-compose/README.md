# Docker Compose Deployment

This is a docker compose deployment of the OpenOps platform.

# Installation

See the [getting started guide](https://docs.openops.com/getting-started/deployment/local) for local deployment in our documentation.

# MCP server for external agents

External agents such as Claude Code or Codex connect to OpenOps through the `openops-mcp`
container, which is disabled by default. It sits behind the gateway at `${OPS_PUBLIC_URL}/mcp`
and authenticates agents with OAuth issued by the OpenOps API.

To enable it, in `.env`:

- `OPS_PUBLIC_URL` must be `https://...` (plain `http` is only accepted for `localhost`), so
  enable TLS first.
- `OPS_OAUTH_ENABLED=true` turns on OAuth in the app. The issuer and resource URLs derive from
  `OPS_PUBLIC_URL` and normally need no change.
- `OPS_OAUTH_RS_CLIENT_SECRET` is empty by default and must be set to a random value of at least
  32 characters, for example `openssl rand -hex 32`. The MCP container refuses to start without it.
- `COMPOSE_PROFILES=mcp` enables the `mcp` compose profile, so the usual `docker compose up -d`
  (and the install script) also pulls and starts the MCP container.
- The MCP image version is pinned in `docker-compose.yml` and pulled from the public
  `openops.azurecr.io` registry.

Then restart the stack:

```bash
docker compose up -d
```

If you prefer not to set `COMPOSE_PROFILES` in `.env`, pass the profile on the command line
instead: `docker compose --profile mcp up -d`.

Existing installations keep their `.env` across upgrades (the install script never rewrites
it), so the `OPS_OAUTH_*`, `OPS_MCP_RESOURCE_URL` and `COMPOSE_PROFILES` lines from
`.env.defaults` have to be copied into `.env` by hand before enabling MCP. The install script
does not generate `OPS_OAUTH_RS_CLIENT_SECRET` either; always set it yourself.

Connect an agent to `${OPS_PUBLIC_URL}/mcp`, for example:

```bash
claude mcp add --transport http openops https://<host>/mcp
```

The first tool call opens a browser to approve the connection under Settings → Connected apps.

# Connections

## Redis configuration

OpenOps supports Redis over TLS for deployments where Redis is not running on the
same private Docker network. The application and worker accept the following
environment variables (prefixed with `OPS_` in the deployment environment):

| Variable             | Description                                                                                                             |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `OPS_REDIS_URL`      | Complete ioredis connection URL. When set, it takes precedence over the host/port settings.                             |
| `OPS_REDIS_HOST`     | Redis hostname, used when `OPS_REDIS_URL` is not set.                                                                   |
| `OPS_REDIS_PORT`     | Redis port, used with `OPS_REDIS_HOST`.                                                                                 |
| `OPS_REDIS_USE_SSL`  | Set to `true` to enable TLS when using host/port settings.                                                              |
| `OPS_REDIS_USER`     | Optional Redis username.                                                                                                |
| `OPS_REDIS_PASSWORD` | Redis password or auth token. Store it in the deployment secret store rather than committing it to an environment file. |
| `OPS_REDIS_DB`       | Redis database number; defaults to `0`.                                                                                 |

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
