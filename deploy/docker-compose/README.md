
# Docker Compose Deployment

This is a docker compose deployment of the OpenOps platform.


# Installation

See the [getting started guide](https://docs.openops.com/getting-started/deployment/local) for local deployment in our documentation.


# Connections

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


# Database Backups

PostgreSQL backups are automatically performed by the `postgres-backup` service according to best practices:

## Backup Configuration

- **Schedule**: Backups run daily at 2 AM by default (configurable via `BACKUP_SCHEDULE` env var using cron syntax)
- **Retention**: Backups are kept for 7 days by default (configurable via `BACKUP_RETENTION_DAYS` env var)
- **Initial Backup**: A backup is performed immediately when the service starts
- **Location**: Backups are stored in the `postgres_backups` Docker volume at `/backups`

## Backup Types

The service performs two types of backups:
1. **Database backup**: Individual database (`backup_YYYYMMDD_HHMMSS.sql.gz`)
2. **Full cluster backup**: All databases including analytics (`backup_all_YYYYMMDD_HHMMSS.sql.gz`)

## Customizing Backup Schedule

Edit your `.env` file to customize backup behavior:

```bash
# Run backups every 6 hours
BACKUP_SCHEDULE=0 */6 * * *

# Keep backups for 30 days
BACKUP_RETENTION_DAYS=30
```

## Restoring from Backup

To restore a backup:

```bash
# List available backups
docker exec -it <backup-container-name> ls -lh /backups

# Restore a specific backup
docker exec -i <postgres-container-name> \
  psql -U postgres -d openops < backup_20260107_020000.sql

# Or for compressed backups
docker exec -i <postgres-container-name> \
  bash -c "gunzip -c /backups/backup_20260107_020000.sql.gz | psql -U postgres -d openops"
```

## Accessing Backups

Backups can be copied from the container to your host:

```bash
docker cp <backup-container-name>:/backups ./postgres-backups
```

