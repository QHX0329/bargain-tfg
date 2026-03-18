import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  AutoComplete,
  Select,
  InputNumber,
  DatePicker,
  Space,
  Typography,
  Tag,
  Input,
  message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { apiClient } from '../api/client';
import { useBusinessStore } from '../store/businessStore';
import type { Promotion } from '../store/businessStore';

const { Title } = Typography;
const { TextArea } = Input;

interface ProductOption {
  id: string;
  name: string;
}

interface PromotionFormValues {
  product_name: string;
  product_id: string;
  discount_type: 'flat' | 'percentage';
  discount_value: number;
  start_date: dayjs.Dayjs;
  end_date?: dayjs.Dayjs;
  min_quantity?: number;
  title?: string;
  description?: string;
}

const PromotionsPage: React.FC = () => {
  const { profile } = useBusinessStore();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [productOptions, setProductOptions] = useState<{ value: string; label: string; id: string }[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [form] = Form.useForm<PromotionFormValues>();

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<Promotion[] | { results?: Promotion[] }>('/business/promotions/');
      const data = res.data;
      if (Array.isArray(data)) {
        setPromotions(data);
      } else if (data && 'results' in data && Array.isArray(data.results)) {
        setPromotions(data.results);
      }
    } catch {
      void message.error('Error al cargar las promociones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPromotions();
  }, []);

  const searchProducts = async (query: string) => {
    if (query.length < 2) return;
    try {
      const res = await apiClient.get<ProductOption[] | { results?: ProductOption[] }>(
        `/products/?search=${encodeURIComponent(query)}`,
      );
      const data = res.data;
      const items = Array.isArray(data) ? data : (data as { results?: ProductOption[] }).results ?? [];
      setProductOptions(items.map((p) => ({ value: p.name, label: p.name, id: p.id })));
    } catch {
      // Silently ignore
    }
  };

  const openModal = () => {
    form.resetFields();
    setSelectedProductId(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const onFinish = async (values: PromotionFormValues) => {
    const payload = {
      product: selectedProductId,
      discount_type: values.discount_type,
      discount_value: values.discount_value,
      start_date: values.start_date.format('YYYY-MM-DD'),
      end_date: values.end_date?.format('YYYY-MM-DD'),
      min_quantity: values.min_quantity ?? 1,
      title: values.title,
      description: values.description,
    };
    try {
      await apiClient.post('/business/promotions/', payload);
      void message.success('Promoción creada correctamente');
      closeModal();
      void fetchPromotions();
    } catch {
      void message.error('Error al crear la promoción');
    }
  };

  const deactivatePromotion = async (id: string) => {
    try {
      await apiClient.patch(`/business/promotions/${id}/`, { is_active: false });
      void message.success('Promoción desactivada');
      void fetchPromotions();
    } catch {
      void message.error('Error al desactivar la promoción');
    }
  };

  const columns: ColumnsType<Promotion> = [
    {
      title: 'Producto',
      dataIndex: ['product', 'name'],
      key: 'product',
    },
    {
      title: 'Tienda',
      dataIndex: ['store', 'name'],
      key: 'store',
    },
    {
      title: 'Descuento',
      key: 'discount',
      render: (_: unknown, record: Promotion) =>
        record.discount_type === 'percentage'
          ? `${record.discount_value}%`
          : `${record.discount_value} €`,
    },
    {
      title: 'Inicio',
      dataIndex: 'start_date',
      key: 'start_date',
      render: (val: string) => new Date(val).toLocaleDateString('es-ES'),
    },
    {
      title: 'Fin',
      dataIndex: 'end_date',
      key: 'end_date',
      render: (val?: string) => (val ? new Date(val).toLocaleDateString('es-ES') : 'Sin fecha fin'),
    },
    {
      title: 'Estado',
      key: 'status',
      render: (_: unknown, record: Promotion) =>
        record.is_active ? (
          <Tag color="green">Activa</Tag>
        ) : (
          <Tag color="default">Inactiva</Tag>
        ),
    },
    {
      title: 'Vistas',
      dataIndex: 'views',
      key: 'views',
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_: unknown, record: Promotion) =>
        record.is_active ? (
          <Button type="link" danger onClick={() => deactivatePromotion(record.id)}>
            Desactivar
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>
          Gestión de promociones
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openModal}>
          Nueva promoción
        </Button>
      </div>

      <Table
        dataSource={promotions}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title="Nueva promoción"
        open={modalOpen}
        onCancel={closeModal}
        footer={
          <Space>
            <Button onClick={closeModal}>Cancelar</Button>
            <Button type="primary" onClick={() => form.submit()}>
              Crear promoción
            </Button>
          </Space>
        }
        width={600}
      >
        <Form<PromotionFormValues> form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="product_name"
            label="Producto"
            rules={[{ required: true, message: 'Selecciona un producto' }]}
          >
            <AutoComplete
              options={productOptions}
              onSearch={searchProducts}
              onSelect={(_value: string, option: { id: string; value: string; label: string }) => {
                setSelectedProductId(option.id);
                form.setFieldValue('product_id', option.id);
              }}
              placeholder="Buscar producto..."
            />
          </Form.Item>

          <Form.Item label="Tienda">
            <Input value={profile?.business_name ?? '—'} disabled />
          </Form.Item>

          <Form.Item
            name="discount_type"
            label="Tipo de descuento"
            rules={[{ required: true, message: 'Selecciona el tipo de descuento' }]}
          >
            <Select>
              <Select.Option value="flat">Importe fijo (€)</Select.Option>
              <Select.Option value="percentage">Porcentaje (%)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="discount_value"
            label="Valor del descuento"
            rules={[{ required: true, message: 'Introduce el valor del descuento' }]}
          >
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="start_date"
            label="Fecha de inicio"
            rules={[{ required: true, message: 'Selecciona la fecha de inicio' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item name="end_date" label="Fecha de fin (opcional)">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item name="min_quantity" label="Cantidad mínima (opcional)">
            <InputNumber min={1} style={{ width: '100%' }} placeholder="1" />
          </Form.Item>

          <Form.Item name="title" label="Título (opcional)">
            <Input placeholder="Título de la promoción" />
          </Form.Item>

          <Form.Item name="description" label="Descripción (opcional)">
            <TextArea rows={3} placeholder="Descripción de la promoción" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PromotionsPage;
