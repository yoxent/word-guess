# Word Guess

Wordle-style word puzzle for Android, published on [Google Play](https://play.google.com/store/apps/details?id=com.vorithstudio.wordguess).

Players guess English words from 5 to 10 letters and get green, yellow, and gray tile feedback. Modes are Free Play (pick a length), Random, a shared Daily Challenge, and Endless, with an optional Hard Mode. The daily word is chosen on the device from the date, so the puzzle works offline and is the same for every player.

The free version shows Unity LevelPlay ads: an interstitial after a game, plus rewarded ads for an extra row or a letter hint. A one-time Pro purchase removes ads. Optional Google Play Games sign-in syncs progress and powers leaderboards. Purchase checks and leaderboard submissions run through Cloud Functions.

## Stack

- TypeScript, React Native, and Expo
- Zustand, with MMKV and SQLite for on-device state
- Firebase Auth, Firestore, Remote Config, and Cloud Functions
- Unity LevelPlay and Google Play Billing

## Privacy

[Privacy policy](https://yoxent.github.io/word-guess/privacy)
