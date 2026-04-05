const fs = require('fs');
const path = require('path');
const Fuse = require('fuse.js');

let filesIndex = [];
let fuse;

const CACHE_PATH = path.join(__dirname, '../data/files.json');

function initFuse() {
  fuse = new Fuse(filesIndex, {
    keys: ['name', 'path'],
    threshold: 0.4, // lower = stricter, higher = more fuzzy
  });
}

// 🔍 Scan directory
function scanDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const fullPath = path.join(dirPath, file);

    try {
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else {
        filesIndex.push({
          name: file,
          path: fullPath,
        });
      }
    } catch {
      continue;
    }
  }
}

// 🧱 Build index
function buildIndex(rootPath) {
  filesIndex = [];
  scanDirectory(rootPath);
  saveCache();
  initFuse(); // ✅ important
}

// 💾 Save to file
function saveCache() {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(filesIndex));
    console.log('Cache saved!');
  } catch (err) {
    console.error('Error saving cache:', err);
  }
}

// ⚡ Load from file
function loadCache() {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      const data = fs.readFileSync(CACHE_PATH);
      filesIndex = JSON.parse(data);
      console.log('Cache loaded!');
      initFuse(); // ✅ important
    }
  } catch (err) {
    console.error('Error loading cache:', err);
  }
}
// 🔍 Search
function searchFiles(query) {
  if (!query) return [];

  // 1. exact match first (fast + accurate)
  const exact = filesIndex.filter(file =>
    file.name.toLowerCase().includes(query.toLowerCase())
  );

  if (exact.length > 0) return exact;

  // 2. fallback to fuzzy
  return fuse.search(query).map(r => r.item);
}
module.exports = {
  buildIndex,
  searchFiles,
  loadCache,
};