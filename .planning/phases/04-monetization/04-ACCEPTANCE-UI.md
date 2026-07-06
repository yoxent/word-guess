```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "Produced UI-SPEC.md covering Phase 4 Monetization scope (interstitials, rewarded ads, Pro IAP, restore purchases) without extending into Phase 5 (cloud/social) or Phase 6 (accessibility/Play Store compliance) concerns. Spec stays within AD-01 through AD-07 requirements and D-87 through D-112 decisions."
    }
  ],
  "changedFiles": [
    ".planning/phases/04-monetization/04-UI-SPEC.md"
  ],
  "testsAddedOrUpdated": [],
  "commandsRun": [],
  "validationOutput": [
    "UI-SPEC.md written at E:/Projects/Indie/word-guess/.planning/phases/04-monetization/04-UI-SPEC.md (30,912 bytes, ~350 lines)"
  ],
  "residualRisks": [
    "Toast component is inline in SettingsScreen, not a reusable component — acceptable for MVP, but Phase 6 may want a centralized ToastProvider",
    "No animation specified for toast entrance/exit — immediate show/hide is adequate for MVP; Phase 6 polish may add fade transitions",
    "Rewarded ad button 'not loaded' state is a silent no-op — user gets no feedback if ad isn't ready. Acceptable for MVP; consider adding a brief 'Ad not ready' toast in future iteration"
  ],
  "noStagedFiles": true,
  "diffSummary": "Wrote 04-UI-SPEC.md — design contract for Phase 4: Monetization. Covers 7 component contracts (config registry extension, SettingsRow restore/purchase cases, SettingsScreen restore/purchase flow with toast, ResultModal rewarded ad button, interstitial transition, GameScreen ad lifecycle, gameStore addExtraGuess). 13 edge cases documented. Checker sign-off checklist included.",
  "reviewFindings": [
    "no blockers — spec references existing design tokens only (colors.success, colors.danger now used), follows Phase 3 UI-SPEC format, covers all D-87–D-112 decisions"
  ],
  "manualNotes": "UI-SPEC complete for Phase 4. Ready for checker validation and subsequent plan execution. Key integration points: SettingsRow.tsx needs restore/purchase cases (new onRestore/onPurchase props), ResultModal.tsx needs rewarded ad button + interstitial trigger, GameScreen.tsx needs preload calls."
}
```