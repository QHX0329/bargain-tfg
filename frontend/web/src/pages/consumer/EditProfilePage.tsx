import React, { useEffect, useState } from 'react';
import { Button, Form, Input, Spin, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../../api/client';
import type { UserProfile } from '../../../types/consumer';

const EditProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiClient
      .get<never, UserProfile>('/users/profile/')
      .then((p) => {
        form.setFieldsValue({
          first_name: p.first_name,
          last_name: p.last_name,
          email: p.email,
        });
      })
      .catch(() => message.error('No se pudo cargar el perfil'))
      .finally(() => setLoading(false));
  }, [form]);

  const handleSubmit = async (values: { first_name: string; last_name: string; email: string }) => {
    setSubmitting(true);
    try {
      await apiClient.patch('/users/profile/', values);
      message.success('Perfil actualizado');
      navigate('/app/profile');
    } catch {
      message.error('No se pudo actualizar el perfil');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spin />;

  return (
    <div style={{ maxWidth: 480 }}>
      <Typography.Title level={3}>Editar Perfil</Typography.Title>
      <Button onClick={() => navigate('/app/profile')} style={{ marginBottom: 24 }}>
        ← Volver
      </Button>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item name="first_name" label="Nombre" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="last_name" label="Apellido(s)" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item
          name="email"
          label="Email"
          rules={[{ required: true }, { type: 'email', message: 'Email inválido' }]}
        >
          <Input type="email" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting}>
            Guardar cambios
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default EditProfilePage;
