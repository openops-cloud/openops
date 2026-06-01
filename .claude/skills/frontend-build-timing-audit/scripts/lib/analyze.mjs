// Shared analysis helpers for react-ui production builds.
//
// Public API:
//   findEntry(buildDir)           -> entry chunk filename (e.g. 'index-abc.js')
//   getStaticImports(buf)         -> [string] list of './chunk.js' siblings
//                                    statically imported at the top of buf
//   gz(buf)                       -> number (gzipped byte length, level 9)
//   br(buf)                       -> number (brotli byte length, quality 11)
//   analyzeBuild(dir, markers?)   -> AnalyzeResult (see shape below)
//
// AnalyzeResult shape:
//   {
//     entry: string,                  // entry chunk filename
//     entrySize: number,              // raw bytes
//     entryGzipped: number,
//     chunkCount: number,             // total .js chunks
//     staticImportCount: number,
//     staticImports: string[],        // sorted, deduped
//     critRaw, critGz, critBr: number, // entry + all static-dep chunks
//     totalRaw, totalGz: number,       // every .js chunk in the build
//     markers: [{ name, chunk, position, chunkSize, risk }]
//        // risk = 'safe' | 'danger' | 'lazy' | 'missing'
//   }

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';

export function findEntry(buildDir) {
  const assets = `${buildDir}/assets`;
  const f = readdirSync(assets).find((n) => /^index-[A-Za-z0-9_-]+\.js$/.test(n));
  if (!f) throw new Error(`No entry chunk (index-*.js) in ${assets}`);
  return f;
}

export function getStaticImports(buf) {
  const text = typeof buf === 'string' ? buf : buf.toString('utf8');
  // Accept both `import ... from "./x.js"` (named / default / namespace) and
  // bare side-effect `import "./x.js"`, single or double quoted. Rolldown
  // emits double-quoted today, but tolerate variation so this also works
  // against vendor-rolled chunks or future bundler changes.
  const m = [
    ...text.matchAll(
      /import\s*(?:(?:\*\s+as\s+\w+|\{[^}]*\}|\w+)\s*from\s*)?["'](\.\/[^"']+\.js)["']/g,
    ),
  ];
  return [...new Set(m.map((x) => x[1].replace(/^\.\//, '')))].sort();
}

export function gz(buf) {
  return gzipSync(buf, { level: 9 }).length;
}

export function br(buf) {
  return brotliCompressSync(buf, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
  }).length;
}

function classifyMarker(chunk, entry, staticImports) {
  if (chunk === entry) return 'safe';
  if (staticImports.includes(chunk)) return 'danger';
  return 'lazy';
}

export function analyzeBuild(buildDir, markers = []) {
  const assets = `${buildDir}/assets`;
  const files = readdirSync(assets).filter((f) => f.endsWith('.js'));
  const entry = findEntry(buildDir);
  const entryBuf = readFileSync(`${assets}/${entry}`);
  const staticImports = getStaticImports(entryBuf);

  let critRaw = 0,
    critGz = 0,
    critBr = 0;
  const critFiles = [entry, ...staticImports];
  for (const f of critFiles) {
    const p = `${assets}/${f}`;
    if (!existsSync(p)) continue;
    const b = readFileSync(p);
    critRaw += b.length;
    critGz += gz(b);
    critBr += br(b);
  }

  let totalRaw = 0,
    totalGz = 0;
  for (const f of files) {
    const b = readFileSync(`${assets}/${f}`);
    totalRaw += b.length;
    totalGz += gz(b);
  }

  const markerResults = [];
  for (const name of markers) {
    let found = false;
    for (const f of files) {
      const text = readFileSync(`${assets}/${f}`, 'utf8');
      const idx = text.indexOf(name);
      if (idx !== -1) {
        markerResults.push({
          name,
          chunk: f,
          position: idx,
          chunkSize: text.length,
          risk: classifyMarker(f, entry, staticImports),
        });
        found = true;
      }
    }
    if (!found) {
      markerResults.push({
        name,
        chunk: null,
        position: -1,
        chunkSize: 0,
        risk: 'missing',
      });
    }
  }

  return {
    entry,
    entrySize: entryBuf.length,
    entryGzipped: gz(entryBuf),
    chunkCount: files.length,
    staticImportCount: staticImports.length,
    staticImports,
    critRaw,
    critGz,
    critBr,
    totalRaw,
    totalGz,
    markers: markerResults,
  };
}
