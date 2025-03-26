
# Docker Compose Deployment

This is a docker compose deployment of the OpenOps platform.


# Installation

1. Install [docker](https://docs.docker.com/engine/install/)
2. Copy the docker-compose folder to your machine
3. Copy the `.env.defaults` file to `.env` and edit it to set the correct values for the environment variables. Make sure to change the default passwords.
4. Run `docker-compose up -d`


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