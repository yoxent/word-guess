import type { ExpoConfig } from 'expo/config';

const DEFAULT_PLAY_GAMES_APP_ID = '765565366850';

const playGamesAppId =
  process.env.PLAY_GAMES_APP_ID ??
  process.env.EXPO_PUBLIC_PLAY_GAMES_APP_ID ??
  DEFAULT_PLAY_GAMES_APP_ID;

const config: ExpoConfig = {
  name: 'Word Guess',
  slug: 'word-guess',
  version: '1.0.3',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.vorithstudio.wordguess',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      // Matches navy grid in adaptive-icon.png so OEM masks don't show a cream halo
      backgroundColor: '#151C53',
    },
    package: 'com.vorithstudio.wordguess',
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    // WorkManager merges FOREGROUND_SERVICE even though we never run a
    // foreground service (BGM/SFX are in-app only). Blocking it so Play
    // does not require an FGS declaration.
    blockedPermissions: [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
      'android.permission.FOREGROUND_SERVICE_DATA_SYNC',
    ],
  },
  plugins: [
    'expo-dev-client',
    [
      'expo-splash-screen',
      {
        image: './assets/splash.png',
        resizeMode: 'contain',
        backgroundColor: '#f5f5f0',
      },
    ],
    'expo-sqlite',
    'react-native-iap',
    '@react-native-firebase/app',
    '@react-native-firebase/auth',
    [
      'expo-build-properties',
      {
        android: {
          kotlinVersion: '2.3.0',
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          extraProguardRules: [
            '-keepattributes SourceFile,LineNumberTable',
            '-keep class com.facebook.react.** { *; }',
            '-keep class com.mrousavy.nitro.** { *; }',
            '-keep class com.google.android.gms.games.** { *; }',
            '-keep class com.google.firebase.** { *; }',
            '-keep class com.ironsource.** { *; }',
            '-keep class com.unity3d.** { *; }',
            '-dontwarn com.ironsource.**',
            '-dontwarn com.unity3d.**',
          ].join('\n'),
        },
      },
    ],
    './plugins/withLevelPlayAndroid.js',
    [
      'expo-audio',
      {
        // Foreground-only BGM/SFX — no Play FGS declaration needed.
        enableBackgroundPlayback: false,
        // Playback only; never record.
        recordAudioAndroid: false,
      },
    ],
    'expo-asset',
    'expo-font',
    './plugins/withPlayGamesAppId.js',
  ],
  extra: {
    eas: {
      projectId: '6a882883-5561-4b6a-bd2f-05d4b8f8cd3e',
    },
    /** Play Console → Play Games Services → Configuration → Project / App ID */
    playGamesAppId,
  },
};

export default config;
