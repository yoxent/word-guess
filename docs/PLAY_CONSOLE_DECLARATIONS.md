# Google Play Console declarations — Q&A reference

Reusable checklist for Play Console **App content**, **Data safety**, **Target audience**, and **Store settings**.  

Filled answers below are for **Word Guess** (`com.vorithstudio.wordguess`). Use the *When to change* notes when submitting another app.

**Last filled:** 2026-07-15  
**Console paths (2026):** Dashboard task cards · left nav **Policy → App content** · **Grow users → Store presence → Store settings**

Related docs: [STORE_LISTING.md](./STORE_LISTING.md) · [privacy.md](./privacy.md)

---

## How to reuse for another app

1. Copy this file (or keep a section per package).
2. Re-answer every item from your **privacy policy + SDKs + features** (ads, auth, IAP, analytics, UGC).
3. Treat AdMob / analytics / login as “collected or shared” even when data goes to Google, not only to you.
4. Prefer accurate **No** / fewer tags over stretching the truth.

---

## 1. App access (sign-in / restricted features)

**Path:** Policy → App content → App access  

### Is any part of your app restricted?

| Option | Word Guess |
|--------|------------|
| **Yes** — login, payments, codes, 2FA, biometrics, multi-device actions | **Yes** (Play Games sign-in + Pro IAP) |
| No — nothing restricted / no login / no paid content | — |

**When to change:** Select **No** only if there is truly no account gate and no IAP/subscription anywhere.

### Sign-in details set

| Field | Word Guess |
|-------|------------|
| Name | `Play Games user (cloud sync + Pro)` |
| Username | *(leave blank — SSO only)* |
| Password | *(leave blank)* |
| Other information (≤500 chars) | See snippet below |
| Checkbox: details provide full access including premium | **Checked** |

**≤500 character instructions (Word Guess):**

```
Fully playable without login. Sign-in is optional Google Play Games SSO (no username/password).

Sign in: Settings or Leaderboard → Sign in with Play Games → complete Google prompt.

Pro (ads off + extra guesses): must be signed in → Settings → "Remove Ads · $1.99" (SKU word_guess_pro) → Play Billing. Restore via Settings → Restore Purchases.

No 2FA, QR, biometrics, or PIN.
```

**When to change:** Provide real demo credentials if you use email/password. Update SKU names and on-screen labels.

Also complete related **Ads** declaration (Yes if AdMob/any ads) before Data safety.

---

## 2. Content rating (IARC questionnaire)

**Path:** Policy → App content → Content rating  

### Digital purchases / cash rewards / NFTs

| Question | Word Guess |
|----------|------------|
| Includes purchase/sale of digital goods, cash rewards, gift cards, play-to-earn, crypto, NFTs? | **Yes** |
| Which? | **Purchases of digital goods** only |
| Chance-based / loot-box style purchases? | **No** |
| Player trading with real money / bought currency? | **No** |

**When to change:** Yes + loot boxes / trading if those features exist.

### Miscellaneous

| Question | Word Guess |
|----------|------------|
| Voice / text / image / audio exchange between users? | **No** |
| Share precise physical location with other users? | **No** |
| Swastikas / Nazi symbols (DE unconstitutional)? | **No** |
| Content eroding ROK national identity / distorting history? | **No** |
| Advocate terrorism? | **No** |
| Realistic crime descriptions / criminal techniques? | **No** |

**When to change:** Chat, UGC image sharing, or location sharing → update accordingly. Leaderboards with display names alone usually stay **No** for #1.

Fill remaining questionnaire sections (violence, language, etc.) honestly for the product — a word puzzle with a curated dictionary is typically “Everyone”-class when free of prohibited/UGC risk.

---

## 3. Target audience and content

**Path:** Policy → App content → Target audience and content  

### Target age groups

| Age group | Word Guess |
|-----------|------------|
| 5 and under | ☐ |
| 6–8 | ☐ |
| 9–12 | ☐ |
| 13–15 | ☑ |
| 16–17 | ☑ |
| 18 and over | ☑ |

**When to change:** Selecting **12 and under** pulls in **Families Policy** (stricter ads/SDK rules). Match your privacy policy. Word Guess privacy: not directed to under 13.

Store listing “appeals to children” follow-ups: answer **No** unless creative assets are kid-oriented.

---

## 4. Data safety

**Path:** Policy → App content → Data safety  

