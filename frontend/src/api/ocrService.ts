/**
 * [F5-05] Servicio HTTP para el endpoint OCR.
 *
 * POST /api/v1/ocr/scan/  (multipart/form-data)
 * - Request: FormData con campo "image" (imagen JPEG)
 * - Success: { success: true, data: { items: OCRItem[] } }
 * - Error 422: { success: false, error: { code: "OCR_PROCESSING_ERROR", message: "..." } }
 */

import { apiClient } from "./client";
import { appendImageToFormData } from "@/utils/formDataImage";

export interface OCRItem {
  raw_text: string;
  matched_product_id?: number;
  matched_product_name?: string;
  confidence: number;
  quantity: number;
}

export interface OCRScanResponse {
  items: OCRItem[];
}

export const scanImage = async (imageUri: string) => {
  const formData = new FormData();
  await appendImageToFormData(formData, "image", imageUri, "scan.jpg", "image/jpeg");

  // No fijar "Content-Type: multipart/form-data" a mano: sin el parámetro
  // boundary el backend no puede trocear el body (DRF responde "La
  // información enviada no era un archivo"). `apiClient` fija por defecto
  // "Content-Type: application/json"; hay que anular ese default con
  // `undefined` para que sea el runtime (XHR/fetch en web, puente nativo en
  // iOS/Android) quien genere la cabecera real con su boundary al ver que el
  // body es un FormData. Ver docs/ai-mistakes-log.md ERR-014.
  return apiClient.post<OCRScanResponse>("/ocr/scan/", formData, {
    headers: { "Content-Type": undefined },
  });
};
