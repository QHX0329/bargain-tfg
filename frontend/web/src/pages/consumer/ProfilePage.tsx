import React, { useEffect, useState } from 'react';
import { Button, Descriptions, Spin, Typography, Space, message } from 'antd';
import {
  EditOutlined,
  LockOutlined,
  SettingOutlined,
  BellOutlined,
  AlertOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../../api/client';
import { useConsumerAuthStore } from '../../../store/consumer/consumerAuthStore';
import type { UserProfile } from '../../../types/consumer';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { setProfile } = useConsumerAuthStore();
  const [profile, setLocalProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<never, UserProfile>('/users/profile/')
      .then((p) => {
        setLocalProfile(p);
        setProfile(p);
      })
      .catch(() => message.error('No se pudo cargar el perfil'))
      .finally(() => setLoading(false));
  }, [setProfile]);

  if (loading) return <Spin />;

  return (
    <div>
      <Typography.Title level={3}>Mi Perfil</Typography.Title>

      {profile && (
        <Descriptions column={1} bordered>
          <Descriptions.Item label="Usuario">{profile.username}</Descriptions.Item>
          <Descriptions.Item label="Email">{profile.email}</Descriptions.Item>
          <Descriptions.Item label="Nombre">
            {profile.first_name} {profile.last_name}
          </Descriptions.Item>
          <Descriptions.Item label="Radio de búsqueda">
            {profile.max_search_radius_km} km
          </Descriptions.Item>
          <Descriptions.Item label="Máx. paradas">{profile.max_stops}</Descriptions.Item>
        </Descriptions>
      )}

      <Space wrap style={{ marginTop: 24 }}>
        <Button icon={<EditOutlined />} onClick={() => navigate('/app/profile/edit')}>
          Editar perfil
        </Button>
        <Button icon={<LockOutlined />} onClick={() => navigate('/app/profile/password')}>
          Cambiar contraseña
        </Button>
        <Button icon={<SettingOutlined />} onClick={() => navigate('/app/profile/optimizer')}>
          Configurar optimizador
        </Button>
        <Button icon={<BellOutlined />} onClick={() => navigate('/app/notifications')}>
          Notificaciones
        </Button>
        <Button icon={<AlertOutlined />} onClick={() => navigate('/app/alerts')}>
          Alertas de precio
        </Button>
      </Space>
    </div>
  );
};

export default ProfilePage;
