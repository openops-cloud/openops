#!/usr/bin/env bash

if [[ -f /.dockerenv ]] || grep -q -i docker /proc/1/cgroup 2>/dev/null; then
    echo "🐳 Docker environment: Link all packages with npm link"
    find dist -name package.json -not -path '*/node_modules/*' -not -path '*/ui/*' | while read path; do dirname "$path"; done | xargs npm link --no-audit --no-fund
    exit 0
fi

if [[ "${NODE_ENV}" = "production" ]] || [[ -n "${DOCKER_ENV:-}" ]] || [[ -n "${CI:-}" ]]; then
    echo "🏭 Production/CI mode: Link all packages with npm link"
    find dist -name package.json -not -path '*/node_modules/*' -not -path '*/ui/*' | while read path; do dirname "$path"; done | xargs npm link --no-audit --no-fund
    exit 0
fi

echo "🛠️ Development mode: Using enhanced linking approach"

set -e

LINKED_COUNT=0
FAILED_COUNT=0

# Ensure @openops directory exists in node_modules
mkdir -p node_modules/@openops

# Define paths
FRAMEWORK_PATH="dist/packages/blocks/framework"
SHARED_PATH="dist/packages/shared"
COMMON_PATH="dist/packages/openops"
SERVER_SHARED_PATH="dist/packages/server/shared"

# Function to create symlink with error handling
create_symlink() {
    local package_name="$1"
    local source_path="$2"
    local target_path="node_modules/$package_name"

    if [[ ! -d "$source_path" ]] || [[ ! -f "$source_path/package.json" ]]; then
        echo "✗ Not found: $source_path"
        FAILED_COUNT=$((FAILED_COUNT + 1))
        return 1
    fi

    # Get absolute path
    local abs_source_path=""
    if command -v realpath >/dev/null 2>&1; then
        abs_source_path=$(realpath "$source_path" 2>/dev/null)
    elif command -v readlink >/dev/null 2>&1; then
        abs_source_path=$(readlink -f "$source_path" 2>/dev/null)
    else
        abs_source_path="$(cd "$source_path" && pwd)"
    fi

    if [[ -z "$abs_source_path" ]]; then
        echo "✗ Failed to resolve path: $source_path"
        FAILED_COUNT=$((FAILED_COUNT + 1))
        return 1
    fi

    rm -f "$target_path" 2>/dev/null

    if ln -sf "$abs_source_path" "$target_path" 2>/dev/null; then
        LINKED_COUNT=$((LINKED_COUNT + 1))
    else
        echo "✗ Failed to symlink: $package_name"
        FAILED_COUNT=$((FAILED_COUNT + 1))
        return 1
    fi
}

echo "Linking core packages..."
if [[ -f "$SHARED_PATH/package.json" ]]; then
    create_symlink "@openops/shared" "$SHARED_PATH" || exit 1
else
    echo "❌ Shared package not found. Run: npx nx build shared"
    exit 1
fi

if [[ -f "$COMMON_PATH/package.json" ]]; then
    create_symlink "@openops/common" "$COMMON_PATH" || exit 1
else
    echo "❌ Common package not found. Run: npx nx build openops"
    exit 1
fi

if [[ -f "$SERVER_SHARED_PATH/package.json" ]]; then
    create_symlink "@openops/server-shared" "$SERVER_SHARED_PATH" || exit 1
else
    echo "❌ Server-shared not found. Run: npx nx build server-shared"
    exit 1
fi

if [[ -f "$FRAMEWORK_PATH/package.json" ]]; then
    create_symlink "@openops/blocks-framework" "$FRAMEWORK_PATH" || exit 1
else
    echo "❌ Framework not found. Run: npx nx build blocks-framework"
    exit 1
fi

echo "Linking block packages..."

# Create symlinks for all built blocks (excluding framework which we already handled)
for block_dir in dist/packages/blocks/*/; do
    if [[ -f "$block_dir/package.json" ]]; then
        package_name=""
        if package_name=$(grep '"name"' "$block_dir/package.json" | cut -d'"' -f4 2>/dev/null) && [[ -n "$package_name" ]]; then
            if [[ "$package_name" != "@openops/blocks-framework" ]]; then
                create_symlink "$package_name" "$block_dir"
            fi
        fi
    fi
done

echo "✅ Linked $LINKED_COUNT packages ($FAILED_COUNT failed)"

if [[ $LINKED_COUNT -eq 0 ]] && [[ $FAILED_COUNT -gt 0 ]]; then
    exit 1
fi
