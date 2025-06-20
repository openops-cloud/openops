#!/usr/bin/env bash

# Check if we're in production (Docker) environment
IS_PRODUCTION=false
if [ -f /.dockerenv ] || grep -q -i docker /proc/1/cgroup 2>/dev/null || [ -n "${DOCKER_ENV:-}" ]; then
    IS_PRODUCTION=true
fi

# PRODUCTION MODE: Use original simple approach (same as main branch)
if [ "$IS_PRODUCTION" = true ]; then
    echo "🐳 Production mode: Using original linking approach"
    find dist -name package.json -not -path '*/node_modules/*' -not -path '*/ui/*' -printf '%h\n' | xargs npm link --no-audit --no-fund
    exit 0
fi

# DEVELOPMENT MODE: Use enhanced approach with better error handling
echo "🛠️  Development mode: Using enhanced linking approach"

# Enhanced package linking script with selective linking support
# Usage: ./link-packages-to-root.sh [specific-block-names...]
# If no arguments provided, links all packages

set -e

# Filter out nx-specific arguments that might be passed through
SPECIFIC_BLOCKS=()
for arg in "$@"; do
    # Skip nx flags and options
    if [[ "$arg" == --* ]] || [[ "$arg" == -* ]]; then
        continue
    fi
    # Skip empty arguments
    if [[ -n "$arg" ]]; then
        SPECIFIC_BLOCKS+=("$arg")
    fi
done

LINKED_COUNT=0
FAILED_COUNT=0

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not available"
    exit 1
fi

link_package() {
    local pkg_path="$1"
    local pkg_name=$(basename "$pkg_path")
    
    if [ ! -d "$pkg_path" ]; then
        echo "✗ Directory not found: $pkg_path"
        ((FAILED_COUNT++))
        return 1
    fi
    
    if [ ! -f "$pkg_path/package.json" ]; then
        echo "✗ No package.json found: $pkg_path"
        ((FAILED_COUNT++))
        return 1
    fi
    
    if cd "$pkg_path" 2>/dev/null; then
        # Try to link with more verbose error handling
        if npm link --no-audit --no-fund --silent 2>/dev/null; then
            echo "✓ Linked: $pkg_name"
            ((LINKED_COUNT++))
        else
            echo "✗ Failed to link: $pkg_name"
            ((FAILED_COUNT++))
        fi
        cd - >/dev/null
    else
        echo "✗ Cannot access: $pkg_path"
        ((FAILED_COUNT++))
    fi
}

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "Warning: dist directory not found. Skipping package linking."
    exit 0
fi

# Use find with better error handling and check if any packages exist
PACKAGE_COUNT=0
PACKAGES_FOUND=()
while IFS= read -r -d '' pkg_json; do
    PACKAGE_COUNT=$((PACKAGE_COUNT + 1))
    PACKAGES_FOUND+=("$pkg_json")
done < <(find dist -name package.json -type f -not -path '*/node_modules/*' -not -path '*/ui/*' -print0 2>/dev/null || true)

echo "Found $PACKAGE_COUNT packages to link"

if [ ${#SPECIFIC_BLOCKS[@]} -eq 0 ]; then
    # Link all packages (original behavior)
    echo "Linking all packages..."
    
    if [ $PACKAGE_COUNT -eq 0 ]; then
        echo "Warning: No packages found in dist directory"
        exit 0
    fi
    
    for pkg_json in "${PACKAGES_FOUND[@]}"; do
        pkg_dir=$(dirname "$pkg_json")
        echo "Processing package: $(basename "$pkg_dir")"
        
        # Add error handling for individual package processing
        if ! link_package "$pkg_dir"; then
            echo "Warning: Failed to process package: $pkg_dir"
            # Continue processing other packages instead of exiting
        fi
    done
else
    # Link only specific blocks
    echo "Linking specific blocks: ${SPECIFIC_BLOCKS[*]}"
    
    for block_name in "${SPECIFIC_BLOCKS[@]}"; do
        # Remove 'blocks-' prefix if present
        clean_name=${block_name#blocks-}
        
        # Look for the block in dist
        block_path="dist/packages/blocks/$clean_name"
        
        if [ -d "$block_path" ] && [ -f "$block_path/package.json" ]; then
            link_package "$block_path"
        else
            echo "✗ Block not found: $clean_name (looked in $block_path)"
            ((FAILED_COUNT++))
        fi
    done
fi

echo
echo "Linking completed: $LINKED_COUNT successful, $FAILED_COUNT failed"

if [ $LINKED_COUNT -eq 0 ] && [ $FAILED_COUNT -gt 0 ]; then
    echo "Error: No packages were successfully linked"
    exit 1
elif [ $FAILED_COUNT -gt 0 ]; then
    echo "Warning: Some packages failed to link, but continuing..."
    exit 0
else
    echo "All packages linked successfully"
    exit 0
fi
