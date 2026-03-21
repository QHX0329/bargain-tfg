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
    navigate('/dashboard');

    setLoading(false);
  };

  return (
    <div className="auth-page">
      <section className="auth-story">
        <div>
          <Typography.Text style={{ color: 'rgba(255,255,255,0.78)' }}>
            BarGAIN Business
          </Typography.Text>
          <h1>Impulsa el crecimiento de tu negocio local</h1>
          <p>
            Centraliza precios, promociones y catálogo con una experiencia de gestión
            profesional, diseñada para decisiones rápidas y fiables.
          </p>
        </div>
        <Typography.Text style={{ color: 'rgba(255,255,255,0.72)' }}>
          Inteligencia comercial para comercios y PYMEs
        </Typography.Text>
      </section>

      <section className="auth-content">
        <Card className="auth-card">
          <div style={{ marginBottom: 26 }}>
            <Title level={2} style={{ margin: 0, fontFamily: 'Manrope, sans-serif' }}>
              Acceso business
            </Title>
            <Typography.Text type="secondary">
              Gestiona tu operación diaria desde un único panel.
            </Typography.Text>
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
              rules={[{ required: true, message: 'Introduce tu nombre de usuario' }]}
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
                Entrar al portal
              </Button>
            </Form.Item>
          </Form>

          <div className="auth-trust">
            <div className="auth-trust-item">Seguridad reforzada para datos de negocio</div>
            <div className="auth-trust-item">Privacidad y control de acceso por rol</div>
          </div>
        </Card>
      </section>
    </div>
  );
};

export default LoginPage;
