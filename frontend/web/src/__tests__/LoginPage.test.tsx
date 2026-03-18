import { describe, it, expect, vi } from 'vitest';
import axios from 'axios';
import { handleLogin } from '../pages/LoginPage';

vi.mock('axios');
const mockedAxios = axios as vi.Mocked<typeof axios>;

describe('handleLogin', () => {
  it('resolves on successful login response', async () => {
    mockedAxios.post = vi.fn().mockResolvedValue({ data: { access: 'token123' } });
    await expect(handleLogin('user@test.com', 'pass', mockedAxios)).resolves.not.toThrow();
  });

  it('throws on 401 response', async () => {
    mockedAxios.post = vi.fn().mockRejectedValue({ response: { status: 401 } });
    await expect(handleLogin('user@test.com', 'wrongpass', mockedAxios)).rejects.toBeDefined();
  });

  it('calls POST /auth/token/ with email and password', async () => {
    mockedAxios.post = vi.fn().mockResolvedValue({ data: { access: 'tok' } });
    await handleLogin('biz@example.com', 'secret', mockedAxios).catch(() => {});
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('auth/token/'),
      expect.objectContaining({ username: 'biz@example.com', password: 'secret' }),
    );
  });
});
