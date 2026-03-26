/**
 * [F5-05] Servicio HTTP para el endpoint del asistente IA.
 *
 * POST /api/v1/assistant/chat/
 * - Request: { messages: ChatMessage[] }
 * - Success: { success: true, data: { role: "assistant", content: string } }
 * - Error 503: { success: false, error: { code: "ASSISTANT_UNAVAILABLE", message: "..." } }
 */

import { apiClient } from './client';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  role: 'assistant';
  content: string;
}

export const sendChatMessage = (messages: ChatMessage[]) =>
  apiClient.post<ChatResponse>('/assistant/chat/', { messages });
