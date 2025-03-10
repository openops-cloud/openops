#!/usr/bin/env bash

find dist -name package.json -not -path '*/node_modules/*' -not -path '*/ui/*' -printf '%h\n' | xargs npm link --no-audit --no-fund
