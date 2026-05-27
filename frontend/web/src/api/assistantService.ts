/**
 * Servicio del asistente LLM — wrapper tipado sobre apiClient.
 */

import { apiClient } from './client';
import type { ChatMessage } from '../types/consumer';

export interface ChatResponse {
  role: 'assistant';
  content: string;
}

export const assistantService = {
  /** POST /assistant/chat/ — enviar mensajes al asistente */
  chat: (messages: ChatMessage[]): Promise<ChatResponse> =>
    apiClient.post<never, ChatResponse>('/assistant/chat/', { messages }),
};
