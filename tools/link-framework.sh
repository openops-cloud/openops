#!/usr/bin/env bash

# Script to properly link the blocks-framework package
# Framework needs special handling because API server imports it directly

set -e

echo "Linking @openops/blocks-framework and dependencies..."

FRAMEWORK_PATH="dist/packages/blocks/framework"
SHARED_PATH="dist/packages/shared"
SERVER_SHARED_PATH="dist/packages/server/shared"

# Check if framework is built
if [ ! -f "$FRAMEWORK_PATH/package.json" ]; then
    echo "❌ Framework not found at $FRAMEWORK_PATH"
    echo "Run: npx nx build blocks-framework"
    exit 1
fi

# Check if framework has built files
if [ ! -f "$FRAMEWORK_PATH/src/index.js" ]; then
    echo "❌ Framework not built properly - missing index.js"
    echo "Run: npx nx build blocks-framework"
    exit 1
fi

# Check if shared package is built
if [ ! -f "$SHARED_PATH/package.json" ]; then
    echo "❌ Shared package not found at $SHARED_PATH"
    echo "Run: npx nx build shared"
    exit 1
fi

# Check if server-shared package is built
if [ ! -f "$SERVER_SHARED_PATH/package.json" ]; then
    echo "❌ Server-shared package not found at $SERVER_SHARED_PATH"
    echo "Run: npx nx build server-shared"
    exit 1
fi

# Ensure @openops directory exists in node_modules
mkdir -p node_modules/@openops

# Remove any existing links/symlinks
rm -f "node_modules/@openops/blocks-framework"
rm -f "node_modules/@openops/shared"
rm -f "node_modules/@openops/server-shared"

# Link shared package first (framework dependency)
echo "🔗 Linking shared package..."
abs_shared_path=$(realpath "$SHARED_PATH")
if ln -sf "$abs_shared_path" "node_modules/@openops/shared" 2>/dev/null; then
    echo "✅ Shared package symlink created"
else
    echo "❌ Failed to create shared package symlink"
    exit 1
fi

# Link server-shared package (for build scripts)
echo "🔗 Linking server-shared package..."
abs_server_shared_path=$(realpath "$SERVER_SHARED_PATH")
if ln -sf "$abs_server_shared_path" "node_modules/@openops/server-shared" 2>/dev/null; then
    echo "✅ Server-shared package symlink created"
else
    echo "❌ Failed to create server-shared package symlink"
    exit 1
fi

# Link framework package
echo "🔗 Linking framework package..."
abs_framework_path=$(realpath "$FRAMEWORK_PATH")
if ln -sf "$abs_framework_path" "node_modules/@openops/blocks-framework" 2>/dev/null; then
    echo "✅ Framework symlink created"
else
    echo "❌ Failed to create framework symlink"
    exit 1
fi

# Verify the links work
if [ -d "node_modules/@openops/blocks-framework" ] && [ -f "node_modules/@openops/blocks-framework/src/index.js" ] && [ -d "node_modules/@openops/shared" ] && [ -d "node_modules/@openops/server-shared" ]; then
    echo "✓ Verification: All packages are accessible"
    echo "🎉 Framework and all dependencies successfully linked!"
    exit 0
else
    echo "❌ Verification failed: One or more packages not accessible"
    exit 1
fi 