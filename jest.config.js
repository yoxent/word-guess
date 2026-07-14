/** @type {import('jest').Config} */
module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./src/__tests__/testSetup.ts'],
  testMatch: [
    '**/__tests__/**/*.(test|spec).(ts|tsx|js|jsx)',
    '**/*.(test|spec).(ts|tsx|js|jsx)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/src/__tests__/testSetup\\.ts$',
    '/src/__tests__/fileMock\\.js$',
    '/src/__tests__/mocks/',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|react-native-reanimated|react-native-gesture-handler|react-native-mmkv|react-native-screens|react-native-safe-area-context|react-native-worklets|react-native-nitro-modules|zustand|expo-sqlite|expo-audio|expo-haptics|expo-clipboard|expo-font|expo-linear-gradient)'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(wav)$': '<rootDir>/src/__tests__/fileMock.js',
    '^../../modules/play-games-auth$':
      '<rootDir>/src/__tests__/mocks/playGamesAuthMock.js',
    '^.*modules/play-games-auth$':
      '<rootDir>/src/__tests__/mocks/playGamesAuthMock.js',
  },

  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**',
    '!src/constants/**'
  ]
};
