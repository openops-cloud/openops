#!/usr/bin/env bash

# Script to create local symlinks for all blocks and framework so the engine and API server can resolve them
# This handles both regular blocks and the framework with its dependencies

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
    
    # Get absolute path
    local abs_source_path=""
    if abs_source_path=$(realpath "$source_path" 2>/dev/null) && [ -n "$abs_source_path" ]; then
        echo "  Source: $abs_source_path"
    else
        echo "✗ Failed to get realpath for: $source_path"
        ((FAILED_COUNT++))
        return 1
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
        ((FAILED_COUNT++))
        return 1
    fi
    
    echo "  ---"
}

# Step 1: Link shared package first (framework dependency)
if [ -f "$SHARED_PATH/package.json" ]; then
    create_symlink "@openops/shared" "$SHARED_PATH"
else
    echo "⚠️  Shared package not found at $SHARED_PATH"
    echo "Run: npx nx build shared"
fi

# Step 2: Link server-shared package (framework dependency)
if [ -f "$SERVER_SHARED_PATH/package.json" ]; then
    create_symlink "@openops/server-shared" "$SERVER_SHARED_PATH"
else
    echo "⚠️  Server-shared package not found at $SERVER_SHARED_PATH"
    echo "Run: npx nx build server-shared"
fi

# Step 3: Link framework package
if [ -f "$FRAMEWORK_PATH/package.json" ]; then
    create_symlink "@openops/blocks-framework" "$FRAMEWORK_PATH"
else
    echo "⚠️  Framework package not found at $FRAMEWORK_PATH"
    echo "Run: npx nx build blocks-framework"
fi

# Step 4: Link all other blocks
echo "Linking all other blocks..."

# Debug: Show what blocks are available
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
        echo "⚠️  No package.json found in: $block_dir"
    fi
done

echo
echo "Symlinking completed: $LINKED_COUNT successful, $FAILED_COUNT failed"

# Verification
if [ -d "node_modules/@openops/blocks-framework" ] && [ -f "node_modules/@openops/blocks-framework/src/index.js" ] && [ -d "node_modules/@openops/shared" ] && [ -d "node_modules/@openops/server-shared" ]; then
    echo "✓ Verification: Framework and dependencies are accessible"
else
    echo "⚠️  Verification: Some framework packages may not be accessible"
fi

if [ $LINKED_COUNT -eq 0 ] && [ $FAILED_COUNT -gt 0 ]; then
    echo "❌ Error: No packages were successfully linked"
    exit 1
elif [ $FAILED_COUNT -gt 0 ]; then
    echo "⚠️  Some packages failed to link, but continuing..."
    exit 0
else
    echo "✅ All packages are now accessible to the engine and API server!"
    exit 0
fi 