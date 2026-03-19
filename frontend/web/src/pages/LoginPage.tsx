import React from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { apiClient } from '../api/client';
import { handleLogin } from '../services/auth';
import { useBusinessStore } from '../store/businessStore';
import type { BusinessProfile } from '../store/businessStore';
import { extractBusinessProfiles } from '../utils/businessProfiles';

const { Title } = Typography;

interface LoginFormValues {
  username: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setToken, setProfile } = useBusinessStore();
  const [loading, setLoading] = React.useState(false);

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);

    try {
      await handleLogin(values.username, values.password, axios);
    } catch {
      void message.error('Credenciales incorrectas. Revisa usuario y contraseña.');
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('access_token') ?? '';
    setToken(token);

    let profiles: BusinessProfile[] = [];
    try {
      const profileResponse = await apiClient.get<BusinessProfile[] | { results?: BusinessProfile[] }>(
        '/business/profiles/',
      );
      profiles = extractBusinessProfiles(profileResponse.data);
    } catch {
      void message.error('Inicio de sesión correcto, pero no se pudo cargar tu perfil de negocio.');
      setLoading(false);
      return;
    }

    if (profiles.length === 0) {
      void message.warning('Inicio de sesión correcto, pero tu cuenta no tiene perfil de negocio asociado.');
      setLoading(false);
      return;
    }

    setProfile(profiles[0]);
    navigate('/');

    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f2f5',
      }}
    >
      <Card style={{ width: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ margin: 0 }}>
            BarGAIN Business
          </Title>
          <Typography.Text type="secondary">Portal de gestión para empresas PYME</Typography.Text>
        </div>
        <Form<LoginFormValues>
          name="login"
          layout="vertical"
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item
            label="Nombre de usuario"
            name="username"
            rules={[
              { required: true, message: 'Introduce tu nombre de usuario' },
            ]}
          >
            <Input placeholder="empresa_pyme" size="large" />
          </Form.Item>

          <Form.Item
            label="Contraseña"
            name="password"
            rules={[{ required: true, message: 'Introduce tu contraseña' }]}
          >
            <Input.Password placeholder="Contraseña" size="large" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading}
              style={{ width: '100%' }}
            >
              Iniciar sesión
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default LoginPage;
