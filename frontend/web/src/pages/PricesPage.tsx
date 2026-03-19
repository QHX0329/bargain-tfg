import React, { useEffect, useState, useRef } from 'react';
import {
  Table,
  Button,
  Drawer,
  Form,
  AutoComplete,
  InputNumber,
  DatePicker,
  Space,
  Select,
  Typography,
  Input,
  message,
  Alert,
} from 'antd';
import { PlusOutlined, BarcodeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { apiClient } from '../api/client';

const { Title } = Typography;

interface ProductOption {
  id: string;
  name: string;
  barcode?: string;
}

interface StoreOption {
  id: string | number;
  name: string;
  address?: string;
}

interface EntityReference {
  id: string | number;
  name?: string;
}

interface PriceRecord {
  id: string;
  product: EntityReference | string | number;
  store: EntityReference | string | number;
  price: string;
  unit_price?: string;
  offer_price?: string;
  offer_end_date?: string;
  updated_at: string;
}

interface PriceFormValues {
  product_id: string;
  product_name: string;
  store_id: string;
  price: number;
  unit_price?: number;
  offer_price?: number;
  offer_end_date?: dayjs.Dayjs;
}

const getEntityId = (entity: EntityReference | string | number): string => {
  if (typeof entity === 'object' && entity !== null && 'id' in entity) {
    return String(entity.id);
  }
  return String(entity);
};

const getEntityName = (entity: EntityReference | string | number): string => {
  if (typeof entity === 'object' && entity !== null && 'name' in entity && entity.name) {
    return entity.name;
  }
  return `#${getEntityId(entity)}`;
};

const PricesPage: React.FC = () => {
  const [prices, setPrices] = useState<PriceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PriceRecord | null>(null);
  const [storeOptions, setStoreOptions] = useState<StoreOption[]>([]);
  const [productOptions, setProductOptions] = useState<{ value: string; label: string; id: string }[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [showBarcodeInput, setShowBarcodeInput] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [form] = Form.useForm<PriceFormValues>();

  const fetchPrices = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<PriceRecord[] | { results?: PriceRecord[] }>(
        '/business/prices/',
      );
      const data = res.data;
      if (Array.isArray(data)) {
        setPrices(data);
      } else if (data && 'results' in data && Array.isArray(data.results)) {
        setPrices(data.results);
      }
    } catch {
      void message.error('Error al cargar los precios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPrices();
  }, []);

  const fetchStores = async () => {
    try {
      const res = await apiClient.get<StoreOption[]>('/business/prices/stores/');
      setStoreOptions(Array.isArray(res.data) ? res.data : []);
    } catch {
      void message.error('No se pudieron cargar tus tiendas asociadas');
    }
  };

  useEffect(() => {
    void fetchStores();
  }, []);

  const searchProducts = async (query: string) => {
    if (query.length < 2) return;
    try {
      const res = await apiClient.get<ProductOption[] | { results?: ProductOption[] }>(
        `/products/?q=${encodeURIComponent(query)}`,
      );
      const data = res.data;
      const items = Array.isArray(data) ? data : (data as { results?: ProductOption[] }).results ?? [];
      setProductOptions(
        items.map((p) => ({ value: p.name, label: p.name, id: p.id })),
      );
    } catch {
      // Silently ignore search errors
    }
  };

  const lookupByBarcode = async (barcode: string) => {
    try {
      const res = await apiClient.get<ProductOption[] | { results?: ProductOption[] }>(
        `/products/?barcode=${encodeURIComponent(barcode)}`,
      );
      const data = res.data;
      const items = Array.isArray(data) ? data : (data as { results?: ProductOption[] }).results ?? [];
      if (items.length > 0) {
        setSelectedProductId(items[0].id);
        form.setFieldValue('product_name', items[0].name);
        form.setFieldValue('product_id', items[0].id);
      } else {
        void message.warning('Producto no encontrado para ese código de barras');
      }
    } catch {
      void message.error('Error al buscar el producto por código de barras');
    }
  };

  const startBarcodeScanner = async () => {
    setBarcodeError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setShowBarcodeInput(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      // Check for BarcodeDetector API
      if ('BarcodeDetector' in window) {
        // Use BarcodeDetector API
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detector = new (window as any).BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });
        const scan = async () => {
          if (!videoRef.current) return;
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const barcodes = await detector.detect(videoRef.current) as any[];
            if (barcodes.length > 0) {
              const code = barcodes[0].rawValue as string;
              stopBarcodeScanner();
              await lookupByBarcode(code);
              return;
            }
          } catch {
            // Continue scanning
          }
          requestAnimationFrame(scan);
        };
        requestAnimationFrame(scan);
      } else {
        // Fallback to manual input
        stopBarcodeScanner();
        setShowBarcodeInput(true);
      }
    } catch {
      setBarcodeError('No se pudo acceder a la cámara. Introduce el código manualmente.');
      setShowBarcodeInput(true);
    }
  };

  const stopBarcodeScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const openDrawer = (record?: PriceRecord) => {
    setEditingRecord(record ?? null);
    setShowBarcodeInput(false);
    setBarcodeError(null);
    if (record) {
      const productId = getEntityId(record.product);
      const storeId = getEntityId(record.store);

      form.setFieldsValue({
        product_name: getEntityName(record.product),
        product_id: productId,
        store_id: storeId,
        price: parseFloat(record.price),
        unit_price: record.unit_price ? parseFloat(record.unit_price) : undefined,
        offer_price: record.offer_price ? parseFloat(record.offer_price) : undefined,
        offer_end_date: record.offer_end_date ? dayjs(record.offer_end_date) : undefined,
      });
      setSelectedProductId(productId);
      setSelectedStoreId(storeId);
    } else {
      form.resetFields();
      setSelectedProductId(null);
      setSelectedStoreId(null);
    }
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    stopBarcodeScanner();
    setDrawerOpen(false);
    setEditingRecord(null);
  };

  const onFinish = async (values: PriceFormValues) => {
    if (!selectedProductId || !selectedStoreId) {
      void message.error('Selecciona un producto y una tienda antes de guardar');
      return;
    }

    const payload = {
      product: selectedProductId,
      store: selectedStoreId,
      price: values.price,
      unit_price: values.unit_price,
      offer_price: values.offer_price,
      offer_end_date: values.offer_end_date?.format('YYYY-MM-DD'),
    };
    try {
      if (editingRecord) {
        await apiClient.patch(`/business/prices/${editingRecord.id}/`, payload);
        void message.success('Precio actualizado correctamente');
      } else {
        await apiClient.post('/business/prices/', payload);
        void message.success('Precio añadido correctamente');
      }
      closeDrawer();
      void fetchPrices();
    } catch {
      void message.error('Error al guardar el precio');
    }
  };

  const columns: ColumnsType<PriceRecord> = [
    {
      title: 'Producto',
      key: 'product',
      render: (_: unknown, record: PriceRecord) => getEntityName(record.product),
    },
    {
      title: 'Tienda',
      key: 'store',
      render: (_: unknown, record: PriceRecord) => getEntityName(record.store),
    },
    {
      title: 'Precio',
      dataIndex: 'price',
      key: 'price',
      render: (val: string) => `${val} €`,
    },
    {
      title: 'Precio unitario',
      dataIndex: 'unit_price',
      key: 'unit_price',
      render: (val?: string) => (val ? `${val} €` : '—'),
    },
    {
      title: 'Actualizado',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (val: string) => new Date(val).toLocaleDateString('es-ES'),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_: unknown, record: PriceRecord) => (
        <Button type="link" onClick={() => openDrawer(record)}>
          Editar
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>
          Gestión de precios
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
          Añadir precio
        </Button>
      </div>

      <Table
        dataSource={prices}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20 }}
      />

      <Drawer
        title={editingRecord ? 'Editar precio' : 'Añadir precio'}
        placement="right"
        size="large"
        open={drawerOpen}
        onClose={closeDrawer}
        footer={
          <Space>
            <Button onClick={closeDrawer}>Cancelar</Button>
            <Button type="primary" onClick={() => form.submit()}>
              Guardar
            </Button>
          </Space>
        }
      >
        <Form<PriceFormValues> form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item label="Buscar producto" name="product_name" rules={[{ required: true, message: 'Selecciona un producto' }]}>
            <AutoComplete
              options={productOptions}
              onSearch={searchProducts}
              onSelect={(_value: string, option: { id: string; value: string; label: string }) => {
                setSelectedProductId(option.id);
                form.setFieldValue('product_id', option.id);
              }}
              placeholder="Nombre del producto..."
            />
          </Form.Item>

          <Form.Item
            name="store_id"
            label="Tienda asociada"
            rules={[{ required: true, message: 'Selecciona una tienda asociada' }]}
          >
            <Select
              placeholder="Selecciona tu tienda"
              options={storeOptions.map((store) => ({
                value: String(store.id),
                label: `${store.name}${store.address ? ` · ${store.address}` : ''}`,
              }))}
              onChange={(value: string | number) => {
                const normalized = String(value);
                setSelectedStoreId(normalized);
                form.setFieldValue('store_id', normalized);
              }}
            />
          </Form.Item>

          <Form.Item label="Escanear código de barras">
            <Space orientation="vertical" style={{ width: '100%' }}>
              <Button icon={<BarcodeOutlined />} onClick={startBarcodeScanner}>
                Escanear código de barras
              </Button>
              {barcodeError && <Alert type="warning" message={barcodeError} />}
              <video
                ref={videoRef}
                style={{
                  width: '100%',
                  display: streamRef.current ? 'block' : 'none',
                  borderRadius: 4,
                }}
              />
              {showBarcodeInput && (
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    placeholder="Código de barras manual"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                  />
                  <Button
                    type="primary"
                    onClick={() => {
                      if (manualBarcode) {
                        void lookupByBarcode(manualBarcode);
                        setManualBarcode('');
                      }
                    }}
                  >
                    Buscar
                  </Button>
                </Space.Compact>
              )}
            </Space>
          </Form.Item>

          <Form.Item name="price" label="Precio (€)" rules={[{ required: true, message: 'Introduce el precio' }]}>
            <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="unit_price" label="Precio unitario (€)">
            <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="offer_price" label="Precio oferta (€)">
            <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="offer_end_date" label="Fecha fin oferta">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
};

export default PricesPage;
