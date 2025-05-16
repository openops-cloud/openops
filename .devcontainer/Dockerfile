# [Choice] Node.js version (use -bullseye variants on local arm64/Apple Silicon): 18, 16, 14, 18-bullseye, 16-bullseye, 14-bullseye, 18-buster, 16-buster, 14-buster
ARG VARIANT=18-bullseye
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:0-${VARIANT}

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
    git clone --depth 1 https://github.com/openops-cloud/superset-mcp .
    wget -qO- https://astral.sh/uv/install.sh | sh && source $HOME/.local/bin/env
    uv venv && uv pip install .
```

WORKDIR /workspaces


