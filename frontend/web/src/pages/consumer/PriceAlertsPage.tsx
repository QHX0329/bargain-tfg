import React, { useEffect, useState } from 'react';
import {
  Button,
  Empty,
  Form,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { priceService } from '../../../api/priceService';
import type { PriceAlert } from '../../../types/consumer';

interface AlertFormValues {
  product: number;
  target_price: number;
}

const PriceAlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<AlertFormValues>();

  useEffect(() => {
    priceService
      .getAlerts()
      .then(setAlerts)
      .catch(() => message.error('No se pudieron cargar las alertas'))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (values: AlertFormValues) => {
    setSubmitting(true);
    try {
      const alert = await priceService.createAlert({
        product: values.product,
        target_price: values.target_price,
      });
      setAlerts((prev) => [alert, ...prev]);
      setCreating(false);
      form.resetFields();
      message.success('Alerta creada');
    } catch {
      message.error('No se pudo crear la alerta');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await priceService.deleteAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      message.error('No se pudo eliminar la alerta');
    }
  };

  if (loading) return <Spin />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Alertas de Precio
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>
          Nueva alerta
        </Button>
      </div>

      {alerts.length === 0 ? (
        <Empty description="No tienes alertas configuradas" />
      ) : (
        <List
          dataSource={alerts}
          renderItem={(alert) => (
            <List.Item
              key={alert.id}
              actions={[
                <Popconfirm
                  key="delete"
                  title="¿Eliminar esta alerta?"
                  onConfirm={() => handleDelete(alert.id)}
                >
                  <Button type="text" danger size="small">
                    Eliminar
                  </Button>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                title={
                  typeof alert.product === 'object'
                    ? alert.product.name
                    : (alert.product_name ?? `Producto #${alert.product}`)
                }
                description={
                  <>
                    <span>Precio objetivo: €{Number(alert.target_price).toFixed(2)}</span>
                    {' · '}
                    {alert.is_active ? (
                      <Tag color="green">Activa</Tag>
                    ) : (
                      <Tag color="default">Inactiva</Tag>
                    )}
                    {alert.triggered_at && (
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {' '}· Activada: {new Date(alert.triggered_at).toLocaleDateString('es-ES')}
                      </Typography.Text>
                    )}
                  </>
                }
              />
            </List.Item>
          )}
        />
      )}

      <Modal
        title="Nueva alerta de precio"
        open={creating}
        onOk={() => form.submit()}
        onCancel={() => { setCreating(false); form.resetFields(); }}
        confirmLoading={submitting}
        okText="Crear alerta"
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="product"
            label="ID de producto"
            rules={[{ required: true, message: 'Introduce el ID del producto' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="Ej: 42" />
          </Form.Item>
          <Form.Item
            name="target_price"
            label="Precio objetivo (€)"
            rules={[{ required: true, message: 'Introduce el precio objetivo' }]}
          >
            <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="Ej: 1.99" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PriceAlertsPage;
