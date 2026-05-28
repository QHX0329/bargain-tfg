import React, { useState } from 'react';
import { Button, Form, Input, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../../api/client';

interface PasswordFormValues {
  current_password: string;
  new_password: string;
  new_password_confirm: string;
}

const ChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<PasswordFormValues>();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: PasswordFormValues) => {
    setSubmitting(true);
    try {
      await apiClient.post('/auth/change-password/', {
        current_password: values.current_password,
        new_password: values.new_password,
        new_password_confirm: values.new_password_confirm,
      });
      message.success('Contraseña cambiada correctamente');
      form.resetFields();
    } catch {
      message.error('Contraseña actual incorrecta o datos inválidos');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 480 }}>
      <Typography.Title level={3}>Cambiar Contraseña</Typography.Title>
      <Button onClick={() => navigate('/app/profile')} style={{ marginBottom: 24 }}>
        ← Volver
      </Button>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="current_password"
          label="Contraseña actual"
          rules={[{ required: true }]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item
          name="new_password"
          label="Nueva contraseña"
          rules={[{ required: true }, { min: 8, message: 'Mínimo 8 caracteres' }]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item
          name="new_password_confirm"
          label="Confirmar nueva contraseña"
          dependencies={['new_password']}
          rules={[
            { required: true },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('new_password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Las contraseñas no coinciden'));
              },
            }),
          ]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting}>
            Cambiar contraseña
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default ChangePasswordPage;
