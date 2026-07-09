/**
 * Patches android/app/src/main/AndroidManifest.xml to add
 * android:attributionTag="audioPlayback" to the expo-audio
 * AudioControlsService.
 *
 * # Why
 * Android 11+ (API 30) requires every service that requests app-ops
 * (like media playback) to declare an `android:attributionTag` in the
 * manifest. Without it, the Android system logs a warning every time
 * the service is active:
 *   "AppOps: attributionTag not declared in manifest of <package>"
 *
 * `expo-audio` does not set this attribute by default. See P36 in
 * brain/wiki/key-risks.md for the full analysis.
 *
 * # When this runs
 * Wired into the npm `postinstall` script in package.json. Runs after
 * `npx expo prebuild` (which regenerates android/ from scratch), so
 * the fix is applied automatically every time the native project is
 * regenerated. Idempotent: the sentinel comment short-circuits if
 * already applied.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const manifestPath = join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');

const SENTINEL = '<!-- 2026-07-09: attributionTag patched by patch-audio-attribution-tag.mjs -->';
const SERVICE_TAG = '<service android:name="expo.modules.audio.service.AudioControlsService"';
const SERVICE_TAG_PATCHED = '<service android:name="expo.modules.audio.service.AudioControlsService" android:attributionTag="audioPlayback"';

if (!existsSync(manifestPath)) {
  console.log('AndroidManifest.xml not found — skipping attribution tag patch (run `npx expo prebuild` first)');
  process.exit(0);
}

let content = readFileSync(manifestPath, 'utf-8');

// Already patched? Short-circuit.
if (content.includes('android:attributionTag="audioPlayback"')) {
  console.log('AudioControlsService attribution tag already set — skipping');
  process.exit(0);
}

// Ensure the audio service line exists. If it doesn't, the expo-audio
// module isn't wired in (or has been refactored) — don't fabricate a
// service entry, just bail.
if (!content.includes(SERVICE_TAG)) {
  console.log('AudioControlsService <service> not found in manifest — skipping patch (expo-audio may not be installed)');
  process.exit(0);
}

const beforePatch = content;

// Add the attribution tag to the service element
content = content.replace(
  SERVICE_TAG,
  SERVICE_TAG_PATCHED
);

// Add a sentinel comment above the patched service for future audits
if (!content.includes(SENTINEL)) {
  content = content.replace(
    SERVICE_TAG_PATCHED,
    `${SENTINEL}\n    ${SERVICE_TAG_PATCHED}`
  );
}

if (content === beforePatch) {
  console.log('No change applied — manifest may have unexpected format');
  process.exit(0);
}

writeFileSync(manifestPath, content, 'utf-8');
console.log('Patched AndroidManifest.xml — added android:attributionTag="audioPlayback" to expo-audio AudioControlsService');
