import type { ExpoConfig } from 'expo/config';

const DEFAULT_PLAY_GAMES_APP_ID = '765565366850';

const playGamesAppId =
  process.env.PLAY_GAMES_APP_ID ??
  process.env.EXPO_PUBLIC_PLAY_GAMES_APP_ID ??
  DEFAULT_PLAY_GAMES_APP_ID;

const config: ExpoConfig = {
  name: 'Word Guess',
  slug: 'word-guess',
  version: '1.0.0',
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
      backgroundColor: '#f5f5f0',
    },
    package: 'com.vorithstudio.wordguess',
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
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
      'react-native-google-mobile-ads',
      {
        androidAppId: 'ca-app-pub-4297882562709937~6535839946',
        iosAppId: '',
      },
    ],
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
            '-keep class com.google.android.gms.ads.** { *; }',
          ].join('\n'),
        },
      },
    ],
    'expo-audio',
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
