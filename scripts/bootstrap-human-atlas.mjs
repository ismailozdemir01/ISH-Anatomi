import {execFileSync} from 'node:child_process';
import {existsSync,rmSync} from 'node:fs';
import {mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vendor = path.join(root, 'vendor');
const target = path.join(vendor, 'human-atlas');
const repo = 'https://github.com/ashemag/human-atlas.git';
const commit = '1c38bf35c254a891200d3cedecfd57abebe83d8d';

mkdirSync(vendor, {recursive: true});

if (existsSync(target)) {
  rmSync(target, {recursive: true, force: true});
}

console.log(`[ISH-Anatomi] Fetching Human Atlas ${commit}`);
execFileSync('git', ['clone', '--filter=blob:none', repo, target], {stdio: 'inherit'});
execFileSync('git', ['-C', target, 'checkout', '--detach', commit], {stdio: 'inherit'});

console.log('[ISH-Anatomi] Human Atlas pinned successfully.');
console.log('[ISH-Anatomi] Next: npm run atlas:install && npm run atlas:dev');
