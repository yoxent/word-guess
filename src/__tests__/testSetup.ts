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
    withRepeat: (animation: any) => animation,
    withDelay: (delay: any, animation: any) => animation,
    interpolate: (value: any, inputRange: any, outputRange: any) => outputRange[0],
    interpolateColor: (value: any, inputRange: any, outputRange: any) => outputRange[0],
    Easing: {
      inOut: (easing: any) => easing,
      ease: (t: any) => t,
    },
    runOnJS: (fn: any) => fn,
    runOnUI: (fn: any) => fn,
    cancelAnimation: jest.fn(),
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
  toActiveGameSlot: (mode: string, letterCount: number, hardMode: boolean) => ({
    mode,
    letterCount,
    hardMode,
  }),
  activeGameSlotFromSession: (session: {
    mode: string;
    letterCount: number;
    hardMode: boolean;
  }) => ({
    mode: session.mode,
    letterCount: session.letterCount,
    hardMode: session.hardMode,
  }),
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

// Mock active Google font packages used by src/utils/fonts.ts
jest.mock('@expo-google-fonts/fraunces', () => ({
  Fraunces_700Bold: 'Fraunces_700Bold',
  Fraunces_800ExtraBold: 'Fraunces_800ExtraBold',
}));

jest.mock('@expo-google-fonts/dm-sans', () => ({
  DMSans_400Regular: 'DMSans_400Regular',
  DMSans_500Medium: 'DMSans_500Medium',
  DMSans_600SemiBold: 'DMSans_600SemiBold',
  DMSans_700Bold: 'DMSans_700Bold',
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

jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => jest.fn()),
}));

// LAUNCH-07 markers fire in __DEV__; keep unit output quiet.
jest.spyOn(console, 'time').mockImplementation(() => {});
jest.spyOn(console, 'timeEnd').mockImplementation(() => {});

// Mock zustand persist middleware
jest.mock('zustand/middleware', () => ({
  persist: (fn: any) => fn,
  createJSONStorage: () => ({
    getItem: jest.fn().mockReturnValue(null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  }),
}));

jest.mock('unity-levelplay-mediation', () => {
  class FakeAd {
    adUnitId: string;
    listener: unknown = null;
    removed = false;
    ready = false;
    showError: Error | null = null;
    constructor(adUnitId: string) {
      this.adUnitId = adUnitId;
    }
    setListener(listener: unknown) {
      this.listener = listener;
    }
    loadAd() {
      return Promise.resolve();
    }
    showAd() {
      if (this.showError) return Promise.reject(this.showError);
      return Promise.resolve();
    }
    isAdReady() {
      return Promise.resolve(this.ready);
    }
    remove() {
      this.removed = true;
      return Promise.resolve();
    }
  }

  const mockRewardedAds: FakeAd[] = [];
  const mockInterstitialAds: FakeAd[] = [];
  class FakeRewardedAd extends FakeAd {
    constructor(adUnitId: string) {
      super(adUnitId);
      mockRewardedAds.push(this);
    }
  }
  class FakeInterstitialAd extends FakeAd {
    constructor(adUnitId: string) {
      super(adUnitId);
      mockInterstitialAds.push(this);
    }
  }

  return {
    LevelPlay: {
      init: jest.fn(async (_request: unknown, listener?: { onInitSuccess?: (config: unknown) => void }) => {
        listener?.onInitSuccess?.({});
      }),
      setAdaptersDebug: jest.fn().mockResolvedValue(undefined),
      setMetaData: jest.fn().mockResolvedValue(undefined),
      validateIntegration: jest.fn().mockResolvedValue(undefined),
    },
    LevelPlayInitRequest: {
      builder: (appKey: string) => ({
        withUserId() {
          return this;
        },
        build: () => ({ appKey, userId: null }),
      }),
    },
    LevelPlayInterstitialAd: FakeInterstitialAd,
    LevelPlayRewardedAd: FakeRewardedAd,
    LevelPlayPrivacySettings: {
      setCOPPA: jest.fn().mockResolvedValue(undefined),
      setCCPA: jest.fn().mockResolvedValue(undefined),
      setGDPRConsents: jest.fn().mockResolvedValue(undefined),
    },
    __testRewardedAds: mockRewardedAds,
    __testInterstitialAds: mockInterstitialAds,
    __resetTestRewardedAds: () => {
      mockRewardedAds.length = 0;
      mockInterstitialAds.length = 0;
    },
  };
});
