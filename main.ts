// Leonida Ledger — hand-in program for the gta6-trophy-guide-01 entry.
//
// The guide itself is the static web app in app/ beside this file: plain HTML,
// CSS and JavaScript with no build step, loading nothing over the network.
// This program is only the courier. It copies app/ and screenshots/ into the
// output directory and writes dossier.json there with buildDossier from
// vendor/makefun-frontend.ts — the kit's library, deliberately left untouched,
// because the scorer rebuilds the dossier with its own copy and compares the
// two byte for byte.
//
// Run it the way the grader does, with MAKEFUN_OUTPUT_DIR naming the output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// With no MAKEFUN_OUTPUT_DIR set it writes to /output, as in the grader's
// container. It prints a one-line summary of what it handed in.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoDir, 'app'), join(outputDir, 'app'), { recursive: true });

const shotsDir = join(outputDir, 'screenshots');
mkdirSync(shotsDir, { recursive: true });
if (existsSync(join(repoDir, 'screenshots'))) {
  cpSync(join(repoDir, 'screenshots'), shotsDir, { recursive: true });
}

// The dossier caps are the scorer's own (the kit's reference/gate.json): at
// most 4 screenshots of 256 KiB each, at most 993 files and 48 MiB under app/,
// and the judge's text view capped at 163,840 bytes. Passing them here means
// the dossier this writes is exactly the one the scorer rebuilds.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);

const shotCount = readdirSync(shotsDir).filter((name) => !name.startsWith('.')).length;
const dossierBytes = statSync(join(outputDir, 'dossier.json')).size;
console.log(`Leonida Ledger handed in: app/ copied, ${shotCount} screenshots, dossier.json ${dossierBytes} bytes.`);
