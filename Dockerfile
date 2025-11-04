FROM node:20.19-alpine3.20

# Set the locale
ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US:en
ENV LC_ALL=en_US.UTF-8
ENV NODE_ENV=production

# Use a cache mount for apt to speed up the process
RUN <<-```
    set -ex
    apk add --no-cache openssh-client python3 g++ git musl libcap-dev nginx gettext wget py3-setuptools make bash findutils
    yarn config set python /usr/bin/python3
    npm install -g node-gyp npm@9.3.1 cross-env@7.0.3 mint-mcp
    npx -y mint-mcp add docs.openops.com && test -e /root/.mcp/docs.openops.com
```

RUN <<-```
    set -ex
    if command -v az >/dev/null 2>&1; then
        az config set extension.use_dynamic_install=yes_without_prompt
        az extension add --name reservation --only-show-errors || true
        az extension add --name resource-graph --only-show-errors || true
        az extension add --name costmanagement --only-show-errors || true
        az extension add --name billing-benefits --only-show-errors || true
        az extension add --name quotas --only-show-errors || true
        az extension add --name ssh --only-show-errors || true
    fi
```

WORKDIR /root/.mcp/superset
RUN <<-```
    set -ex
    git clone https://github.com/openops-cloud/superset-mcp .
    git checkout 1c391f7d0a261ee51f7b1e6c413f1930418d17fe
    wget -qO- https://astral.sh/uv/install.sh | sh
    python3 -m venv .venv && .venv/bin/pip install .
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
    python3 -m venv .venv
    . .venv/bin/activate
    pip install ./src/cost-explorer-mcp-server
    pip install ./src/aws-pricing-mcp-server
    pip install ./src/billing-cost-management-mcp-server
```

# Set up backend
WORKDIR /usr/src/app

# Even though we build the project outside of the container, we prefer to run npm ci here instead of including
# the node_modules directory in the build context. Including it in the build context means that we will always
# waste time on copying these 2.2GB even if no packages were changed.
COPY --link package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund
COPY --link dist dist

COPY tools/link-packages.sh tools/link-packages.sh
RUN ./tools/link-packages.sh

# Copy Output files to appropriate directory from build stage
COPY --link packages packages
COPY --link ai-prompts ai-prompts

LABEL service=openops

# Copy Nginx configuration template and static files
COPY nginx.template.conf /etc/nginx/nginx.template.conf
COPY dist/packages/react-ui/ /usr/share/nginx/html/

ARG VERSION=unknown
ENV OPS_VERSION=$VERSION

# Set up entrypoint script
COPY docker-entrypoint.sh .
RUN chmod +x docker-entrypoint.sh
ENTRYPOINT ["./docker-entrypoint.sh"]

EXPOSE 80
