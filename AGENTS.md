# Word Guess — Agent Context

**Docs home (canonical):** `E:\Projects\Docs\project-docs\App\word-guess`  
**Start there:** read `AGENTS.md` in the docs home, then the context files it lists.

This repo is code only. Do not recreate `brain/` or `.planning/` here.

`docs/` is **GitHub Pages only** (public privacy policy). Edit policy substance in project-docs first, then sync `docs/privacy.md` here when publishing.

**Ads are Unity LevelPlay only** (`unity-levelplay-mediation`, `src/stores/adStore.ts`). Do not describe this app’s ads as AdMob or AdSense. Error 509 “Mediation No fill” is a LevelPlay inventory miss. Mentions of AdMob/AdSense in old decisions, research, or `.claude/CLAUDE.md` are historical (or refer to the Pasttime website, not this app).

Cloud Functions live in `functions/` (callable `verifyProPurchase`). Root Jest ignores that tree; use `npm run functions:test`. Deploy is still required before production verifies.
