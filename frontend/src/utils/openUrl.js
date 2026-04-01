import { Capacitor } from '@capacitor/core';
import { Browser }   from '@capacitor/browser';

/**
 * Abre una URL externamente.
 * - En apps nativas (iOS/Android): usa SFSafariViewController / Chrome Custom Tabs
 * - En el navegador web: usa window.location.href (comportamiento original)
 */
export async function openExternalUrl(url) {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url });
  } else {
    window.location.href = url;
  }
}
