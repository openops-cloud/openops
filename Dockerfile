# ---- Builder stage: native addons and MCP dependencies ----
FROM node:24.20.0-alpine3.24 AS builder

RUN <<-```
    set -ex
    apk add --no-cache python3 g++ make py3-setuptools musl-dev git wget bash findutils
    yarn config set python /usr/bin/python3
```

# Install uv to a deterministic location
RUN wget -qO- https://astral.sh/uv/install.sh \
    | env UV_UNMANAGED_INSTALL=/usr/local/bin sh

ENV UV_PYTHON_DOWNLOADS=never

# Build MCP: openops-mcp
WORKDIR /root/.mcp/openops-mcp
RUN <<-```
    set -ex
    git clone https://github.com/openops-cloud/openops-mcp .
    git checkout b7b3e8a0950f5bcc458f3dd38a4f23e4eb5c9c1a
    
    uv sync \
        --frozen \
        --no-dev \
        --no-install-project \
        --python /usr/bin/python3
```

# Build MCP: aws-cost
#
# mcp and fastmcp MUST stay pinned. The awslabs servers declare both with no upper bound, so
# the git tag above pins their source while their dependencies still resolve fresh from PyPI
# on every rebuild. mcp 2.0 renamed FastMCP to MCPServer, so a rebuild silently picked up
# mcp 2.x and all three servers died on startup with
# "ModuleNotFoundError: No module named 'mcp.server.fastmcp'" — which surfaced as the AI
# assistant hanging until nginx cut the stream, not as a build failure.
WORKDIR /root/.mcp/aws-cost
RUN <<-```
    set -ex
    git clone --depth 1 --branch 2025.10.20251006150229 \
        --filter=blob:none --sparse https://github.com/awslabs/mcp.git .
    git sparse-checkout set \
        src/cost-explorer-mcp-server \
        src/aws-pricing-mcp-server \
        src/billing-cost-management-mcp-server
    rm -rf .git

    printf 'mcp==1.30.0\nfastmcp==2.14.7\n' > constraints.txt

    uv venv --python /usr/bin/python3 .venv
    VIRTUAL_ENV=.venv uv pip install --no-cache --compile-bytecode \
        --constraint constraints.txt \
        ./src/cost-explorer-mcp-server \
        ./src/aws-pricing-mcp-server \
        ./src/billing-cost-management-mcp-server
```

# Install node_modules (needs native build tools for some packages)
WORKDIR /usr/src/app
COPY --link package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund && npm prune --omit=dev

# ---- Final stage: runtime only ----
FROM node:24.20.0-alpine3.24

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
