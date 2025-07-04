#!/bin/sh

if [ -n "$OPS_FASTIFY_BODY_LIMIT_MB" ]; then
  export NGINX_BODY_LIMIT="${OPS_FASTIFY_BODY_LIMIT_MB}m"
else
  export NGINX_BODY_LIMIT="10m"  # Default fallback
fi

# Generate nginx config from template
envsubst < /etc/nginx/nginx.template.conf > /etc/nginx/nginx.conf

# Start Nginx server
nginx -g "daemon off;" &

# Start backend server
node --enable-source-maps dist/packages/server/api/main.js
