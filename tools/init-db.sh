#!/bin/bash
set -e

echo "[START] creating database for analytics and tables..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE analytics;
    CREATE DATABASE tables;
EOSQL

echo "[COMPLETE] creating database for analytics and tables ..."
