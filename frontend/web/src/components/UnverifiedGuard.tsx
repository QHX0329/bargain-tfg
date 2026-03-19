import React from 'react';
import { Button, Result, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useBusinessStore } from '../store/businessStore';
import type { BusinessProfile } from '../store/businessStore';
import { extractBusinessProfiles } from '../utils/businessProfiles';
import { getGuardContent } from '../utils/unverifiedGuardContent';

interface UnverifiedGuardProps {
  children: React.ReactNode;
}

/**
 * Route guard that blocks access for unverified (pending/rejected) businesses.
 * Renders a status screen for pending and rejected, passes through for verified.
 */
const UnverifiedGuard: React.FC<UnverifiedGuardProps> = ({ children }) => {
  const { profile, setProfile, logout } = useBusinessStore();
  const navigate = useNavigate();
  const [hydrating, setHydrating] = React.useState(profile === null);
  const [hydrateError, setHydrateError] = React.useState<string | null>(null);

  const hydrateProfile = React.useCallback(async () => {
    if (profile !== null) {
      setHydrating(false);
      setHydrateError(null);
      return;
    }

    setHydrating(true);
    setHydrateError(null);
    try {
      const res = await apiClient.get<BusinessProfile[] | { results?: BusinessProfile[] }>(
        '/business/profiles/',
      );
      const profiles = extractBusinessProfiles(res.data);
      if (profiles.length > 0) {
        setProfile(profiles[0]);
      } else {
        setHydrateError('No se encontró un perfil de negocio para esta cuenta.');
      }
    } catch {
      setHydrateError('No se pudo cargar tu perfil de negocio.');
    } finally {
      setHydrating(false);
    }
  }, [profile, setProfile]);

  React.useEffect(() => {
    void hydrateProfile();
  }, [hydrateProfile]);

  if (profile === null) {
    if (hydrating) {
      return (
        <div
          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}
        >
          <Spin size="large" />
        </div>
      );
    }

    if (hydrateError) {
      return (
        <div
          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}
        >
          <Result
            status="error"
            title="No se pudo iniciar el portal"
            subTitle={hydrateError}
            extra={[
              <Button key="retry" type="primary" onClick={() => void hydrateProfile()}>
                Reintentar
              </Button>,
              <Button
                key="logout"
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
              >
                Volver al login
              </Button>,
            ]}
          />
        </div>
      );
    }

    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}
      >
        <Spin size="large" />
      </div>
    );
  }

  const content = getGuardContent(profile.verification_status, profile.rejection_reason);

  if (content !== null) {
    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}
      >
        {profile.verification_status === 'rejected' ? (
          <Result
            status="error"
            title="Solicitud rechazada"
            subTitle={
              profile.rejection_reason
                ? `Motivo del rechazo: ${profile.rejection_reason}`
                : 'Tu solicitud ha sido rechazada.'
            }
            extra={
              <Button type="primary" onClick={() => navigate('/profile')}>
                Editar perfil
              </Button>
            }
          />
        ) : (
          content
        )}
      </div>
    );
  }

  return <>{children}</>;
};

export default UnverifiedGuard;
