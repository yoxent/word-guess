/**
 * Patches android/app/src/main/AndroidManifest.xml.
 *
 * CURRENTLY A NO-OP. See P36 in brain/wiki/key-risks.md for the history.
 *
 * The original goal was to add `android:attributionTag="audioPlayback"`
 * to the expo-audio `AudioControlsService` to silence the Android 11+
 * AppOps warning. That fix was attempted and reverted: the AAPT2 build
 * tool used by the project (as of 2026-07-10) does not recognize the
 * `android:attributionTag` attribute, even with compileSdk = 36. The
 * build fails with:
 *
 *   AAPT: error: attribute android:attributionTag not found.
 *
 * The attribute is added in API 31+ in the AOSP source, so this is
 * likely a build-tools / AAPT2 version mismatch in the toolchain
 * (RN 0.86 ships compileSdk = 36 in libs.versions.toml but the AAPT2
 * binary may be older). Until that's resolved, the cleanest fix is
 * to accept the AppOps log warning and let `expo-audio` add the
 * attribute natively in a future release.
 *
 * This script remains in place so that:
 *   1. If the toolchain is updated and `android:attributionTag`
 *      becomes accepted, re-enabling the patch is a one-line change.
 *   2. The script signature is stable for the postinstall wiring.
 *
 * No manifest edits are made. Exits successfully.
 */

console.log('patch-audio-attribution-tag: no-op (see P36 in key-risks.md)');
process.exit(0);
