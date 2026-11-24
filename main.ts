import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const dossierLimits = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function copySubmission(destination: string): void {
  const projectDirectory = fileURLToPath(new URL('.', import.meta.url));
  mkdirSync(destination, { recursive: true });

  for (const folder of ['game', 'screenshots']) {
    const source = join(projectDirectory, folder);
    const target = join(destination, folder);
    if (folder === 'screenshots') {
      mkdirSync(target, { recursive: true });
      if (!existsSync(source)) continue;
    }
    cpSync(source, target, { recursive: true });
  }
}

// Inspect the copied files so the report describes what was actually handed in.
function inventory(directory: string) {
  const files: { name: string; bytes: number }[] = [];
  let entries = 0;
  let totalBytes = 0;

  function visit(folder: string, prefix: string): void {
    for (const name of readdirSync(folder).sort()) {
      const path = join(folder, name);
      const relativeName = prefix + name;
      const metadata = lstatSync(path);
      entries += 1;
      if (metadata.isDirectory()) {
        visit(path, relativeName + '/');
      } else if (metadata.isFile()) {
        files.push({ name: relativeName, bytes: metadata.size });
        totalBytes += metadata.size;
      }
    }
  }

  visit(directory, '');
  return { files, entries, totalBytes };
}

function verifySubmission(destination: string): void {
  const dossierPath = join(destination, 'dossier.json');
  if (!existsSync(dossierPath)) {
    throw new Error('Output verification failed: dossier.json is missing.');
  }
  const dossier = lstatSync(dossierPath);
  if (!dossier.isFile()) {
    throw new Error('Output verification failed: dossier.json is not a regular file.');
  }

  const game = inventory(join(destination, 'game'));
  const screenshots = inventory(join(destination, 'screenshots'));
  console.log(`game/: ${game.files.length} files, ${game.totalBytes} bytes (${game.entries} entries including directories)`);
  for (const screenshot of screenshots.files) {
    console.log(`screenshots/${screenshot.name}: ${screenshot.bytes} bytes`);
  }
  console.log(`dossier.json: ${dossier.size} bytes`);

  // The builder counts directories toward the entry cap; only files add bytes.
  const violations: string[] = [];
  if (game.entries > dossierLimits.game_max_files) {
    violations.push(`game/ has ${game.entries} files and directories; limit is ${dossierLimits.game_max_files}`);
  }
  if (game.totalBytes > dossierLimits.game_max_bytes) {
    violations.push(`game/ totals ${game.totalBytes} bytes; limit is ${dossierLimits.game_max_bytes}`);
  }
  for (const screenshot of screenshots.files) {
    if (screenshot.bytes > dossierLimits.screenshots.max_bytes) {
      violations.push(`screenshots/${screenshot.name} is ${screenshot.bytes} bytes; limit is ${dossierLimits.screenshots.max_bytes}`);
    }
  }
  if (violations.length > 0) {
    throw new Error(`Output verification failed: ${violations.join('; ')}.`);
  }
}

try {
  const destination = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  copySubmission(destination);
  writeFileSync(join(destination, 'dossier.json'), buildDossier(destination, dossierLimits));

  // Check the finished submission independently of dossier construction.
  verifySubmission(destination);
} catch (error) {
  console.error(`Build failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
