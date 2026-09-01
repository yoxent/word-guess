import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GameMode } from './game';

export type RootStackParamList = {
  Home: undefined;
  Game: { mode: GameMode; letterCount?: number; tutorial?: boolean };
  Stats: undefined;
  /** `fromGame: true` hides Account + About (in-game settings only). */
  Settings: { fromGame?: boolean } | undefined;
  Leaderboard: undefined;
};

export type ScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;
