import axios from 'axios';
import { API_BASE_URL } from '../api/client';

/**
 * Pure async function — handles login logic independently of React rendering.
 * Accepts an axiosInstance for testability.
 * Throws on error.
 */
export async function handleLogin(
  username: string,
  password: string,
  axiosInstance: Pick<typeof axios, 'post'>,
): Promise<void> {
  const response = await axiosInstance.post(`${API_BASE_URL}/auth/token/`, {
    username,
    password,
  });

  const payload = response.data as {
    access?: string;
    refresh?: string;
    success?: boolean;
    data?: {
      access?: string;
      refresh?: string;
    };
  };

  const tokenData = payload.data ?? payload;
  const accessToken = tokenData.access;

  if (!accessToken) {
    throw new Error('No access token in response');
  }

  localStorage.setItem('access_token', accessToken);
  if (tokenData.refresh) {
    localStorage.setItem('refresh_token', tokenData.refresh);
  }
}
