#!/usr/bin/env bash

# Script to create local symlinks for blocks so the engine can resolve them
# This is separate from global npm linking to avoid circular reference issues


LINKED_COUNT=0
FAILED_COUNT=0

echo "Creating local symlinks for engine module resolution..."

# Ensure @openops directory exists in node_modules
mkdir -p node_modules/@openops

# Debug: Show what blocks are available
echo "Available blocks in dist/packages/blocks:"
ls -la dist/packages/blocks/ | head -10

# Create symlinks for all built blocks
for block_dir in dist/packages/blocks/*/; do
    echo "Processing directory: $block_dir"
    
    if [ -f "$block_dir/package.json" ]; then
        echo "  Found package.json, parsing..."
        
        # Better error handling for package.json parsing
        package_name=""
        if package_name=$(grep '"name"' "$block_dir/package.json" | cut -d'"' -f4 2>/dev/null) && [ -n "$package_name" ]; then
            echo "  Package name: $package_name"
        else
            echo "✗ Failed to parse package name from: $block_dir/package.json"
            FAILED_COUNT=$((FAILED_COUNT + 1))
            continue
        fi
        
        # Skip framework package - it needs proper npm linking
        if [ "$package_name" = "@openops/blocks-framework" ]; then
            echo "⏭️  Skipping framework package (use npm link instead)"
            continue
        fi
        
        # Get absolute path
        abs_block_path=""
        if abs_block_path=$(realpath "$block_dir" 2>/dev/null) && [ -n "$abs_block_path" ]; then
            echo "  Absolute path: $abs_block_path"
        else
            echo "✗ Failed to get realpath for: $block_dir"
            FAILED_COUNT=$((FAILED_COUNT + 1))
            continue
        fi
        
        target_path="node_modules/$package_name"
        echo "  Target path: $target_path"
        
        # Remove existing symlink if it exists
        if rm -f "$target_path" 2>/dev/null; then
            echo "  Removed existing link"
        fi
        
        # Create new symlink with better error reporting
        if ln -sf "$abs_block_path" "$target_path" 2>/dev/null; then
            echo "✓ Symlinked: $package_name"
            LINKED_COUNT=$((LINKED_COUNT + 1))
            echo "  Current linked count: $LINKED_COUNT"
        else
            echo "✗ Failed to symlink: $package_name ($abs_block_path -> $target_path)"
            FAILED_COUNT=$((FAILED_COUNT + 1))
            echo "  Current failed count: $FAILED_COUNT"
        fi
    else
        echo "⚠️  No package.json found in: $block_dir"
    fi
    
    echo "  Completed processing: $block_dir"
    echo "  ---"
done

echo
echo "Local symlinking completed: $LINKED_COUNT successful, $FAILED_COUNT failed"

if [ $LINKED_COUNT -eq 0 ] && [ $FAILED_COUNT -gt 0 ]; then
    echo "❌ Error: No blocks were successfully linked"
    exit 1
elif [ $FAILED_COUNT -gt 0 ]; then
    echo "⚠️  Some blocks failed to link"
    exit 1
else
    echo "✅ All blocks are now accessible to the engine!"
    exit 0
fi 