# ---- Builder stage: native addons and CLI tools that need compilers ----
FROM node:24.16.0-bookworm-slim AS builder

ARG TARGETARCH

RUN <<-```
    set -ex
    apt-get update && apt-get install -y --no-install-recommends \
      make gcc g++ python3 python3-pip python3-dev \
      libffi-dev libssl-dev \
      git curl unzip tar gzip gnupg ca-certificates
    rm -rf /var/lib/apt/lists/*
```

# Install Azure CLI (needs compiler for native deps)
RUN <<-```
    set -ex
    pip3 install --no-cache-dir --break-system-packages azure-cli==2.74.0
    mkdir -p /opt/azure/config/cliextensions
    az config set extension.use_dynamic_install=yes_without_prompt
    az extension add --name reservation --only-show-errors || true
    az extension add --name resource-graph --only-show-errors || true
    az extension add --name costmanagement --only-show-errors || true
    az extension add --name billing-benefits --only-show-errors || true
    az extension add --name quotas --only-show-errors || true
    az extension add --name ssh --only-show-errors || true
```

# Install node_modules (needs gcc/g++ for native addons like isolated-vm)
WORKDIR /usr/src/app
COPY --link package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund && npm prune --omit=dev

# Strip Azure CLI caches and test files
RUN find /usr/local/lib/python3.11/dist-packages -type d \
    \( -name __pycache__ -o -name tests -o -name test -o -name samples \) \
    -exec rm -rf {} + 2>/dev/null; \
    find /usr/local/lib/python3.11/dist-packages -name "*.pyc" -delete 2>/dev/null; \
    true

# ---- Final stage: runtime only ----
FROM node:24.16.0-bookworm-slim

ARG TARGETARCH

ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
ENV LANGUAGE=en_US:en
ENV NODE_ENV=production
ENV OPS_CONTAINER_TYPE=WORKER

# Runtime dependencies only
RUN <<-```
    set -ex
    apt-get update && apt-get install -y --no-install-recommends \
      bash findutils python3 procps \
      libffi8 libssl3 libstdc++6 \
      git curl tar gzip ca-certificates
    rm -rf /var/lib/apt/lists/*
```

# Install yq
RUN <<-```
    set -ex
    if [ "$TARGETARCH" = "arm64" ]; then
        curl -L https://github.com/mikefarah/yq/releases/latest/download/yq_linux_arm64 -o /usr/bin/yq
    else
        curl -L https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 -o /usr/bin/yq
    fi
    chmod +x /usr/bin/yq
```

# Install hcledit
RUN <<-```
    set -ex
    if [ "$TARGETARCH" = "arm64" ]; then
        curl -L https://github.com/minamijoyo/hcledit/releases/download/v0.2.18/hcledit_0.2.18_linux_arm64.tar.gz -o /tmp/hcledit.tar.gz
    else
        curl -L https://github.com/minamijoyo/hcledit/releases/download/v0.2.18/hcledit_0.2.18_linux_amd64.tar.gz -o /tmp/hcledit.tar.gz
    fi
    tar -C /usr/bin -xf /tmp/hcledit.tar.gz hcledit
    chmod +x /usr/bin/hcledit
    rm /tmp/hcledit.tar.gz
```

# Copy Azure CLI from builder (pip-installed packages + extensions)
COPY --from=builder /usr/local/lib/python3.11/dist-packages /usr/local/lib/python3.11/dist-packages
COPY --from=builder /usr/local/bin/az /usr/local/bin/az
COPY --from=builder /opt/azure /opt/azure
ENV AZURE_CONFIG_DIR="/tmp/azure"
ENV AZURE_EXTENSION_DIR="/opt/azure/config/cliextensions"

# Install AWS CLI v2 (install + cleanup in single layer to avoid size waste)
RUN <<-```
    set -ex
    apt-get update && apt-get install -y --no-install-recommends unzip
    if [ "$TARGETARCH" = "arm64" ]; then
        curl -L https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip -o /tmp/awscliv2.zip
    else
        curl -L https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip -o /tmp/awscliv2.zip
    fi
    unzip -q /tmp/awscliv2.zip -d /tmp
    /tmp/aws/install
    rm -rf /tmp/awscliv2.zip /tmp/aws
    apt-get purge -y unzip && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*
```

# Install Google Cloud CLI (no compiler needed)
ENV CLOUDSDK_CONFIG="/tmp/gcloud"

RUN <<-```
    set -ex
    if [ "$TARGETARCH" = "arm64" ]; then
        curl -sSL https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-516.0.0-linux-arm.tar.gz -o /tmp/gcloud.tar.gz
    else
        curl -sSL https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-516.0.0-linux-x86_64.tar.gz -o /tmp/gcloud.tar.gz
    fi
    tar -C /opt -xf /tmp/gcloud.tar.gz
    /opt/google-cloud-sdk/install.sh --quiet
    /opt/google-cloud-sdk/bin/gcloud components install beta --quiet
    chmod -R +x /opt/google-cloud-sdk/bin/
    ln -s /opt/google-cloud-sdk/bin/gcloud /usr/bin/gcloud
    rm /tmp/gcloud.tar.gz
    # Strip caches, docs, and bundled Python that isn't needed
    rm -rf /opt/google-cloud-sdk/.install \
           /opt/google-cloud-sdk/platform/bundledpythonunix \
           /opt/google-cloud-sdk/data/cli/*.json.bak 2>/dev/null || true
    find /opt/google-cloud-sdk -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
```

ENV PATH="/opt/google-cloud-sdk/bin:$PATH"

# Set up tmp-base for code block sandbox
RUN <<-```
    set -ex
    mkdir -p /var/tmp-base && cd /var/tmp-base && mkdir -p npm-global .npm/_logs .npm/_cache codes
    npm config --global set prefix /tmp/npm-global
    npm config --global set cache /tmp/.npm/_cache
    npm config --global set logs-dir /tmp/.npm/_logs
    cd codes && npm init -y && npm i @tsconfig/node20@20.1.4 @types/node@20.14.8 typescript@5.6.3
    npm install -g node-gyp cross-env@7.0.3
```

ENV PATH=/tmp/npm-global:$PATH

# Application setup
WORKDIR /usr/src/app

# Copy pre-built node_modules from builder (production deps only)
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Strip non-essential files from node_modules
RUN find node_modules -type f \( -name "*.map" -o -name "*.md" \
    -o -name "CHANGELOG*" -o -name "LICENSE*" -o -name "*.d.ts.map" \) -delete 2>/dev/null; \
    find node_modules -type d \( -name docs -o -name example -o -name examples \
    -o -name test -o -name tests -o -name ".cache" \) -exec rm -rf {} + 2>/dev/null; \
    true
COPY --link package.json package-lock.json .npmrc ./
COPY --link dist dist

COPY tools/link-packages.sh tools/link-packages.sh
RUN ./tools/link-packages.sh

COPY --link packages packages

LABEL service=openops-worker

ARG VERSION=unknown
ENV OPS_VERSION=$VERSION

# Required for isolated-vm (code block sandbox) on arm64
ENV NODE_OPTIONS=--no-node-snapshot

RUN <<-```
    set -ex
    chown -R node:node /usr/src/app
    chmod -R o+rX /usr/src/app
    chmod -R o+rX /opt/azure /opt/google-cloud-sdk 2>/dev/null || true
    cp -r /var/tmp-base/. /tmp/
    mkdir -p /tmp/azure /tmp/gcloud
    chmod -R 1777 /tmp
```

USER node

ENTRYPOINT ["node", "--enable-source-maps", "dist/packages/server/api/main.js"]
