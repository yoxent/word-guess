import { getFirestore } from 'firebase-admin/firestore';
import type { EntitlementRecord } from './verifyProPurchase';

export async function saveEntitlement(
  uid: string,
  record: EntitlementRecord,
): Promise<void> {
  await getFirestore().doc(`entitlements/${uid}`).set(record);
}
