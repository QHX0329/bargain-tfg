import React, { useEffect, useState } from 'react';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Form,
  Input,
  InputNumber,
  Space,
  Typography,
  Spin,
  Alert,
  message,
} from 'antd';
import { EditOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import { apiClient } from '../api/client';
import { useBusinessStore } from '../store/businessStore';
import type { BusinessProfile } from '../store/businessStore';
import { extractBusinessProfiles } from '../utils/businessProfiles';
import { getErrorMessage } from '../utils/errorMessage';

const { Title } = Typography;

interface ProfileFormValues {
  business_name: string;
  address: string;
  website?: string;
  price_alert_threshold_pct?: number;
}

const verificationStatusTag = (status: string) => {
  switch (status) {
    case 'verified':
      return <Tag color="green">Verificado</Tag>;
    case 'pending':
      return <Tag color="orange">Pendiente</Tag>;
    case 'rejected':
      return <Tag color="red">Rechazado</Tag>;
    default:
      return <Tag>{status}</Tag>;
  }
};

const BusinessProfilePage: React.FC = () => {
  const { profile, setProfile } = useBusinessStore();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(!profile);
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm<ProfileFormValues>();

  useEffect(() => {
    if (!profile) {
      const fetchProfile = async () => {
        setFetchLoading(true);
        try {
          const res = await apiClient.get<BusinessProfile[] | { results?: BusinessProfile[] }>(
            '/business/profiles/',
          );
          const profiles = extractBusinessProfiles(res.data);
          if (profiles.length > 0) {
            setProfile(profiles[0]);
          }
        } catch (err) {
          setError(getErrorMessage(err, 'No se pudo cargar el perfil de tu negocio. Inténtalo de nuevo.'));
        } finally {
          setFetchLoading(false);
        }
      };
      void fetchProfile();
    }
  }, [profile, setProfile]);

  const startEditing = () => {
    if (profile) {
      form.setFieldsValue({
        business_name: profile.business_name,
        address: profile.address,
        website: profile.website,
        price_alert_threshold_pct: profile.price_alert_threshold_pct,
      });
    }
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    form.resetFields();
  };

  const onFinish = async (values: ProfileFormValues) => {
    if (!profile) return;
    setLoading(true);
    try {
      const res = await apiClient.patch<BusinessProfile>(`/business/profiles/${profile.id}/`, {
        business_name: values.business_name,
        address: values.address,
        website: values.website ?? '',
      });
      setProfile(res.data);
      setEditing(false);
      void message.success('Perfil actualizado correctamente');
    } catch (err) {
      void message.error(getErrorMessage(err, 'No se pudo actualizar el perfil. Revisa los datos e inténtalo de nuevo.'));
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return <Alert type="error" message={error} />;
  }

  if (!profile) {
    return <Alert type="warning" message="No se encontró perfil de negocio" />;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Perfil del negocio
          </Title>
          <Typography.Text type="secondary">
            Mantén actualizada la identidad y datos clave de tu comercio.
          </Typography.Text>
        </div>
        {!editing && (
          <Button type="primary" icon={<EditOutlined />} onClick={startEditing}>
            Editar
          </Button>
        )}
      </div>

      {!editing ? (
        <Card className="surface-card">
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Nombre del negocio">
              {profile.business_name}
            </Descriptions.Item>
            <Descriptions.Item label="CIF / NIF">{profile.tax_id}</Descriptions.Item>
            <Descriptions.Item label="Dirección">{profile.address}</Descriptions.Item>
            <Descriptions.Item label="Sitio web">
              {profile.website ? (
                <a href={profile.website} target="_blank" rel="noopener noreferrer">
                  {profile.website}
                </a>
              ) : (
                '—'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Estado de verificación">
              {verificationStatusTag(profile.verification_status)}
            </Descriptions.Item>
            {profile.verification_status === 'rejected' && profile.rejection_reason && (
              <Descriptions.Item label="Motivo del rechazo">
                <Alert type="error" message={profile.rejection_reason} />
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Umbral de alerta de precio (%)">
              {profile.price_alert_threshold_pct}%
            </Descriptions.Item>
          </Descriptions>
        </Card>
      ) : (
        <Card className="surface-card">
          <Form<ProfileFormValues> form={form} layout="vertical" onFinish={onFinish}>
            <Form.Item
              name="business_name"
              label="Nombre del negocio"
              rules={[{ required: true, message: 'El nombre del negocio es obligatorio' }]}
            >
              <Input />
            </Form.Item>

            <Form.Item label="CIF / NIF">
              <Input value={profile.tax_id} disabled />
            </Form.Item>

            <Form.Item
              name="address"
              label="Dirección"
              rules={[{ required: true, message: 'La dirección es obligatoria' }]}
            >
              <Input />
            </Form.Item>

            <Form.Item name="website" label="Sitio web (opcional)">
              <Input placeholder="https://..." />
            </Form.Item>

            <Form.Item
              name="price_alert_threshold_pct"
              label="Umbral de alerta de precio (%)"
              tooltip="Porcentaje mínimo de diferencia con competidores para recibir alertas."
              rules={[{ type: 'number', min: 1, max: 100, message: 'Debe estar entre 1 y 100' }]}
            >
              <InputNumber min={1} max={100} addonAfter="%" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={loading}
                >
                  Guardar cambios
                </Button>
                <Button icon={<CloseOutlined />} onClick={cancelEditing}>
                  Cancelar
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      )}
    </div>
  );
};

export default BusinessProfilePage;
