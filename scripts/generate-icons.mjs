import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const names = new Set();
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await scan(path);
    else if (/\.(tsx?|css)$/.test(entry.name)) {
      const text = await readFile(path, 'utf8');
      for (const match of text.matchAll(/ri:([a-z0-9-]+)/g)) names.add(match[1]);
    }
  }
}
await scan(join(root, 'src'));
const source = JSON.parse(await readFile(join(root, 'node_modules/@iconify-json/ri/icons.json'), 'utf8'));
const icons = {};
for (const name of [...names].sort()) {
  if (!source.icons[name]) throw new Error(`Unknown icon: ${name}`);
  icons[name] = source.icons[name];
}
await writeFile(join(root, 'src/config/local-icons.json'), JSON.stringify({ prefix: source.prefix, width: source.width, height: source.height, icons }));
console.log(`Bundled ${names.size} locally used icons.`);
