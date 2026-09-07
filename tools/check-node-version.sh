#!/bin/bash
# Verifies that the Node version in .nvmrc matches the node base images in every
# Dockerfile. Dependabot updates the Dockerfiles but never touches .nvmrc, so
# without this check the two drift apart silently.
#
# Usage:
#   tools/check-node-version.sh          # verify, exit 1 on mismatch
#   tools/check-node-version.sh --fix    # rewrite .nvmrc from the Dockerfiles
set -euo pipefail

cd "$(dirname "$0")/.."

DOCKERFILES=(Dockerfile worker.Dockerfile)
NVMRC_VERSION="$(tr -d 'v[:space:]' < .nvmrc)"

# Collect every `FROM node:<version>-<variant>` version across all Dockerfiles.
declare -a FOUND=()
for file in "${DOCKERFILES[@]}"; do
  while IFS= read -r version; do
    FOUND+=("$file:$version")
  done < <(sed -nE 's/^FROM node:([0-9]+\.[0-9]+\.[0-9]+)[-[:space:]].*/\1/p' "$file")
done

if [ ${#FOUND[@]} -eq 0 ]; then
  echo "error: no pinned 'FROM node:<x.y.z>-<variant>' found in ${DOCKERFILES[*]}" >&2
  exit 1
fi

# Every Dockerfile stage must agree before .nvmrc can be compared against them.
DOCKER_VERSION="${FOUND[0]#*:}"
MISMATCHED=0
for entry in "${FOUND[@]}"; do
  [ "${entry#*:}" = "$DOCKER_VERSION" ] || MISMATCHED=1
done

if [ "$MISMATCHED" -eq 1 ]; then
  echo "error: Dockerfiles disagree on the Node version:" >&2
  printf '  %s\n' "${FOUND[@]}" >&2
  echo "Pin every stage to the same version, then re-run this check." >&2
  exit 1
fi

if [ "$NVMRC_VERSION" = "$DOCKER_VERSION" ]; then
  echo "Node version is in sync: $DOCKER_VERSION (.nvmrc, ${DOCKERFILES[*]})"
  exit 0
fi

if [ "${1:-}" = "--fix" ]; then
  echo "v$DOCKER_VERSION" > .nvmrc
  echo "Updated .nvmrc from $NVMRC_VERSION to $DOCKER_VERSION to match ${DOCKERFILES[*]}"
  exit 0
fi

echo "error: .nvmrc ($NVMRC_VERSION) does not match the Dockerfile node images ($DOCKER_VERSION)." >&2
printf '  %s\n' "${FOUND[@]}" >&2
echo "Run 'tools/check-node-version.sh --fix' to sync .nvmrc." >&2
exit 1
