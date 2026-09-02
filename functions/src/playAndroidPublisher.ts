import { google } from 'googleapis';
import type { PlayProductLookup } from './verifyProPurchase';

export const getPlayProduct: PlayProductLookup = async ({
  packageName,
  productId,
  token,
}) => {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  const androidpublisher = google.androidpublisher({ version: 'v3', auth });
  const { data } = await androidpublisher.purchases.products.get({
    packageName,
    productId,
    token,
  });
  return { purchaseState: data.purchaseState };
};
