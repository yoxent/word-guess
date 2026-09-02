import { initializeApp, getApps } from 'firebase-admin/app';
import { onCall } from 'firebase-functions/v2/https';
import { handleVerifyProPurchase } from './handleVerifyProPurchase';

if (getApps().length === 0) {
  initializeApp();
}

export const verifyProPurchase = onCall(
  {
    region: 'us-central1',
    cors: true,
    // Callable auth is in the Firebase protocol, not Cloud IAM.
    invoker: 'public',
  },
  (request) => handleVerifyProPurchase(request),
);
