import { mkdir, rm, copyFile, writeFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = await realpath(fileURLToPath(new URL('../', import.meta.url)));
const destination = path.resolve(root, 'dist');
// Restrict recursive cleanup to this project's own generated output folder.
if (path.dirname(destination) !== root || path.basename(destination) !== 'dist') {
  throw new Error('Unexpected build destination');
}
try {
  if (await realpath(destination) !== destination) throw new Error('Build output must not be a symlink');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await rm(destination, { recursive: true, force: true });
await mkdir(destination);
const assets = [
  'index.html', 'style.css', 'app.js', 'store.js', 'rules.js', 'merchants.js',
  'recommend.js', 'sw.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png',
  'icon-512.png', 'icon-maskable.png'
];
for (const asset of assets) {
  await copyFile(path.join(root, 'public', asset), path.join(destination, asset));
}
await writeFile(path.join(destination, '.nojekyll'), '');
console.log('Built static app in dist/ (no credentials, preview data or developer files).');
