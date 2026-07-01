/**
 * Helper para adjuntar una imagen local (URI de expo-image-picker/cámara) a
 * un `FormData` de forma correcta en todas las plataformas.
 *
 * - iOS/Android: el puente nativo de React Native entiende el shape
 *   `{ uri, name, type }` y arma la parte multipart leyendo el fichero desde
 *   disco sin cargarlo en memoria JS. Es el patrón estándar de RN.
 * - Web (Expo Web / react-native-web): `uri` es una URL propia del
 *   navegador (`blob:` o `data:`) generada por el selector de archivos. El
 *   `FormData` real del navegador NO entiende el shape `{ uri, name, type }`
 *   — lo serializa como el texto literal "[object Object]" en un campo de
 *   texto normal en lugar de como fichero. El backend (DRF `FileField`)
 *   recibe entonces un string sin `.name`/`.size` y falla con "La
 *   información enviada no era un archivo. Compruebe el tipo de codificación
 *   del formulario.". Ver docs/ai-mistakes-log.md ERR-015.
 *
 * Por eso en web hay que materializar un `Blob` real con `fetch(uri)` antes
 * de añadirlo al FormData.
 */

import { Platform } from "react-native";

export async function appendImageToFormData(
  formData: FormData,
  fieldName: string,
  uri: string,
  fileName: string,
  mimeType: string,
): Promise<void> {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();
    formData.append(fieldName, blob, fileName);
  } else {
    formData.append(fieldName, {
      uri,
      name: fileName,
      type: mimeType,
    } as any);
  }
}
