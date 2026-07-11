import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Word Guess',
  slug: 'word-guess',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#f5f5f0',
  },
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
    'expo-sqlite',
    'react-native-iap',
    '@react-native-firebase/app',
    '@react-native-firebase/auth',
    '@react-native-google-signin/google-signin',
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: 'ca-app-pub-3940256099942544~3347511713',
        iosAppId: '',
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          kotlinVersion: '2.3.0',
        },
      },
    ],
    'expo-audio',
    'expo-asset',
    'expo-font',
  ],
  extra: {
    eas: {
      projectId: '6a882883-5561-4b6a-bd2f-05d4b8f8cd3e',
    },
  },
};

export default config;
