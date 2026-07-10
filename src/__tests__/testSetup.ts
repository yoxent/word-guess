// Shared test setup for component tests

// Mock react-native-mmkv
jest.mock('react-native-mmkv', () => ({
  createMMKV: jest.fn().mockReturnValue({
    getString: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    getNumber: jest.fn(),
  }),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  return {
    __esModule: true,
    default: {
      View,
      Text: require('react-native').Text,
      createAnimatedComponent: (component: any) => component,
    },
    useSharedValue: (initialValue: any) => ({ value: initialValue }),
    useAnimatedStyle: (styleFunc: any) => styleFunc(),
    withTiming: (value: any) => value,
    withSequence: (...args: any[]) => args[args.length - 1],
    withDelay: (delay: any, animation: any) => animation,
    interpolate: (value: any, inputRange: any, outputRange: any) => outputRange[0],
    interpolateColor: (value: any, inputRange: any, outputRange: any) => outputRange[0],
    Easing: {
      inOut: (easing: any) => easing,
      ease: (t: any) => t,
    },
    runOnJS: (fn: any) => fn,
    runOnUI: (fn: any) => fn,
  };
});

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
}));

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

// Mock @react-navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  useFocusEffect: (callback: any) => {
    callback();
  },
  NavigationContainer: 'NavigationContainer',
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: () => null,
  }),
}));

// Mock storage services
jest.mock('../services/storage', () => ({
  mmkvZustandStorage: {
    getItem: jest.fn().mockReturnValue(null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
  getActiveGame: jest.fn().mockReturnValue(null),
  saveActiveGame: jest.fn(),
  clearActiveGame: jest.fn(),
}));

// Mock sound service
jest.mock('../services/sound', () => ({
  init: jest.fn(),
  playKeyPress: jest.fn(),
  playReveal: jest.fn(),
  playWin: jest.fn(),
  playLoss: jest.fn(),
  setBgmVolume: jest.fn(),
  setSfxVolume: jest.fn(),
}));

// Mock expo-clipboard
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(),
}));

// Mock expo-font
jest.mock('expo-font', () => ({
  loadAsync: jest.fn(),
  isLoaded: jest.fn().mockReturnValue(true),
  useFonts: jest.fn().mockReturnValue([true, null]),
}));

// Mock @expo-google-fonts/nunito
jest.mock('@expo-google-fonts/nunito', () => ({
  Nunito_400Regular: 'Nunito_400Regular',
  Nunito_700Bold: 'Nunito_700Bold',
  Nunito_800ExtraBold: 'Nunito_800ExtraBold',
}));

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn().mockResolvedValue({
    execAsync: jest.fn(),
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    runAsync: jest.fn(),
  }),
}));

// Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock zustand persist middleware
jest.mock('zustand/middleware', () => ({
  persist: (fn: any) => fn,
  createJSONStorage: () => ({
    getItem: jest.fn().mockReturnValue(null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  }),
}));
