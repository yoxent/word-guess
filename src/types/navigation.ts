import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GameMode } from './game';

export type RootStackParamList = {
  Home: undefined;
  Game: { mode: GameMode; letterCount?: number };
  Result: { sessionId: string };
  Stats: undefined;
  Settings: undefined;
  Leaderboard: undefined;
};

export type ScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;
