import React from 'react';
import { Form, Input, InputNumber, Button, Card, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { handleLogin } from '../services/auth';
import axios from 'axios';
import { useBusinessStore } from '../store/businessStore';
import type { BusinessProfile } from '../store/businessStore';
import { extractBusinessProfiles } from '../utils/businessProfiles';

const { Title } = Typography;

interface RegisterFormValues {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  business_name: string;
  tax_id: string;
  address: string;
  website: string;
  latitude: number;
  longitude: number;
}

// Centro de Sevilla por defecto para la ubicación de la tienda.
const DEFAULT_LATITUDE = 37.3891;
const DEFAULT_LONGITUDE = -5.9845;

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { setToken, setProfile } = useBusinessStore();
  const [loading, setLoading] = React.useState(false);

  const onFinish = async (values: RegisterFormValues) => {
    setLoading(true);

    try {
      // 1. Registrar usuario con rol business
      await apiClient.post('/auth/register/', {
        username: values.username,
        email: values.email,
        password: values.password,
        password_confirm: values.password_confirm,
        role: 'business',
      });

      // 2. Login automático tras registro
      await handleLogin(values.username, values.password, axios);
      const token = localStorage.getItem('access_token') ?? '';
      setToken(token);

      // 3. Crear perfil de negocio (el backend crea la tienda asociada con estas
      //    coordenadas; si no se indican, usa el centro de Sevilla por defecto).
      await apiClient.post('/business/profiles/', {
        business_name: values.business_name,
        tax_id: values.tax_id,
        address: values.address,
        website: values.website || '',
        latitude: values.latitude ?? DEFAULT_LATITUDE,
        longitude: values.longitude ?? DEFAULT_LONGITUDE,
      });

      // 4. Cargar perfil recién creado
      const profileResponse = await apiClient.get<
        BusinessProfile[] | { results?: BusinessProfile[] }
      >('/business/profiles/');
      const profiles = extractBusinessProfiles(profileResponse.data);

      if (profiles.length > 0) {
        setProfile(profiles[0]);
      }

      void message.success(
        'Registro completado. Un administrador debe validar tu perfil antes de que puedas ' +
          'gestionar precios y promociones.',
      );
      navigate('/dashboard');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string }; detail?: string } } };
      const errorMsg =
        axiosErr.response?.data?.error?.message ||
        axiosErr.response?.data?.detail ||
        'Error al registrar. Revisa los datos e inténtalo de nuevo.';
      void message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-story">
        <div>
          <Typography.Text style={{ color: 'rgba(255,255,255,0.78)' }}>
            BarGAIN Business
          </Typography.Text>
          <h1>Registra tu negocio y empieza a competir con datos</h1>
          <p>
            Crea tu perfil de negocio para gestionar precios, promociones y alcanzar a clientes
            cercanos con inteligencia comercial.
          </p>
        </div>
        <Typography.Text style={{ color: 'rgba(255,255,255,0.72)' }}>
          Registro de comercios y PYMEs
        </Typography.Text>
      </section>

      <section className="auth-content">
        <Card className="auth-card" style={{ width: 'min(520px, 94%)' }}>
          <div style={{ marginBottom: 22 }}>
            <Title level={2} style={{ margin: 0, fontFamily: 'Manrope, sans-serif' }}>
              Crear cuenta business
            </Title>
            <Typography.Text type="secondary">
              Completa tus datos para activar el portal de gestión.
            </Typography.Text>
          </div>

          <Form<RegisterFormValues>
            name="register"
            layout="vertical"
            onFinish={onFinish}
            autoComplete="off"
            initialValues={{
              latitude: DEFAULT_LATITUDE,
              longitude: DEFAULT_LONGITUDE,
            }}
          >
            <Typography.Text strong style={{ display: 'block', marginBottom: 12 }}>
              Datos de acceso
            </Typography.Text>

            <Form.Item
              label="Nombre de usuario"
              name="username"
              rules={[{ required: true, message: 'Introduce un nombre de usuario' }]}
            >
              <Input placeholder="mi_negocio" size="large" />
            </Form.Item>

            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Introduce tu email' },
                { type: 'email', message: 'Email no válido' },
              ]}
            >
              <Input placeholder="contacto@minegocio.es" size="large" />
            </Form.Item>

            <Form.Item
              label="Contraseña"
              name="password"
              rules={[
                { required: true, message: 'Introduce una contraseña' },
                { min: 8, message: 'Mínimo 8 caracteres' },
              ]}
            >
              <Input.Password placeholder="Contraseña segura" size="large" />
            </Form.Item>

            <Form.Item
              label="Confirmar contraseña"
              name="password_confirm"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Confirma tu contraseña' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Las contraseñas no coinciden'));
                  },
                }),
              ]}
            >
              <Input.Password placeholder="Repite la contraseña" size="large" />
            </Form.Item>

            <Typography.Text strong style={{ display: 'block', marginTop: 8, marginBottom: 12 }}>
              Datos del negocio
            </Typography.Text>

            <Form.Item
              label="Nombre del negocio"
              name="business_name"
              rules={[{ required: true, message: 'Nombre comercial obligatorio' }]}
            >
              <Input placeholder="Frutas García" size="large" />
            </Form.Item>

            <Form.Item
              label="CIF / NIF"
              name="tax_id"
              rules={[{ required: true, message: 'CIF o NIF obligatorio' }]}
            >
              <Input placeholder="B12345678" size="large" />
            </Form.Item>

            <Form.Item
              label="Dirección"
              name="address"
              rules={[{ required: true, message: 'Dirección del negocio obligatoria' }]}
            >
              <Input.TextArea rows={2} placeholder="Calle Ejemplo 12, 41001 Sevilla" />
            </Form.Item>

            <Form.Item label="Web (opcional)" name="website">
              <Input placeholder="https://www.minegocio.es" size="large" />
            </Form.Item>

            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
              Ubicación de tu tienda (coordenadas). Puedes obtenerlas en Google Maps; por defecto
              se usa el centro de Sevilla.
            </Typography.Text>

            <div style={{ display: 'flex', gap: 12 }}>
              <Form.Item
                label="Latitud"
                name="latitude"
                style={{ flex: 1 }}
                rules={[{ required: true, message: 'Latitud obligatoria' }]}
              >
                <InputNumber
                  size="large"
                  style={{ width: '100%' }}
                  step={0.0001}
                  min={-90}
                  max={90}
                  placeholder="37.3891"
                />
              </Form.Item>

              <Form.Item
                label="Longitud"
                name="longitude"
                style={{ flex: 1 }}
                rules={[{ required: true, message: 'Longitud obligatoria' }]}
              >
                <InputNumber
                  size="large"
                  style={{ width: '100%' }}
                  step={0.0001}
                  min={-180}
                  max={180}
                  placeholder="-5.9845"
                />
              </Form.Item>
            </div>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={loading}
                style={{ width: '100%' }}
              >
                Crear cuenta y perfil
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Typography.Text type="secondary">
              ¿Ya tienes cuenta?{' '}
              <Typography.Link onClick={() => navigate('/login')}>
                Inicia sesión
              </Typography.Link>
            </Typography.Text>
          </div>
        </Card>
      </section>
    </div>
  );
};

export default RegisterPage;
