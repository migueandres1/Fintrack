import { Capacitor }                          from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

/**
 * Abre la cámara o galería nativa para capturar un recibo.
 * - En apps nativas (iOS/Android): usa el plugin @capacitor/camera con permisos reales
 * - En el navegador web: devuelve null (el caller usa el <input type="file"> normal)
 *
 * @returns {Promise<File|null>}
 */
export async function captureReceiptPhoto() {
  if (!Capacitor.isNativePlatform()) return null;

  try {
    const photo = await Camera.getPhoto({
      quality:            85,
      allowEditing:       false,
      resultType:         CameraResultType.DataUrl,
      source:             CameraSource.Prompt,  // el usuario elige cámara o galería
      correctOrientation: true,
    });

    const res  = await fetch(photo.dataUrl);
    const blob = await res.blob();
    return new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
  } catch (err) {
    // El usuario canceló — no es un error
    const msg = err?.message || '';
    if (msg.includes('cancel') || msg.includes('dismiss') || msg.includes('denied')) return null;
    console.error('Camera error:', err);
    return null;
  }
}
