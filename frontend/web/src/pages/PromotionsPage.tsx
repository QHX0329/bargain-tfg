import React, { useEffect, useMemo, useState } from 'react';
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
  Row,
  Col,
  Card,
  Statistic,
  Progress,
} from 'antd';
import { PlusOutlined, RiseOutlined, PercentageOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { apiClient } from '../api/client';
import type { Promotion } from '../store/businessStore';
import {
  collectUnresolvedEntityIds,
  getEntityId,
  resolveEntityName,
  type EntityLike,
} from '../utils/entityResolver';
import { getErrorMessage } from '../utils/errorMessage';

const { Title } = Typography;
const { TextArea } = Input;

interface StoreOption {
  id: string | number;
  name: string;
}

interface ProductLookupRecord {
  id: string | number;
  name: string;
}

interface BusinessPriceRecord {
  product: EntityLike;
}

interface PromotionFormValues {
  product_name: string;
  product_id: string;
  store: string;
  discount_type: 'flat' | 'percentage';
  discount_value: number;
  start_date: dayjs.Dayjs;
  end_date?: dayjs.Dayjs;
  min_quantity?: number;
  title?: string;
  description?: string;
}

type PromotionStatus = 'active' | 'pending' | 'inactive';

const resolvePromotionStatus = (promotion: Promotion): PromotionStatus => {
  if (!promotion.is_active) {
    return 'inactive';
  }

  const now = new Date();
  const start = new Date(promotion.start_date);
  const end = promotion.end_date ? new Date(promotion.end_date) : null;

  if (start > now) {
    return 'pending';
  }

  if (end && end < now) {
    return 'inactive';
  }

  return 'active';
};

const PromotionsPage: React.FC = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [productOptions, setProductOptions] = useState<{ value: string; label: string; id: string }[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [productNamesById, setProductNamesById] = useState<Record<string, string>>({});
  // Productos que el negocio ya vende (tiene un precio propio en /business/prices/).
  // La promoción solo tiene sentido sobre productos que realmente vendes, así que
  // el selector de "Nueva promoción" se restringe a esta lista en vez de al
  // catálogo global de /products/ (que incluye productos de cualquier cadena).
  const [ownedProducts, setOwnedProducts] = useState<{ id: string; name: string }[]>([]);
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

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const response = await apiClient.get<StoreOption[]>('/business/prices/stores/');
        setStores(Array.isArray(response.data) ? response.data : []);
      } catch {
        setStores([]);
      }
    };

    void fetchStores();
  }, []);

  useEffect(() => {
    const fetchOwnedProducts = async () => {
      try {
        const response = await apiClient.get<
          BusinessPriceRecord[] | { results?: BusinessPriceRecord[] }
        >('/business/prices/');
        const data = response.data;
        const items = Array.isArray(data) ? data : data.results ?? [];

        const ids = Array.from(
          new Set(items.map((item) => getEntityId(item.product)).filter((id) => id.length > 0)),
        );

        const lookups = await Promise.allSettled(
          ids.map(async (productId) => {
            const res = await apiClient.get<ProductLookupRecord>(`/products/${productId}/`);
            return res.data;
          }),
        );

        const resolvedNames: Record<string, string> = {};
        const resolvedProducts: { id: string; name: string }[] = [];
        lookups.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const name = result.value.name;
            resolvedNames[ids[index]] = name;
            resolvedProducts.push({ id: ids[index], name });
          }
        });

        setProductNamesById((previous) => ({ ...previous, ...resolvedNames }));
        setOwnedProducts(resolvedProducts.sort((a, b) => a.name.localeCompare(b.name)));
      } catch {
        setOwnedProducts([]);
      }
    };

    void fetchOwnedProducts();
  }, []);

  useEffect(() => {
    const unresolvedProductIds = collectUnresolvedEntityIds(
      promotions.map((promotion) => promotion.product as unknown as EntityLike),
      productNamesById,
    );

    if (unresolvedProductIds.length === 0) {
      return;
    }

    const resolveNames = async () => {
      const lookups = await Promise.allSettled(
        unresolvedProductIds.map(async (productId) => {
          const response = await apiClient.get<ProductLookupRecord>(`/products/${productId}/`);
          return response.data;
        }),
      );

      const resolved = lookups.reduce<Record<string, string>>((acc, result) => {
        if (result.status === 'fulfilled') {
          acc[String(result.value.id)] = result.value.name;
        }
        return acc;
      }, {});

      if (Object.keys(resolved).length > 0) {
        setProductNamesById((previous) => ({ ...previous, ...resolved }));
      }
    };

    void resolveNames();
  }, [promotions, productNamesById]);

  const resolveProductName = (product: Promotion['product']): string => {
    return resolveEntityName({
      entity: product as unknown as EntityLike,
      byId: productNamesById,
      fallback: 'Producto sin nombre',
    });
  };

  const resolveStoreName = (store: Promotion['store']): string => {
    return resolveEntityName({
      entity: store as unknown as EntityLike,
      catalog: stores,
      fallback: 'Tienda sin nombre',
    });
  };

  // Filtra en local sobre `ownedProducts` (los productos con precio propio del
  // negocio), no contra el catálogo global: una promoción solo tiene sentido
  // sobre algo que el negocio realmente vende en su tienda.
  const searchProducts = (query: string) => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered =
      normalizedQuery.length === 0
        ? ownedProducts
        : ownedProducts.filter((product) => product.name.toLowerCase().includes(normalizedQuery));
    setProductOptions(filtered.map((product) => ({ value: product.name, label: product.name, id: product.id })));
  };

  const openModal = (promotion?: Promotion) => {
    setEditingPromotion(promotion ?? null);
    // Muestra el catálogo propio completo nada más abrir el modal, antes de
    // que el usuario escriba nada en el buscador.
    setProductOptions(
      ownedProducts.map((product) => ({ value: product.name, label: product.name, id: product.id })),
    );
    if (promotion) {
      const productId = typeof promotion.product === 'object' ? String(promotion.product.id) : String(promotion.product);
      const storeId = typeof promotion.store === 'object' ? String(promotion.store.id) : String(promotion.store);
      setSelectedProductId(productId);
      form.setFieldsValue({
        product_name: resolveProductName(promotion.product),
        product_id: productId,
        store: storeId,
        discount_type: promotion.discount_type as 'flat' | 'percentage',
        discount_value: promotion.discount_value,
        start_date: dayjs(promotion.start_date),
        end_date: promotion.end_date ? dayjs(promotion.end_date) : undefined,
        min_quantity: promotion.min_quantity ?? undefined,
        title: promotion.title,
        description: promotion.description,
      });
    } else {
      form.resetFields();
      setSelectedProductId(null);
      // Preselecciona la (normalmente única) tienda del negocio.
      form.setFieldValue('store', stores[0] !== undefined ? String(stores[0].id) : undefined);
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingPromotion(null);
  };

  const onFinish = async (values: PromotionFormValues) => {
    const payload = {
      product: selectedProductId,
      store: values.store,
      discount_type: values.discount_type,
      discount_value: values.discount_value,
      start_date: values.start_date.format('YYYY-MM-DD'),
      end_date: values.end_date?.format('YYYY-MM-DD'),
      min_quantity: values.min_quantity ?? 1,
      title: values.title,
      description: values.description,
    };
    try {
      if (editingPromotion) {
        await apiClient.patch(`/business/promotions/${editingPromotion.id}/`, payload);
        void message.success('Promoción actualizada correctamente');
      } else {
        await apiClient.post('/business/promotions/', payload);
        void message.success('Promoción creada correctamente');
      }
      closeModal();
      void fetchPromotions();
    } catch (err) {
      void message.error(
        getErrorMessage(
          err,
          editingPromotion
            ? 'No se pudo actualizar la promoción. Revisa los datos e inténtalo de nuevo.'
            : 'No se pudo crear la promoción. Revisa los datos e inténtalo de nuevo.',
        ),
      );
    }
  };

  const handleDeactivate = (promo: Promotion) => {
    Modal.confirm({
      title: '¿Desactivar esta promoción?',
      content: `La promoción "${promo.title || resolveProductName(promo.product)}" dejará de estar visible para los usuarios.`,
      okText: 'Desactivar',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await apiClient.patch(`/business/promotions/${promo.id}/`, { is_active: false });
          void message.success('Promoción desactivada');
          void fetchPromotions();
        } catch {
          void message.error('Error al desactivar la promoción');
        }
      },
    });
  };

  const promotionStats = useMemo(() => {
    const summary = {
      active: 0,
      pending: 0,
      inactive: 0,
      totalViews: 0,
      avgDiscount: 0,
    };

    promotions.forEach((promotion) => {
      summary[resolvePromotionStatus(promotion)] += 1;
      summary.totalViews += promotion.views ?? 0;
      summary.avgDiscount += promotion.discount_type === 'percentage'
        ? promotion.discount_value
        : Math.min(30, promotion.discount_value * 2);
    });

    if (promotions.length > 0) {
      summary.avgDiscount = Number((summary.avgDiscount / promotions.length).toFixed(1));
    }

    return summary;
  }, [promotions]);

  const maxViews = useMemo(
    () => Math.max(1, ...promotions.map((promotion) => promotion.views ?? 0)),
    [promotions],
  );

  const columns: ColumnsType<Promotion> = [
    {
      title: 'Producto',
      key: 'product',
      render: (_: unknown, record: Promotion) => resolveProductName(record.product),
    },
    {
      title: 'Tienda',
      key: 'store',
      render: (_: unknown, record: Promotion) => resolveStoreName(record.store),
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
      render: (_: unknown, record: Promotion) => {
        const status = resolvePromotionStatus(record);
        if (status === 'active') {
          return <Tag color="success">Activa</Tag>;
        }
        if (status === 'pending') {
          return <Tag color="warning">Pendiente</Tag>;
        }
        return <Tag>Inactiva</Tag>;
      },
    },
    {
      title: 'Vistas',
      dataIndex: 'views',
      key: 'views',
    },
    {
      title: 'Rendimiento',
      key: 'performance',
      width: 170,
      render: (_: unknown, record: Promotion) => (
        <Progress
          percent={Math.round(((record.views ?? 0) / maxViews) * 100)}
          showInfo={false}
          size="small"
          strokeColor="#6f6350"
        />
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_: unknown, record: Promotion) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => openModal(record)}>
            Editar
          </Button>
          {record.is_active && (
            <Button type="link" danger onClick={() => handleDeactivate(record)}>
              Desactivar
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Promotions analytics
          </Title>
          <Typography.Text type="secondary">
            Diseña campañas con contexto y sigue su salud comercial desde un solo panel.
          </Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
          Nueva promoción
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="surface-card kpi-card">
            <Statistic
              title="Promociones activas"
              value={promotionStats.active}
              prefix={<RiseOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="surface-card kpi-card">
            <Statistic
              title="Descuento medio"
              value={promotionStats.avgDiscount}
              suffix="%"
              prefix={<PercentageOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="surface-card kpi-card">
            <Statistic
              title="Interes total"
              value={promotionStats.totalViews}
              prefix={<EyeOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="surface-card" style={{ height: '100%' }}>
            <Typography.Text type="secondary">Distribución de estado</Typography.Text>
            <div style={{ marginTop: 8 }}>
              <Typography.Text>Activas ({promotionStats.active})</Typography.Text>
              <Progress
                percent={Math.round((promotionStats.active / Math.max(1, promotions.length)) * 100)}
                showInfo={false}
                strokeColor="#5a7d66"
              />
            </div>
            <div>
              <Typography.Text>Pendientes ({promotionStats.pending})</Typography.Text>
              <Progress
                percent={Math.round((promotionStats.pending / Math.max(1, promotions.length)) * 100)}
                showInfo={false}
                strokeColor="#8f6d43"
              />
            </div>
            <div>
              <Typography.Text>Inactivas ({promotionStats.inactive})</Typography.Text>
              <Progress
                percent={Math.round((promotionStats.inactive / Math.max(1, promotions.length)) * 100)}
                showInfo={false}
                strokeColor="#9b8f80"
              />
            </div>
          </Card>
        </Col>
      </Row>

      <div className="surface-card" style={{ overflow: 'hidden' }}>
        <Table
          dataSource={promotions}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </div>

      <Modal
        title={editingPromotion ? 'Editar promoción' : 'Nueva promoción'}
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
              notFoundContent={
                ownedProducts.length === 0
                  ? 'Todavía no tienes productos con precio propio. Añádelos primero en "Subir precios".'
                  : 'Sin coincidencias'
              }
            />
          </Form.Item>

          <Form.Item
            name="store"
            label="Tienda"
            rules={[{ required: true, message: 'Selecciona una tienda' }]}
          >
            <Select placeholder="Selecciona una tienda" disabled={stores.length <= 1}>
              {stores.map((store) => (
                <Select.Option key={store.id} value={String(store.id)}>
                  {store.name}
                </Select.Option>
              ))}
            </Select>
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
