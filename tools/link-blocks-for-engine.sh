#!/usr/bin/env bash

# Script to create local symlinks for blocks so the engine can resolve them
# This is separate from global npm linking to avoid circular reference issues

set -e

LINKED_COUNT=0
FAILED_COUNT=0

echo "Creating local symlinks for engine module resolution..."

# Ensure @openops directory exists in node_modules
mkdir -p node_modules/@openops

# Create symlinks for all built blocks
for block_dir in dist/packages/blocks/*/; do
    if [ -f "$block_dir/package.json" ]; then
        package_name=$(grep '"name"' "$block_dir/package.json" | cut -d'"' -f4)
        
        # Skip framework package - it needs proper npm linking
        if [ "$package_name" = "@openops/blocks-framework" ]; then
            echo "⏭️  Skipping framework package (use npm link instead)"
            continue
        fi
        
        if [ -n "$package_name" ]; then
            abs_block_path=$(realpath "$block_dir")
            target_path="node_modules/$package_name"
            
            # Remove existing symlink if it exists
            rm -f "$target_path"
            
            # Create new symlink
            if ln -sf "$abs_block_path" "$target_path" 2>/dev/null; then
                echo "✓ Symlinked: $package_name"
                ((LINKED_COUNT++))
            else
                echo "✗ Failed to symlink: $package_name"
                ((FAILED_COUNT++))
            fi
        else
            echo "✗ No package name found in: $block_dir"
            ((FAILED_COUNT++))
        fi
    fi
done

echo
echo "Local symlinking completed: $LINKED_COUNT successful, $FAILED_COUNT failed"

if [ $FAILED_COUNT -eq 0 ]; then
    echo "✅ All blocks are now accessible to the engine!"
    exit 0
else
    echo "⚠️  Some blocks failed to link"
    exit 1
fi 