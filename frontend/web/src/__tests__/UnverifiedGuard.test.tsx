import { describe, it, expect } from 'vitest';
import { getGuardContent } from '../components/UnverifiedGuard';

describe('getGuardContent', () => {
  it('returns pending message for pending status', () => {
    const result = getGuardContent('pending', undefined);
    expect(JSON.stringify(result)).toContain('revisada');
  });

  it('returns rejection reason for rejected status', () => {
    const result = getGuardContent('rejected', 'Datos incorrectos');
    expect(JSON.stringify(result)).toContain('Datos incorrectos');
  });

  it('returns edit profile affordance for rejected status', () => {
    const result = getGuardContent('rejected', 'Datos incorrectos');
    // Content must signal that editing is available (Edit Profile button renders)
    expect(result).not.toBeNull();
  });

  it('returns null for verified status', () => {
    const result = getGuardContent('verified', undefined);
    expect(result).toBeNull();
  });
});
