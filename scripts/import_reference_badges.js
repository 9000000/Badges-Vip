const fs = require('fs');
const path = require('path');

const REFERENCE_URL = 'https://gist.githubusercontent.com/hung319/6733cbacf9ead4cb79e314a7c47a2f52/raw/be8e333f85d09f892ea8958ede2dc84338882fd4/gistfile1.txt';
const ROOT_DIR = path.resolve(__dirname, '..');
const BADGES_DIR = path.join(ROOT_DIR, 'Badges');
const CONFIG_PATH = path.join(ROOT_DIR, 'badges.json');
const MANIFEST_PATH = path.join(__dirname, 'reference_badges_manifest.json');
const RAW_BASE_URL = 'https://raw.githubusercontent.com/9000000/Badges-Vip/tet/Badges';
const CACHE_VERSION = '20260817-expanded-v1';

// These reference entries duplicate labels already present in the curated core.
// Keeping both would make the same media item display two equivalent badges.
const SEMANTIC_DUPLICATES = new Set([
  'r-4k',
  'r-1080',
  'r-720',
  'r-480p',
  'q-b',
  'a-dv',
  'a-at',
  'a-dtsma',
  'a-dp',
  'a-dd',
  'ch-71',
  'ch-51'
]);

const GROUP_MAP = {
  gst: 'special-tags',
  gms: 'source',
  gr: 'resolution',
  gq: 'quality',
  imax: 'video-tech',
  gv: 'video-tech',
  ga: 'audio-tech',
  gc: 'audio-channels',
  ge: 'video-codec',
  gs: 'streaming',
  gl: 'language'
};

const NEW_GROUPS = [
  { id: 'special-tags', name: 'Special Tags' },
  { id: 'quality', name: 'Quality' },
  { id: 'streaming', name: 'Streaming' },
  { id: 'language', name: 'Language' }
];

const STYLE_MAP = {
  gst: { intro: 'glitch', effects: ['gold', 'purple', 'orange'] },
  gms: { intro: 'glitch', effects: ['cyan', 'blue', 'purple'] },
  gr: { intro: 'ink', effects: ['green', 'cyan', 'silver'] },
  gq: { intro: 'glitch', effects: ['orange', 'gold', 'purple'] },
  imax: { intro: 'scan', effects: ['blue', 'cyan'] },
  gv: { intro: 'burst', effects: ['rainbow', 'gold', 'orange'] },
  ga: { intro: 'wave', effects: ['cyan', 'orange', 'purple', 'gold'] },
  gc: { intro: 'wave', effects: ['cyan', 'blue'] },
  ge: { intro: 'glitch', effects: ['green', 'purple', 'orange'] },
  gs: { intro: 'scan', effects: ['rainbow', 'cyan', 'purple'] },
  gl: { intro: 'scan', effects: ['gold', 'cyan', 'rainbow', 'green'] }
};

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\+/g, '_plus')
    .replace(/&/g, '_and_')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function hash(value) {
  let result = 2166136261;
  for (const char of value) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function styleFor(filter) {
  const style = STYLE_MAP[filter.groupId] || STYLE_MAP.gst;
  return {
    intro: style.intro,
    effect: style.effects[hash(filter.id) % style.effects.length]
  };
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'Elite-Badges importer' } });
  if (!response.ok) {
    throw new Error(`Unable to download ${url}: HTTP ${response.status}`);
  }
  return response.json();
}

async function downloadPng(url, destination, force) {
  if (!force && fs.existsSync(destination) && fs.statSync(destination).size > 0) {
    return 'cached';
  }

  const response = await fetch(url, { headers: { 'user-agent': 'Elite-Badges importer' } });
  if (!response.ok) {
    throw new Error(`Unable to download ${url}: HTTP ${response.status}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 8 || bytes.subarray(1, 4).toString('ascii') !== 'PNG') {
    throw new Error(`Reference image is not a PNG: ${url}`);
  }
  fs.writeFileSync(destination, bytes);
  return 'downloaded';
}

async function runPool(items, concurrency, worker) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await worker(items[index], index);
    }
  });
  await Promise.all(runners);
}

async function main() {
  const force = process.argv.includes('--refresh');
  const reference = await fetchJson(REFERENCE_URL);
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

  const priorImportedIds = new Set(
    fs.existsSync(MANIFEST_PATH)
      ? JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')).badges.map(item => item.id)
      : []
  );
  const coreFilters = config.filters.filter(filter => !priorImportedIds.has(filter.id));
  const coreKeys = new Set(coreFilters.flatMap(filter => [normalize(filter.id), normalize(filter.name)]));

  const selected = reference.filters.filter(filter => {
    if (SEMANTIC_DUPLICATES.has(filter.id)) return false;
    return !coreKeys.has(normalize(filter.id)) && !coreKeys.has(normalize(filter.name));
  });

  const usedNames = new Set();
  const imports = selected.map(filter => {
    let fileBase = slugify(filter.name) || slugify(filter.id);
    if (usedNames.has(fileBase)) fileBase = `${fileBase}_${slugify(filter.id)}`;
    usedNames.add(fileBase);
    const style = styleFor(filter);
    return {
      source: filter,
      fileBase,
      manifest: {
        id: filter.id,
        png: `${fileBase}.png`,
        gif: `${fileBase}.gif`,
        effect: style.effect,
        intro: style.intro,
        collection: 'reference'
      }
    };
  });

  fs.mkdirSync(BADGES_DIR, { recursive: true });
  let downloaded = 0;
  let cached = 0;
  await runPool(imports, 8, async item => {
    const status = await downloadPng(
      item.source.imageURL,
      path.join(BADGES_DIR, item.manifest.png),
      force
    );
    if (status === 'downloaded') downloaded++;
    else cached++;
    console.log(`[${downloaded + cached}/${imports.length}] ${item.manifest.png} (${status})`);
  });

  const importedIds = new Set(imports.map(item => item.source.id));
  config.filters = [
    ...coreFilters.filter(filter => !importedIds.has(filter.id)),
    ...imports.map(item => ({
      id: item.source.id,
      groupId: GROUP_MAP[item.source.groupId] || item.source.groupId,
      name: item.source.name,
      pattern: item.source.pattern,
      imageURL: `${RAW_BASE_URL}/${encodeURIComponent(item.manifest.gif)}?v=${CACHE_VERSION}`,
      tagColor: '#00000000',
      borderColor: '#00000000',
      textColor: '#00000000',
      tagStyle: 'filled and bordered',
      isEnabled: true,
      type: 'filter'
    }))
  ];

  const groupIds = new Set(config.groups.map(group => group.id));
  for (const group of NEW_GROUPS) {
    if (groupIds.has(group.id)) continue;
    config.groups.push({
      ...group,
      color: '#00000000',
      borderColor: '#00000000',
      isExpanded: true
    });
  }

  fs.writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`);
  fs.writeFileSync(
    MANIFEST_PATH,
    `${JSON.stringify({ source: REFERENCE_URL, badges: imports.map(item => item.manifest) }, null, 2)}\n`
  );

  console.log(`Imported ${imports.length} labels (${downloaded} downloaded, ${cached} cached).`);
  console.log(`Total configured badges: ${config.filters.length}.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
