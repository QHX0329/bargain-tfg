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
  Modal,
  Upload,
  Tag,
} from 'antd';
import { PlusOutlined, BarcodeOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { apiClient } from '../api/client';
import {
  collectUnresolvedEntityIds,
  getEntityId,
  resolveEntityName,
  type EntityReference,
} from '../utils/entityResolver';
import { getErrorMessage } from '../utils/errorMessage';

const { Title } = Typography;

/** Etiquetas legibles para los campos que puede devolver el backend en errores. */
const FIELD_LABELS: Record<string, string> = {
  store: 'Tienda',
  product: 'Producto',
  price: 'Precio',
  unit_price: 'Precio por unidad',
  offer_price: 'Precio de oferta',
  offer_end_date: 'Fin de la oferta',
  non_field_errors: '',
  __all__: '',
  detail: '',
};

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

interface ProductLookupRecord {
  id: string | number;
  name: string;
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

interface BulkUpdateErrorRow {
  index: number;
  errors: Record<string, unknown>;
}

interface BulkUpdateResponse {
  created: number;
  updated: number;
  errors: BulkUpdateErrorRow[];
}

interface DetectedBarcode {
  rawValue?: string;
}

interface BarcodeDetectorInstance {
  detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new (options: { formats: string[] }): BarcodeDetectorInstance;
}

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
  const [productNamesById, setProductNamesById] = useState<Record<string, string>>({});
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [form] = Form.useForm<PriceFormValues>();
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<UploadFile | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvResult, setCsvResult] = useState<BulkUpdateResponse | null>(null);

  const parseCsvInteger = (value?: string): number | null => {
    const parsed = Number.parseInt((value ?? '').trim(), 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  };

  const formatBulkUpdateErrors = (value: unknown): string => {
    if (Array.isArray(value)) {
      return value.map((item) => formatBulkUpdateErrors(item)).join(', ');
    }
    if (value && typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>)
        .map(([key, inner]) => {
          const label = key in FIELD_LABELS ? FIELD_LABELS[key] : key;
          const text = formatBulkUpdateErrors(inner);
          return label ? `${label}: ${text}` : text;
        })
        .join('; ');
    }
    return String(value);
  };

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

  useEffect(() => {
    const loadMissingProductNames = async () => {
      const unresolvedIds = collectUnresolvedEntityIds(
        prices.map((price) => price.product),
        productNamesById,
      );

      if (unresolvedIds.length === 0) {
        return;
      }

      const lookups = await Promise.allSettled(
        unresolvedIds.map(async (productId) => {
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

    void loadMissingProductNames();
  }, [prices, productNamesById]);

  const resolveProductName = (entity: EntityReference | string | number): string => {
    return resolveEntityName({
      entity,
      byId: productNamesById,
      fallback: 'Producto sin nombre',
    });
  };

  const resolveStoreName = (entity: EntityReference | string | number): string => {
    return resolveEntityName({
      entity,
      catalog: storeOptions,
      fallback: 'Tienda sin nombre',
    });
  };

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
      const barcodeDetector = (
        window as Window & {
          BarcodeDetector?: BarcodeDetectorConstructor;
        }
      ).BarcodeDetector;

      if (barcodeDetector) {
        // Use BarcodeDetector API
        const detector = new barcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
        });
        const scan = async () => {
          if (!videoRef.current) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              if (!code) {
                requestAnimationFrame(scan);
                return;
              }
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
        product_name: resolveProductName(record.product),
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
    } catch (err) {
      void message.error(getErrorMessage(err, 'No se pudo guardar el precio. Revisa los datos e inténtalo de nuevo.'));
    }
  };

  const handleDelete = (record: PriceRecord) => {
    Modal.confirm({
      title: '¿Eliminar este precio?',
      content: `Se eliminará el precio de "${resolveProductName(record.product)}" permanentemente.`,
      okText: 'Eliminar',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await apiClient.delete(`/business/prices/${record.id}/`);
          void message.success('Precio eliminado');
          void fetchPrices();
        } catch (err) {
          void message.error(getErrorMessage(err, 'No se pudo eliminar el precio. Inténtalo de nuevo.'));
        }
      },
    });
  };

  const handleCsvImport = async () => {
    if (!csvFile?.originFileObj) {
      void message.warning('Selecciona un archivo CSV primero');
      return;
    }
    setCsvLoading(true);
    setCsvResult(null);
    try {
      const text = await csvFile.originFileObj.text();
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) { void message.error('CSV vacío o sin filas de datos'); return; }
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const rows = lines.slice(1).map((line) => {
        const vals = line.split(',').map((v) => v.trim());
        return headers.reduce<Record<string, string>>((obj, h, i) => { obj[h] = vals[i] ?? ''; return obj; }, {});
      });
      // Fix F6: el backend espera PKs enteros en `product` y `store`, no strings ni aliases ambiguos.
      const payload = rows
        .map((r) => ({
          product: parseCsvInteger(r['product_id'] || r['product']) ?? undefined,
          store: parseCsvInteger(r['store_id'] || r['store']) ?? undefined,
          price: r['price'] || r['precio'],
          unit_price: r['unit_price'] || r['precio_unitario'] || undefined,
          offer_price: r['offer_price'] || r['precio_oferta'] || undefined,
          offer_end_date: r['offer_end_date'] || r['fecha_fin_oferta'] || undefined,
        }))
        .filter((r) => r.product && r.store && r.price);

      const res = await apiClient.post<BulkUpdateResponse>(
        '/business/prices/bulk-update/',
        payload,
      );
      setCsvResult(res.data);
      if ((res.data.created ?? 0) + (res.data.updated ?? 0) > 0) {
        void fetchPrices();
      }
    } catch {
      void message.error('Error importando CSV. Verifica el formato.');
    } finally {
      setCsvLoading(false);
    }
  };

  const columns: ColumnsType<PriceRecord> = [
    {
      title: 'Producto',
      key: 'product',
      render: (_: unknown, record: PriceRecord) => resolveProductName(record.product),
    },
    {
      title: 'Tienda',
      key: 'store',
      render: (_: unknown, record: PriceRecord) => resolveStoreName(record.store),
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
      render: (val: string) => (val ? new Date(val).toLocaleDateString('es-ES') : '—'),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_: unknown, record: PriceRecord) => (
        <Space>
          <Button type="link" onClick={() => openDrawer(record)}>
            Editar
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            Eliminar
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Gestión de precios
          </Title>
          <Typography.Text type="secondary">
            Controla precios base, unitarios y ofertas por tienda.
          </Typography.Text>
        </div>
        <Space>
          <Button icon={<UploadOutlined />} onClick={() => { setCsvResult(null); setCsvFile(null); setCsvModalOpen(true); }}>
            Importar CSV
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
            Añadir precio
          </Button>
        </Space>
      </div>

      <div className="surface-card" style={{ overflow: 'hidden' }}>
        <Table
          dataSource={prices}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
          locale={{ emptyText: loading ? ' ' : 'No hay precios registrados. Añade uno o importa un CSV.' }}
        />
      </div>

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

      {/* CSV Import Modal */}
      <Modal
        title="Importar precios desde CSV"
        open={csvModalOpen}
        onCancel={() => setCsvModalOpen(false)}
        onOk={() => void handleCsvImport()}
        okText="Importar"
        cancelText="Cancelar"
        confirmLoading={csvLoading}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Text type="secondary">
            Columnas esperadas: <code>barcode/product_id, store_id, price</code> (opcionales: <code>unit_price, offer_price, offer_end_date</code>)
          </Typography.Text>
          <Upload
            accept=".csv"
            maxCount={1}
            beforeUpload={() => false}
            fileList={csvFile ? [csvFile] : []}
            onChange={({ fileList }) => setCsvFile(fileList[fileList.length - 1] ?? null)}
          >
            <Button icon={<UploadOutlined />}>Seleccionar archivo CSV</Button>
          </Upload>
          {csvResult && (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Tag color="green">Creados: {csvResult.created}</Tag>
              <Tag color="blue">Actualizados: {csvResult.updated}</Tag>
              {csvResult.errors.length > 0 && (
                <Alert
                  type="warning"
                  message={`${csvResult.errors.length} errores en la importación`}
                  description={
                    <Space direction="vertical" style={{ width: '100%' }} size={4}>
                      {csvResult.errors.slice(0, 5).map((error) => (
                        <Typography.Text key={error.index} style={{ whiteSpace: 'pre-wrap' }}>
                          Fila {error.index + 2}: {formatBulkUpdateErrors(error.errors)}
                        </Typography.Text>
                      ))}
                    </Space>
                  }
                />
              )}
            </Space>
          )}
        </Space>
      </Modal>
    </div>
  );
};

export default PricesPage;
