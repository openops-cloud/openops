FROM node:20.19-alpine3.20

# Set the locale
ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US:en
ENV LC_ALL=en_US.UTF-8
ENV NODE_ENV=production

# Use a cache mount for apt to speed up the process
RUN apk add --no-cache openssh-client python3 g++ git musl libcap-dev nginx gettext wget py3-setuptools make bash findutils && \
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
COPY --link ai-prompts ai-prompts

LABEL service=openops

# Copy Nginx configuration template and static files
COPY nginx.standard.conf /etc/nginx/nginx.conf
COPY dist/packages/react-ui/ /usr/share/nginx/html/

ARG VERSION=unknown
ENV OPS_VERSION=$VERSION

# Set up entrypoint script
COPY docker-entrypoint.sh .
RUN chmod +x docker-entrypoint.sh
ENTRYPOINT ["./docker-entrypoint.sh"]

EXPOSE 80
