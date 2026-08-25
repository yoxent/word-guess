/**
 * Patches android/build.gradle to pin Kotlin version.
 *
 * Some Google Play / Firebase Android libraries ship Kotlin metadata 2.3.0.
 * RN 0.86 ships Kotlin 2.1.20 in its Gradle version catalog
 * (`node_modules/react-native/gradle/libs.versions.toml`). The Kotlin compiler
 * 2.1.20 cannot read metadata 2.3.0.
 *
 * `expo-build-properties` sets `android.kotlinVersion` in `gradle.properties`,
 * but some modules read `rootProject.ext.kotlinVersion` — a different scope.
 *
 * This patch adds `ext.kotlinVersion = '2.3.0'` to buildscript {} in
 * android/build.gradle so the Kotlin compiler can read those libraries.
 *
 * Runs after `npx expo prebuild` (which regenerates android/ from scratch).
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const buildGradlePath = join(root, 'android', 'build.gradle');

const KOTLIN_VERSION = '2.3.0';
const SENTINEL = '// patched by patch-kotlin-version.mjs';

if (!existsSync(buildGradlePath)) {
  console.log('android/build.gradle not found — skipping Kotlin patch');
  process.exit(0);
}

let content = readFileSync(buildGradlePath, 'utf-8');

// Skip if already patched
if (content.includes(SENTINEL)) {
  console.log('Kotlin version already patched — skipping');
  process.exit(0);
}

// Add ext.kotlinVersion right after "buildscript {"
content = content.replace(
  /(buildscript\s*\{)/,
  `$1\n  ${SENTINEL}\n  ext.kotlinVersion = '${KOTLIN_VERSION}'`
);

// Also pin the classpath dependency to use the ext variable
content = content.replace(
  /classpath\('org\.jetbrains\.kotlin:kotlin-gradle-plugin'\)/,
  `classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:\${kotlinVersion}")`
);

writeFileSync(buildGradlePath, content, 'utf-8');
console.log(`Patched android/build.gradle — Kotlin ${KOTLIN_VERSION} pinned`);
