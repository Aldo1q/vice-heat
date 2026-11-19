// Vice Heat entry program (Node 22, stdlib only, no network).
// Copies game/ and screenshots/ into the output directory and writes the
// dossier buildDossier derives from them, so the grader sees exactly what
// buildDossier writes. Output dir: $MAKEFUN_OUTPUT_DIR, else /output.
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)));
const OUT = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function copyTree(src, dst) {
  mkdirSync(dst, { recursive: true });
  for (const name of readdirSync(src, { withFileTypes: true })) {
    const from = join(src, name.name);
    const to = join(dst, name.name);
    if (name.isDirectory()) copyTree(from, to);
    else if (name.isFile()) cpSync(from, to);
    else throw new Error(`refusing non-file entry: ${from}`);
  }
}

function countFiles(dir) {
  let n = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    n += e.isDirectory() ? countFiles(join(dir, e.name)) : 1;
  }
  return n;
}

function checkScreenshots(dir) {
  // Fail loudly here, with the offender named, rather than letting the
  // scorer refuse the whole entry: at most CAPS.screenshots.max shots and
  // none over CAPS.screenshots.max_bytes.
  const names = readdirSync(dir).sort();
  if (names.length > CAPS.screenshots.max) {
    throw new Error(`too many screenshots: ${names.length} > ${CAPS.screenshots.max} (${names.join(', ')})`);
  }
  const summary = [];
  for (const name of names) {
    const bytes = statSync(join(dir, name)).size;
    if (bytes > CAPS.screenshots.max_bytes) {
      throw new Error(`screenshot too large: ${name} is ${bytes} bytes > ${CAPS.screenshots.max_bytes}`);
    }
    summary.push(`${name}=${bytes}B`);
  }
  return summary;
}

function main() {
  const gameSrc = join(ROOT, 'game');
  const shotsSrc = join(ROOT, 'screenshots');
  if (!existsSync(gameSrc)) throw new Error('game/ is missing from the repository');
  if (!existsSync(shotsSrc)) throw new Error('screenshots/ is missing from the repository');
  const shotSummary = checkScreenshots(shotsSrc);
  // NOTE: do NOT rmSync the output dir first. In the grader /output is a
  // mounted empty directory and removing the mount point itself fails.
  // The starter only mkdirSync's it; the grader always hands us an empty one.
  mkdirSync(OUT, { recursive: true });
  copyTree(gameSrc, join(OUT, 'game'));
  copyTree(shotsSrc, join(OUT, 'screenshots'));
  const dossier = buildDossier(OUT, CAPS);
  writeFileSync(join(OUT, 'dossier.json'), dossier);
  const nGame = countFiles(join(OUT, 'game'));
  console.log(`wrote ${OUT}/dossier.json (${dossier.length} bytes): ${nGame} game files, ${shotSummary.length} screenshots [${shotSummary.join(', ')}]`);
}

main();
