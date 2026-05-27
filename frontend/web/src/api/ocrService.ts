/**
 * Servicio OCR — wrapper tipado sobre apiClient.
 * Envía imagen al backend para extracción de ítems de ticket.
 */

import { apiClient } from './client';
import type { OCRItem } from '../types/consumer';

export interface OCRProcessResponse {
  items: OCRItem[];
}

export const ocrService = {
  /**
   * POST /ocr/process/ — procesar imagen de ticket con OCR.
   * Solo se envía el File del input[type=file]; el backend valida MIME y tamaño.
   */
  processImage: (file: File): Promise<OCRProcessResponse> => {
    const formData = new FormData();
    formData.append('image', file);
    return apiClient.post<never, OCRProcessResponse>('/ocr/process/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
