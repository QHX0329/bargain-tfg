import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Form, Input, InputNumber, Typography, message } from 'antd';

import { productService } from '../../../api/productService';

interface ProposalFormValues {
  name: string;
  brand?: string;
  barcode?: string;
  notes?: string;
  price?: number;
  store?: number;
}

export const ProductProposalPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<ProposalFormValues>();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (values: ProposalFormValues) => {
    setSubmitting(true);
    productService
      .createProposal({
        name: values.name,
        brand: values.brand,
        barcode: values.barcode,
        notes: values.notes,
        price: values.price,
        store: values.store,
      })
      .then(() => {
        void message.success('Propuesta enviada correctamente');
        form.resetFields();
        navigate('/app/catalog');
      })
      .catch(() => {
        void message.error('No se pudo enviar la propuesta');
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: 16 }}>
        <Button onClick={() => navigate('/app/catalog')}>← Volver al catálogo</Button>
      </div>

      <Typography.Title level={3}>Proponer nuevo producto</Typography.Title>

      <Form<ProposalFormValues>
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          name="name"
          label="Nombre del producto"
          rules={[{ required: true, message: 'El nombre del producto es obligatorio' }]}
        >
          <Input placeholder="Ej. Leche entera 1L" />
        </Form.Item>

        <Form.Item name="brand" label="Marca">
          <Input placeholder="Ej. Hacendado" />
        </Form.Item>

        <Form.Item
          name="barcode"
          label="Código de barras (EAN-13)"
        >
          <Input placeholder="Ej. 8410000100066" />
        </Form.Item>

        <Form.Item name="notes" label="Notas adicionales">
          <Input.TextArea rows={3} placeholder="Información adicional sobre el producto..." />
        </Form.Item>

        <Form.Item name="price" label="Precio conocido (€)">
          <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0.00" />
        </Form.Item>

        <Form.Item name="store" label="ID de tienda conocida">
          <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="ID de tienda" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} block>
            Enviar propuesta
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default ProductProposalPage;
