#!/usr/bin/env bash

if [ -f /.dockerenv ] || grep -q -i docker /proc/1/cgroup 2>/dev/null; then
    echo "🐳 Docker environment: Link all packages with npm link"
    find dist -name package.json -not -path '*/node_modules/*' -not -path '*/ui/*' -printf '%h\n' | xargs npm link --no-audit --no-fund
    exit 0
fi

if [ "${NODE_ENV}" = "production" ] || [ -n "${DOCKER_ENV:-}" ]; then
    echo "🏭 Production mode: Link all packages with npm link"
    find dist -name package.json -not -path '*/node_modules/*' -not -path '*/ui/*' -printf '%h\n' | xargs npm link --no-audit --no-fund
    exit 0
fi

echo "🛠️ Development mode: Using enhanced linking approach"

set -e

LINKED_COUNT=0
FAILED_COUNT=0

echo "Creating local symlinks for engine and API server module resolution..."

# Ensure @openops directory exists in node_modules
mkdir -p node_modules/@openops

# Define paths
FRAMEWORK_PATH="dist/packages/blocks/framework"
SHARED_PATH="dist/packages/shared"
SERVER_SHARED_PATH="dist/packages/server/shared"
ENTERPRISE_API_PATH="dist/packages/ee/enterprise-api"

# Function to create symlink with error handling
create_symlink() {
    local package_name="$1"
    local source_path="$2"
    local target_path="node_modules/$package_name"

    echo "Processing: $package_name"

    if [ ! -d "$source_path" ]; then
        echo "✗ Directory not found: $source_path"
        ((FAILED_COUNT++))
        return 1
    fi

    if [ ! -f "$source_path/package.json" ]; then
        echo "✗ No package.json found: $source_path"
        ((FAILED_COUNT++))
        return 1
    fi

    # Get absolute path - handle case where realpath might not be available
    local abs_source_path=""
    if command -v realpath >/dev/null 2>&1; then
        if abs_source_path=$(realpath "$source_path" 2>/dev/null) && [ -n "$abs_source_path" ]; then
            echo "  Source: $abs_source_path"
        else
            echo "✗ Failed to get realpath for: $source_path"
            ((FAILED_COUNT++))
            return 1
        fi
    else
        # Fallback: use readlink -f or construct absolute path
        if command -v readlink >/dev/null 2>&1; then
            abs_source_path=$(readlink -f "$source_path" 2>/dev/null)
        else
            # Last resort: construct absolute path manually
            abs_source_path="$(cd "$source_path" && pwd)"
        fi

        if [ -n "$abs_source_path" ]; then
            echo "  Source: $abs_source_path"
        else
            echo "✗ Failed to get absolute path for: $source_path"
            ((FAILED_COUNT++))
            return 1
        fi
    fi

    echo "  Target: $target_path"

    # Remove existing symlink if it exists
    if rm -f "$target_path" 2>/dev/null; then
        echo "  Removed existing link"
    fi

    # Create new symlink
    if ln -sf "$abs_source_path" "$target_path" 2>/dev/null; then
        echo "✓ Symlinked: $package_name"
        ((LINKED_COUNT++))
    else
        echo "✗ Failed to symlink: $package_name"
        echo "  Command: ln -sf '$abs_source_path' '$target_path'"
        ((FAILED_COUNT++))
        return 1
    fi

    echo "  ---"
}

echo "Step 1: Linking shared package..."
if [ -f "$SHARED_PATH/package.json" ]; then
    if ! create_symlink "@openops/shared" "$SHARED_PATH"; then
        echo "❌ Failed to link shared package"
        exit 1
    fi
else
    echo "⚠️  Shared package not found at $SHARED_PATH"
    echo "Run: npx nx build shared"
    exit 1
fi

echo "Step 2: Linking server-shared package..."
if [ -f "$SERVER_SHARED_PATH/package.json" ]; then
    if ! create_symlink "@openops/server-shared" "$SERVER_SHARED_PATH"; then
        echo "❌ Failed to link server-shared package"
        exit 1
    fi
else
    echo "⚠️ Server-shared package not found at $SERVER_SHARED_PATH"
    echo "Run: npx nx build server-shared"
    exit 1
fi

echo "Step 3: Linking framework package..."
if [ -f "$FRAMEWORK_PATH/package.json" ]; then
    if ! create_symlink "@openops/blocks-framework" "$FRAMEWORK_PATH"; then
        echo "❌ Failed to link framework package"
        exit 1
    fi
else
    echo "⚠️ Framework package not found at $FRAMEWORK_PATH"
    echo "Run: npx nx build blocks-framework"
    exit 1
fi

echo "Step 4: Linking enterprise package..."
if [ -f "$ENTERPRISE_API_PATH/package.json" ]; then
    if ! create_symlink "@openops/enterprise-api" "$ENTERPRISE_API_PATH"; then
        echo "⚠️ Failed to link enterprise-api package"
    fi
else
    echo "⚠️ Enterprise package not found at $ENTERPRISE_API_PATH"
fi

echo "Step 5: Linking all other blocks..."

echo "Available blocks in dist/packages/blocks:"
ls -la dist/packages/blocks/ | head -10

# Create symlinks for all built blocks (excluding framework which we already handled)
for block_dir in dist/packages/blocks/*/; do
    if [ -f "$block_dir/package.json" ]; then
        # Parse package name
        package_name=""
        if package_name=$(grep '"name"' "$block_dir/package.json" | cut -d'"' -f4 2>/dev/null) && [ -n "$package_name" ]; then
            # Skip framework package - we already handled it
            if [ "$package_name" != "@openops/blocks-framework" ]; then
                create_symlink "$package_name" "$block_dir"
            fi
        else
            echo "✗ Failed to parse package name from: $block_dir/package.json"
            ((FAILED_COUNT++))
        fi
    else
        echo "⚠️ No package.json found in: $block_dir"
    fi
done

echo
echo "Symlinking completed: $LINKED_COUNT successful, $FAILED_COUNT failed"

if [ -d "node_modules/@openops/blocks-framework" ] && [ -f "node_modules/@openops/blocks-framework/src/index.js" ] && [ -d "node_modules/@openops/shared" ] && [ -d "node_modules/@openops/server-shared" ]; then
    echo "✓ Verification: Framework and dependencies are accessible"
else
    echo "⚠️ Verification: Some framework packages may not be accessible"
    echo "  blocks-framework exists: $([ -d "node_modules/@openops/blocks-framework" ] && echo "YES" || echo "NO")"
    echo "  blocks-framework/src/index.js exists: $([ -f "node_modules/@openops/blocks-framework/src/index.js" ] && echo "YES" || echo "NO")"
    echo "  shared exists: $([ -d "node_modules/@openops/shared" ] && echo "YES" || echo "NO")"
    echo "  server-shared exists: $([ -d "node_modules/@openops/server-shared" ] && echo "YES" || echo "NO")"
fi

if [ $LINKED_COUNT -eq 0 ] && [ $FAILED_COUNT -gt 0 ]; then
    echo "❌ Error: No packages were successfully linked"
    exit 1
elif [ $FAILED_COUNT -gt 0 ]; then
    echo "⚠️ Some packages failed to link, but continuing..."
    exit 0
else
    echo "✅ All packages are now accessible to the engine and API server!"
    exit 0
fi
