import React from 'react';
import { Button, Result } from 'antd';

type VerificationStatus = 'pending' | 'verified' | 'rejected';

/**
 * Returns guard UI content for a business verification status.
 * Returns null when access should be granted.
 */
export function getGuardContent(
  status: VerificationStatus | undefined,
  rejectionReason: string | undefined,
): React.ReactNode {
  if (status === 'verified') {
    return null;
  }

  if (status === 'pending') {
    return (
      <Result
        status="warning"
        title="Solicitud en revisión"
        subTitle="Tu solicitud está siendo revisada. Te notificaremos cuando sea aprobada."
      />
    );
  }

  if (status === 'rejected') {
    return (
      <Result
        status="error"
        title="Solicitud rechazada"
        subTitle={
          rejectionReason
            ? `Motivo del rechazo: ${rejectionReason}`
            : 'Tu solicitud ha sido rechazada.'
        }
        extra={
          <Button type="primary" href="/profile">
            Editar perfil
          </Button>
        }
      />
    );
  }

  return null;
}
