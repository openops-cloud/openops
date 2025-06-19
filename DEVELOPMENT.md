# OpenOps Development Guide

## Improved Hot Reload & Build System

This document explains the enhanced development workflow with dramatically improved build times and hot reload performance.

## Key Improvements

### ⚡ Incremental Block Building

- **Before**: All ~40 blocks rebuilt on every change (1-2 minutes)
- **After**: Only changed blocks are rebuilt (5-15 seconds)

### 🎯 Smart Webpack Watching

- **Before**: Entire `/packages/blocks/` folder watched, triggering both servers
- **After**: Individual block directories watched with coordinated builds

### 🔄 Build Coordination

- **Before**: Both API and Engine servers rebuild blocks independently
- **After**: API server handles builds, Engine server just restarts

### 📦 Selective Package Linking

- **Before**: All blocks re-linked after every build
- **After**: Only changed blocks are linked

## Development Workflow

### Quick Start

```bash
# Fast development startup (only builds changed blocks)
npm run dev:fast

# Regular development (builds all blocks first)
npm run dev
```

### Manual Block Operations

```bash
# Build only changed blocks
npm run build:blocks:changed

# Build all blocks (full rebuild)
npm run build:blocks

# Link all blocks for global access
npm run link:blocks

# Link blocks for engine module resolution
npm run link:blocks:engine

# Link framework and shared packages for API server
npm run link:framework

# Link specific blocks
./tools/link-packages-to-root.sh block-name1 block-name2
```

### Development Tips

1. **First Time Setup**: Run `npm run dev` (builds all blocks)

2. **Daily Development**: Use `npm run dev:fast` (incremental builds)

3. **After Git Pull**: Run `npm run build:blocks:changed` if blocks were modified

4. **Clean State**: Delete `dist/` folder and run `npm run build:blocks` for full rebuild

## How It Works

### Intelligent Change Detection

The system tracks modification times of block source files and only rebuilds what has changed:

```
Block file change → Smart webpack detects specific block →
API server builds only that block → Both servers restart
```

### Build Cache

- Tracks last modification time of each block
- Compares with cached build times
- Skips unchanged blocks automatically

### Coordinated Webpack Builds

- **API Server**: Handles block building and linking
- **Engine Server**: Only watches for changes, lets API server build

## Performance Comparison

| Operation           | Before       | After        | Improvement      |
| ------------------- | ------------ | ------------ | ---------------- |
| Single block change | 60-120s      | 5-15s        | **8x faster**    |
| Server restart      | Both rebuild | One rebuilds | **2x less work** |
| Package linking     | All blocks   | Changed only | **10x faster**   |

## Troubleshooting

### Blocks Not Updating

1. Check if block was actually built: `ls dist/packages/blocks/[block-name]`
2. Verify linking: `npm ls -g | grep @openops/blocks-[block-name]`
3. Clear cache: `rm -rf dist/` and rebuild

### Build Errors

- Individual block build errors won't crash the entire system
- Check webpack console for specific block issues
- Use `npm run build:blocks [block-name]` to test specific blocks

### Runtime Module Loading Issues

If you see "Cannot find module '@openops/block-xxx'" errors:

1. **Check local symlinks**: `ls -la node_modules/@openops/block-*`
2. **Rebuild and relink**: `npm run build:blocks:changed && npm run link:blocks:engine`
3. **Manual fix**: Run the engine linking script:
   ```bash
   ./tools/link-blocks-for-engine.sh
   ```

If you see "Cannot find module '@openops/blocks-framework'" errors:

1. **Check framework link**: `ls -la node_modules/@openops/blocks-framework`
2. **Rebuild and relink framework**: `npm run link:framework`
3. **Manual fix**: Run the framework linking script:
   ```bash
   ./tools/link-framework.sh
   ```

**How it works**:

- **Engine blocks**: Use symlinks in `node_modules` for dynamic imports
- **Framework**: Uses separate symlinks for API server direct imports
- **Dependencies**: Framework script also links `@openops/shared` dependency
- **No circular references**: All linking strategies avoid the ELOOP errors

### Slow Performance Still?

1. Ensure you're using the new system: Look for "Building X changed blocks" messages
2. Check if you have many blocks with changes: `git status packages/blocks/`
3. Consider using `pnpm` for even faster package operations (see PNPM Migration section)

## PNPM Migration (Optional)

The system now supports better package management. To migrate to pnpm:

```bash
# Install pnpm
npm install -g pnpm

# Remove npm files
rm package-lock.json

# Install with pnpm
pnpm install

# Update development scripts (modify package.json to use pnpm instead of npm)
```

**Benefits of pnpm**:

- Faster installs and linking
- Better disk space usage
- More reliable symlink handling

**Considerations**:

- Test thoroughly with `loadBlockOrThrow` dynamic imports
- Ensure all CI/CD systems support pnpm
- Team needs to switch to pnpm commands

## Next Steps

The current improvements should dramatically speed up development. If you're still experiencing issues:

1. **Report specific performance bottlenecks** with timing details
2. **Consider pnpm migration** for additional speed gains
3. **Optimize individual block builds** by reviewing dependencies

---

_Performance improvements: ~8x faster hot reload, ~2x less duplicate work, ~10x faster linking_
