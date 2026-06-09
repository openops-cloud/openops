# ---- Builder stage: native addons and MCP dependencies ----
FROM node:24.16.0-alpine3.23 AS builder

RUN <<-```
    set -ex
    apk add --no-cache python3 g++ make py3-setuptools musl-dev git wget bash findutils
    yarn config set python /usr/bin/python3
```

# Install uv once for all MCP venvs
RUN wget -qO- https://astral.sh/uv/install.sh | sh

# Build MCP: openops-mcp
WORKDIR /root/.mcp/openops-mcp
RUN <<-```
    set -ex
    git clone https://github.com/openops-cloud/openops-mcp .
    git checkout 5d6d9e515ad27bf1237d7e4df84b9ba9832214fb
    source $HOME/.local/bin/env
    uv venv && . .venv/bin/activate && uv pip install --no-cache-dir -r requirements.txt
```

# Build MCP: aws-cost
WORKDIR /root/.mcp/aws-cost
RUN <<-```
    set -ex
    git clone --depth 1 --branch 2025.10.20251006150229 https://github.com/awslabs/mcp.git .
    rm -rf .git
    source $HOME/.local/bin/env
    python3 -m venv .venv
    . .venv/bin/activate
    pip install --no-cache-dir ./src/cost-explorer-mcp-server
    pip install --no-cache-dir ./src/aws-pricing-mcp-server
    pip install --no-cache-dir ./src/billing-cost-management-mcp-server
```

# Install node_modules (needs native build tools for some packages)
WORKDIR /usr/src/app
COPY --link package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund && npm prune --omit=dev

# ---- Final stage: runtime only ----
FROM node:24.16.0-alpine3.23

ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
ENV LANGUAGE=en_US:en
ENV NODE_ENV=production
ENV OPS_CONTAINER_TYPE=APP

# Runtime dependencies only (no compilers)
RUN <<-```
    set -ex
    apk add --no-cache openssh-client python3 git nginx gettext bash findutils
```

# Copy MCP environments from builder
COPY --from=builder /root/.mcp /root/.mcp

# Set up backend
WORKDIR /usr/src/app

# Copy node_modules from builder (already compiled)
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --link package.json package-lock.json .npmrc ./
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
