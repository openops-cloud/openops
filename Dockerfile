FROM node:20.18-bullseye-slim

# Set the locale
ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US:en
ENV LC_ALL=en_US.UTF-8
ENV NODE_ENV=production

# Use a cache mount for apt to speed up the process
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
  --mount=type=cache,target=/var/lib/apt,sharing=locked \
  apt-get update && \
  apt-get install -y --no-install-recommends \
  openssh-client python3 g++ build-essential git locales locales-all libcap-dev nginx gettext wget && \
  rm -rf /var/lib/apt/lists/* && \
  yarn config set python /usr/bin/python3 && \
  npm install -g node-gyp npm@9.3.1 cross-env@7.0.3

# Set up backend
WORKDIR /usr/src/app

# Even though we build the project outside of the container, we prefer to run npm ci here instead of including
# the node_modules directory in the build context. Including it in the build context means that we will always
# waste time on copying these 2.2GB even if no packages were changed.
COPY --link package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund
COPY --link dist dist

COPY tools/link-packages-to-root.sh tools/link-packages-to-root.sh
RUN ./tools/link-packages-to-root.sh

# Copy Output files to appropriate directory from build stage
COPY --link packages packages

LABEL service=openops

# Copy Nginx configuration template and static files
COPY nginx.standard.conf /etc/nginx/nginx.conf
# Send nginx logs to console instead of writing to fileystem.
RUN ln -sf /dev/stdout /var/log/nginx/access.log \
  && ln -sf /dev/stderr /var/log/nginx/error.log
COPY dist/packages/react-ui/ /usr/share/nginx/html/

ARG VERSION=unknown
ENV OPS_VERSION=$VERSION

# Set up entrypoint script
COPY docker-entrypoint.sh .
RUN chmod +x docker-entrypoint.sh
ENTRYPOINT ["./docker-entrypoint.sh"]

EXPOSE 8080
