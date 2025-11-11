ARG VARIANT=1.1.12-20-bullseye
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:${VARIANT}

RUN <<-```
    npm install -g nx cross-env@7.0.3 mint-mcp
    npx -y mint-mcp add docs.openops.com
    apt-get update && apt-get install -y --no-install-recommends \
      git \
      locales \
      locales-all \
      libcap-dev \
      wget \
      unzip
    rm -rf /var/lib/apt/lists/*
```

# Set the locale
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8
ENV AZURE_CONFIG_DIR="/tmp/azure"
ENV AZURE_EXTENSION_DIR="/opt/azure/config/cliextensions"

RUN <<-```
  # Install yq
  wget https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 -O /usr/bin/yq
  chmod +x /usr/bin/yq

  # Install hcledit
  wget https://github.com/minamijoyo/hcledit/releases/download/v0.2.15/hcledit_0.2.15_linux_amd64.tar.gz -O /tmp/hcledit_0.2.15_linux_amd64.tar.gz
  tar -C /usr/bin -xf /tmp/hcledit_0.2.15_linux_amd64.tar.gz
  chmod +x /usr/bin/hcledit
  rm /tmp/hcledit_0.2.15_linux_amd64.tar.gz

  # Install AWS CLI
  curl -L "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
  unzip awscliv2.zip
  ./aws/install
  rm -rf aws awscliv2.zip

  # Install Azure CLI
  curl -sL https://aka.ms/InstallAzureCLIDeb | bash
  mkdir -p /tmp/azure
  mkdir -p /opt/azure/config/cliextensions

  # Configure Azure CLI extensions
  az config set extension.use_dynamic_install=yes_without_prompt
  az extension add --name reservation --only-show-errors || true
  az extension add --name resource-graph --only-show-errors || true
  az extension add --name costmanagement --only-show-errors || true
  az extension add --name billing-benefits --only-show-errors || true
  az extension add --name quotas --only-show-errors || true
  az extension add --name ssh --only-show-errors || true

  # Install Google Cloud CLI
  curl -sSL https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-516.0.0-linux-x86_64.tar.gz -o /tmp/gcloud.tar.gz
  mkdir -p /opt && tar -C /opt -xf /tmp/gcloud.tar.gz
  /opt/google-cloud-sdk/install.sh --quiet
  /opt/google-cloud-sdk/bin/gcloud components install beta --quiet
  ln -s /opt/google-cloud-sdk/bin/gcloud /usr/bin/gcloud
  rm /tmp/gcloud.tar.gz
```

ENV PATH="/opt/google-cloud-sdk/bin:$PATH"

SHELL ["/bin/bash", "-c"]
WORKDIR /root/.mcp/superset
RUN <<-```
    set -ex
    git clone https://github.com/openops-cloud/superset-mcp .
    wget -qO- https://astral.sh/uv/install.sh | sh && source $HOME/.local/bin/env
    uv venv && uv pip install .
```

WORKDIR /root/.mcp/openops-mcp
RUN <<-```
    set -ex
    git clone https://github.com/openops-cloud/openops-mcp .
    git checkout 7f964bd4fcfd46fbb7ab4b96abd15e4d3d77758d
    wget -qO- https://astral.sh/uv/install.sh | sh && source $HOME/.local/bin/env
    uv venv && . .venv/bin/activate && uv pip install -r requirements.txt
```

WORKDIR /root/.mcp/aws-cost
RUN <<-```
    set -ex
    git clone https://github.com/awslabs/mcp.git .
    git checkout 2025.10.20251006150229
    wget -qO- https://astral.sh/uv/install.sh | sh && source $HOME/.local/bin/env
    uv python install 3.10
    uv venv --python 3.10 .venv
    . .venv/bin/activate
    uv pip install ./src/cost-explorer-mcp-server
    uv pip install ./src/aws-pricing-mcp-server
    uv pip install ./src/billing-cost-management-mcp-server
```

WORKDIR /workspaces

