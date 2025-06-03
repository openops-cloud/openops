FROM public.ecr.aws/lambda/nodejs:20

# Architecture will be set automatically by Docker buildx
ARG TARGETARCH

ENV NODE_VERSION=20.18.0
ENV NODE_ENV=production

RUN <<-```
    set -ex
    dnf install tar gzip shadow-utils util-linux findutils python3 make gcc gcc-c++ zlib-devel brotli-devel openssl-devel -y
    dnf -y clean all && rm -rf /var/cache
    
    # Install YQ with architecture-specific binary
    if [ "$TARGETARCH" = "arm64" ]; then
        curl -L https://github.com/mikefarah/yq/releases/latest/download/yq_linux_arm64 -o /usr/bin/yq
    else
        curl -L https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 -o /usr/bin/yq
    fi
    chmod +x /usr/bin/yq
    
    # Install hcledit (note: arm64 version might not be available, defaulting to amd64)
    curl -L https://github.com/minamijoyo/hcledit/releases/download/v0.2.15/hcledit_0.2.15_linux_amd64.tar.gz -o /tmp/hcledit_0.2.15_linux_amd64.tar.gz
    tar -C /usr/bin -xf /tmp/hcledit_0.2.15_linux_amd64.tar.gz
    chmod +x /usr/bin/hcledit
    rm /tmp/hcledit_0.2.15_linux_amd64.tar.gz
    
    # Install AWS CLI with architecture-specific package
    if [ "$TARGETARCH" = "arm64" ]; then
        curl -L https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip -o awscliv2.zip
    else
        curl -L https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip -o awscliv2.zip
    fi
    unzip -q awscliv2.zip
    chmod +x ./aws/install
    ./aws/install
    rm awscliv2.zip
    rm -rf aws
```

ENV LD_LIBRARY_PATH=""
ENV AZURE_CONFIG_DIR="/tmp/azure"
RUN <<-```
    set -ex
    # Azure CLI installation from Microsoft repository supports both amd64 and arm64 architectures
    rpm --import https://packages.microsoft.com/keys/microsoft.asc
    curl -sSL https://packages.microsoft.com/config/rhel/8/prod.repo -o /etc/yum.repos.d/azure-cli.repo
    dnf install -y azure-cli && mkdir /tmp/azure
    dnf -y clean all && rm -rf /var/cache
```

ENV CLOUDSDK_CONFIG="/tmp/gcloud"
RUN <<-```
    set -ex
    dnf install -y gnupg unzip libstdc++ binutils python3
    
    # Install Google Cloud CLI with architecture-specific package
    if [ "$TARGETARCH" = "arm64" ]; then
        # For ARM64 architecture
        curl -sSL https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-516.0.0-linux-arm.tar.gz -o /tmp/gcloud.tar.gz
    else
        # For AMD64 architecture
        curl -sSL https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-516.0.0-linux-x86_64.tar.gz -o /tmp/gcloud.tar.gz
    fi
    mkdir -p /opt && tar -C /opt -xf /tmp/gcloud.tar.gz
    /opt/google-cloud-sdk/install.sh --quiet
    /opt/google-cloud-sdk/bin/gcloud components install beta --quiet

    chmod -R +x /opt/google-cloud-sdk/bin/
    ln -s /opt/google-cloud-sdk/bin/gcloud /usr/bin/gcloud

    rm /tmp/gcloud.tar.gz
    dnf -y clean all && rm -rf /var/cache
```
ENV PATH="/opt/google-cloud-sdk/bin:$PATH"

RUN <<-```
    set -ex
    mkdir -p /var/tmp-base && cd /var/tmp-base && mkdir -p npm-global .npm/_logs .npm/_cache codes
    npm config --global set prefix /tmp/npm-global
    npm config --global set cache /tmp/.npm/_cache
    npm config --global set logs-dir /tmp/.npm/_logs
    cd codes && npm init -y && npm i @tsconfig/node20@20.1.4 @types/node@20.14.8 typescript@5.6.3
    npm install -g node-gyp npm@9.3.1 cross-env@7.0.3
```

ENV PATH=/tmp/npm-global:$PATH

COPY --link package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund
COPY --link dist/packages/engine .
COPY --link dist dist

ARG VERSION=unknown
ENV OPS_VERSION=$VERSION

COPY tools/link-packages-to-root.sh tools/link-packages-to-root.sh
RUN ./tools/link-packages-to-root.sh

# This is required to make the isolated-vm package (code piece sandbox) work in arm64 docker images
# https://github.com/laverdet/isolated-vm/issues/424
ENV NODE_OPTIONS=--no-node-snapshot

ENTRYPOINT [ "/bin/bash", "-c" ]
CMD [ "cp -r /var/tmp-base/. /tmp/ && /lambda-entrypoint.sh main.handler; exit $?" ]
