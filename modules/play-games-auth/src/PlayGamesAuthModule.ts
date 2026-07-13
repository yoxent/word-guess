import { NativeModule, requireNativeModule } from 'expo';
import type { PlayGamesFirebaseUser } from './PlayGamesAuth.types';

declare class PlayGamesAuthModule extends NativeModule {
  isAuthenticated(): Promise<boolean>;
  signInWithFirebase(
    webClientId: string,
    interactive: boolean,
  ): Promise<PlayGamesFirebaseUser>;
  signOutFirebase(): Promise<void>;
}

export default requireNativeModule<PlayGamesAuthModule>('PlayGamesAuth');
