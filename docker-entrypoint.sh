#!/bin/sh

export NGINX_CLIENT_MAX_BODY_SIZE="${OPS_REQUEST_BODY_LIMIT:-10}m"

# Generate nginx config from template
envsubst < /etc/nginx/nginx.template.conf > /etc/nginx/nginx.conf

# Start Nginx server
nginx -g "daemon off;" &

# Start backend server
node --enable-source-maps dist/packages/server/api/main.js
