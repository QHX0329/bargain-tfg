/**
 * [F5-05] Servicio HTTP para el endpoint OCR.
 *
 * POST /api/v1/ocr/scan/  (multipart/form-data)
 * - Request: FormData con campo "image" (imagen JPEG)
 * - Success: { success: true, data: { items: OCRItem[] } }
 * - Error 422: { success: false, error: { code: "OCR_PROCESSING_ERROR", message: "..." } }
 */

import { apiClient } from './client';

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

export const scanImage = (imageUri: string) => {
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'scan.jpg',
  } as any);
  return apiClient.post<OCRScanResponse>('/ocr/scan/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