Official reference: [Data safety section](https://support.google.com/googleplay/android-developer/answer/10787469)

### Overview

| Question | Word Guess |
|----------|------------|
| Collect or share any required user data types? | **Yes** |
| All collected data encrypted in transit? | **Yes** (HTTPS/TLS via Google SDKs) |
| Account creation methods | **OAuth** only (Play Games → Firebase) |
| Account / data deletion request URL | `https://yoxent.github.io/word-guess/privacy` |
| Delete some data without deleting account? (optional) | **No** |

**When to change:** No accounts → “does not allow users to create an account.” Email/password → select those methods. Deletion URL must be public and describe how to request deletion.

### Data types selected (Word Guess)

| Category | Types |
|----------|-------|
| Location | Approximate location |
| Personal info | Name, Email address, User IDs |
| Financial info | Purchase history |
| Photos and videos | Photos |
| App activity | App interactions |
| Device or other IDs | Device or other IDs |

**Not selected:** Precise location, payment card details (Play handles), messages, health, audio, files, calendar, contacts, web history, crash/diagnostics (no Crashlytics), UGC chat, etc.

### Per-type handling (Word Guess)

**Rule of thumb:** Your Firebase/Play backend → **Collected** (not Shared under service-provider use). **AdMob** → **Collected + Shared**.

| Data type | Collected | Shared | Ephemeral | Required vs optional | Why collected | Why shared |
|-----------|:---------:|:------:|:---------:|----------------------|---------------|------------|
| Name | ☑ | ☐ | No | Users can choose | App functionality, Account management | — |
| Email address | ☑ | ☐ | No | Users can choose | App functionality, Account management | — |
| User IDs | ☑ | ☐ | No | Users can choose | App functionality, Account management | — |
| Photos | ☑ | ☐ | No | Users can choose | App functionality, Account management | — |
| Purchase history | ☑ | ☐ | No | Users can choose | App functionality, Account management | — |
| Approximate location | ☑ | ☑ | No | Required | Advertising or marketing; Fraud prevention, security, and compliance | Same |
| App interactions | ☑ | ☑ | No | Required | App functionality; Advertising or marketing | Advertising or marketing |
| Device or other IDs | ☑ | ☑ | No | Required | Advertising or marketing; Fraud prevention, security, and compliance | Same |

**When to change:**

- Add Analytics / Crashlytics → declare those types + purposes (Analytics / diagnostics / crash logs).
- Remove AdMob → drop ad-related shared types/purposes; reassess approximate location & device IDs.
- Remove sign-in → drop Name / Email / User IDs / Photos / OAuth / deletion URL requirements as applicable.
- Ephemeral = **Yes** only for truly in-memory, request-scoped processing.

Privacy policy must stay consistent with this form.

---

## 5. Store settings — category, tags, contact

**Path:** Grow users → Store presence → Store settings  

Official reference: [Category and tags](https://support.google.com/googleplay/android-developer/answer/9859673)

### App / game category (Word Guess)

| Field | Value |
|-------|--------|
| Application type | **Game** |
| Category | **Word** |

**When to change:** Pick the single best primary genre (Puzzle vs Word vs Casual, etc.).

### Tags (up to 5)

**Recommended for Word Guess:** Word · Puzzle · Casual  

Optional only if listed and accurate: Brain / Logic.  

**Avoid:** Multiplayer (leaderboards ≠ live multiplayer), Trivia, Arcade, Action, Board, Card.

Google may auto-add tags (e.g. Offline, Single player); you often cannot select those manually — don’t burn slots on them.

Better to use 2–3 accurate tags than fill all 5 poorly.

### Contact details

Use the same developer identity as the store listing / privacy policy.

| Field | Word Guess |
|-------|------------|
| Email | `vorithstudio@gmail.com` |
| Privacy policy URL | `https://yoxent.github.io/word-guess/privacy` |
| Website / phone | As applicable |

Confirm the privacy URL loads publicly (no login / geo-block) before submit.

---

## 6. Quick pre-submit checklist

- [ ] App access instructions current (≤500 chars; SKUs/labels match UI)
- [ ] Ads declared if any ad SDK ships
- [ ] Content rating questionnaire complete and re-run after major content changes
- [ ] Target ages match privacy policy and Families obligations
- [ ] Data safety types match privacy policy + every SDK
- [ ] Deletion URL live and clear
- [ ] Category + tags accurate
- [ ] Store listing + privacy links in [STORE_LISTING.md](./STORE_LISTING.md)

---

## Appendix — Word Guess tech that drives answers

| Stack | Implication |
|-------|-------------|
| Play Games → Firebase Auth | OAuth; Name / Email / User IDs / Photos (optional sign-in) |
| Firestore sync / leaderboards | App interactions; optional cloud stats |
| AdMob (`react-native-google-mobile-ads`) | Approximate location, Device IDs, App interactions; Shared + Advertising |
| Play Billing Pro (`word_guess_pro`) | Purchase history; App access Yes; digital goods Yes; not loot boxes |
| No Crashlytics | Skip crash logs unless added later |
| No in-app chat / UGC media | Misc interaction questions No |

Package: `com.vorithstudio.wordguess` · Developer: Vorith Studio
