const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const os = require('os');
const Fuse = require('fuse.js');

let filesIndex = [];
let fuse;

const CACHE_PATH = path.join(__dirname, '../data/files.json');
// ✅ Only scan these specific folders
const ROOT_PATHS = [
  path.join(os.homedir(), 'Downloads'),
  path.join(os.homedir(), 'Desktop'),
  path.join(os.homedir(), 'Documents'),
  path.join(os.homedir(), 'Music'),
  path.join(os.homedir(), 'Pictures'),
  path.join(os.homedir(), 'Videos'),
];

// ─────────────────────────────────────────────
// 🚫 Directories to SKIP entirely during scan
// ─────────────────────────────────────────────
const EXCLUDED_DIRS = new Set([
  // Dev junk
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  'dist',
  'build',
  '.next',
  '.nuxt',
  '__pycache__',
  '.venv',
  'venv',
  '.tox',

  // Windows system dirs
  'Windows',
  'System32',
  'SysWOW64',
  '$Recycle.Bin',
  '$WINDOWS.~BT',
  'WinSxS',
  'Prefetch',

  // AppData noise
  'Temp',
  'temp',
  'tmp',
  'Cache',
  'cache',
  'CrashDumps',
  'Crashpad',

  // Browser internals
  'GPUCache',
  'Code Cache',
  'DawnCache',
  'ShaderCache',
]);

// ─────────────────────────────────────────────
// 🚫 File extensions to SKIP (noise / system files)
// ─────────────────────────────────────────────
const EXCLUDED_EXTENSIONS = new Set([
  '.tmp', '.temp', '.log', '.bak',
  '.sys', '.dll', '.drv', '.ocx',
  '.ini', '.inf', '.dat', '.db', '.db-shm', '.db-wal',
  '.lnk',    // Windows shortcuts
  '.ico', '.cur', '.ani',
  '.pdb', '.ilk', '.obj', '.lib', '.exp',
  '.pyc', '.pyo', '.pyd',
  '.class',
  '.lock',
  '.map',    // source maps
  '.cache',
]);

// ─────────────────────────────────────────────
// 🔍 Iterative directory scan (queue-based, no stack overflow)
// ─────────────────────────────────────────────
function scanDirectory(rootDir) {
  const queue = [rootDir]; // use a queue instead of call stack

  while (queue.length > 0) {
    const dirPath = queue.pop();

    let entries;
    try {
      entries = fs.readdirSync(dirPath);
    } catch {
      continue; // permission denied — skip silently
    }

    for (const file of entries) {
      // Skip junk dirs by name — before stat (fast)
      if (EXCLUDED_DIRS.has(file)) continue;

      const fullPath = path.join(dirPath, file);
      try {
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          // ✅ Index the folder itself
          filesIndex.push({ name: file, path: fullPath, type: 'folder' });
          // Then recurse into it
          queue.push(fullPath);
        } else {
          // Skip noise file extensions
          const ext = path.extname(file).toLowerCase();
          if (EXCLUDED_EXTENSIONS.has(ext)) continue;

          filesIndex.push({ name: file, path: fullPath, type: 'file' });
        }
      } catch {
        continue;
      }
    }
  }
}

// ─────────────────────────────────────────────
// 🧱 Build index — scans all configured root paths
// ─────────────────────────────────────────────
function buildIndex(rootPaths = ROOT_PATHS) {
  console.log(`Building index from ${rootPaths.length} folders...`);
  filesIndex = [];
  for (const rootPath of rootPaths) {
    console.log(`  Scanning: ${rootPath}`);
    scanDirectory(rootPath);
  }
  saveCache();
  initFuse();
  console.log(`Index built: ${filesIndex.length} files`);
}

// ─────────────────────────────────────────────
// 💾 Cache helpers
// ─────────────────────────────────────────────
function saveCache() {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(filesIndex));
    console.log('Cache saved!');
  } catch (err) {
    console.error('Error saving cache:', err);
  }
}

async function loadCache() {
  try {
    await fsPromises.access(CACHE_PATH);
    const data = await fsPromises.readFile(CACHE_PATH, 'utf-8');
    filesIndex = JSON.parse(data);
    initFuse();
    console.log(`Cache loaded: ${filesIndex.length} files`);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('Error loading cache:', err);
    } else {
      console.log('No cache found — will build on first run.');
    }
  }
}

// ─────────────────────────────────────────────
// 🔎 Fuse.js init
// ─────────────────────────────────────────────
function initFuse() {
  fuse = new Fuse(filesIndex, {
    keys: ['name', 'path'],
    threshold: 0.3,       // tighter = less noise in fuzzy results
    includeScore: true,
  });
}

// ─────────────────────────────────────────────
// 📊 Relevance ranking
//   Primary:   name match tier  (exact=0, starts-with=1, contains=2)
//   Secondary: type             (folder=0, file=1)  ← folders win ties
//   Tertiary:  name length      (shorter = more specific)
// ─────────────────────────────────────────────
function rankResults(matches, q) {
  return matches
    .map(file => {
      const name = file.name.toLowerCase();
      let nameTier;
      if (name === q)              nameTier = 0; // exact
      else if (name.startsWith(q)) nameTier = 1; // starts-with
      else                         nameTier = 2; // contains

      const typeTier = file.type === 'folder' ? 0 : 1; // folders first
      return { file, nameTier, typeTier };
    })
    .sort((a, b) => {
      if (a.nameTier !== b.nameTier) return a.nameTier - b.nameTier; // match quality
      if (a.typeTier !== b.typeTier) return a.typeTier - b.typeTier; // folders before files
      return a.file.name.length - b.file.name.length;                // shorter name wins
    })
    .map(r => r.file);
}

// ─────────────────────────────────────────────
// 🔍 Search
// ─────────────────────────────────────────────
function searchFiles(query) {
  if (!query || !query.trim()) return [];

  const q = query.toLowerCase().trim();

  // 1. Substring match (fast, ranked)
  const matches = filesIndex.filter(file =>
    file.name.toLowerCase().includes(q)
  );

  if (matches.length > 0) {
    return rankResults(matches, q);
  }

  // 2. Fuzzy fallback (Fuse.js) — only when substring finds nothing
  if (!fuse) return [];
  return fuse.search(query).map(r => r.item);
}

module.exports = {
  buildIndex,
  searchFiles,
  loadCache,
  ROOT_PATHS,
};