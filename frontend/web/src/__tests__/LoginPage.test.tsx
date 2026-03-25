import { describe, it, expect, vi } from 'vitest';
import axios from 'axios';
import { handleLogin } from '../services/auth';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('handleLogin', () => {
  it('resolves on successful login response', async () => {
    mockedAxios.post = vi.fn().mockResolvedValue({ data: { access: 'token123' } });
    await expect(handleLogin('business_user', 'pass', mockedAxios)).resolves.not.toThrow();
  });

  it('resolves on successful enveloped login response', async () => {
    mockedAxios.post = vi.fn().mockResolvedValue({
      data: { success: true, data: { access: 'token123', refresh: 'refresh123' } },
    });
    await expect(handleLogin('business_user', 'pass', mockedAxios)).resolves.not.toThrow();
  });

  it('throws on 401 response', async () => {
    mockedAxios.post = vi.fn().mockRejectedValue({ response: { status: 401 } });
    await expect(handleLogin('business_user', 'wrongpass', mockedAxios)).rejects.toBeDefined();
  });

  it('calls POST /auth/token/ with username and password', async () => {
    mockedAxios.post = vi.fn().mockResolvedValue({ data: { access: 'tok' } });
    await handleLogin('biz_user', 'secret', mockedAxios).catch(() => {});
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('auth/token/'),
      expect.objectContaining({ username: 'biz_user', password: 'secret' }),
    );
  });
});
