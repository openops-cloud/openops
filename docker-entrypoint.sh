#!/bin/sh

export NGINX_BODY_LIMIT="${OPS_BODY_LIMIT_MB:-10}m"

# Generate nginx config from template
envsubst < /etc/nginx/nginx.template.conf > /etc/nginx/nginx.conf

# Start Nginx server
nginx -g "daemon off;" &

# Start backend server
node --enable-source-maps dist/packages/server/api/main.js
