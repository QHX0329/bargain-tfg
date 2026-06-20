import React, { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Table,
  Tabs,
  Typography,
  Upload,
  message,
  Drawer,
  Spin,
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { apiClient } from '../api/client';
import {
  collectUnresolvedEntityIds,
  getEntityId,
  resolveEntityName,
  type EntityLike,
  type EntityReference,
} from '../utils/entityResolver';
import { getErrorMessage } from '../utils/errorMessage';

const { Title, Text } = Typography;

/** Validates EAN-13 checksum. Returns true if valid or empty. */
function validateEAN13(code: string): boolean {
  if (!code) return true;
  if (!/^\d{13}$/.test(code)) return false;
  const sum = code.split('').reduce((acc, d, i) => acc + parseInt(d, 10) * (i % 2 === 0 ? 1 : 3), 0);
  return sum % 10 === 0;
}

interface ProductProposalPayload {
  name: string;
  brand?: string;
  barcode?: string;
  category?: number;
  image_url?: string;
  notes?: string;
  price?: number;
  unit_price?: number;
  store?: string | number;
}

interface CategoryNode {
  id: number;
  name: string;
  children?: CategoryNode[];
}

interface ParsedRow extends ProductProposalPayload {
  rowKey: string;
}

interface BusinessPriceRecord {
  id: string;
  product: EntityReference | string | number;
  store: EntityReference | string | number;
  price: string;
  offer_price?: string;
  verified_at?: string;
  created_at?: string;
}

interface PromotionRecord {
  id: string;
  product: EntityReference | string | number;
  is_active: boolean;
}

interface StoreOption {
  id: string | number;
  name: string;
}

interface ProductLookupRecord {
  id: string | number;
  name: string;
}

interface AssociatedProductRow {
  key: string;
  productId: string;
  productName: string;
  stores: string;
  storesCount: number;
  basePrice: number;
  offerPrice?: number;
  activePromotions: number;
  lastUpdated?: string;
}

const csvKeyAliases: Record<string, keyof ProductProposalPayload> = {
  name: 'name',
  nombre: 'name',
  brand: 'brand',
  marca: 'brand',
  barcode: 'barcode',
  ean: 'barcode',
  ean13: 'barcode',
  category: 'category',
  categoria: 'category',
  category_id: 'category',
  categoria_id: 'category',
  image_url: 'image_url',
  image: 'image_url',
  notes: 'notes',
  notas: 'notes',
  price: 'price',
  precio: 'price',
  unit_price: 'unit_price',
  precio_unitario: 'unit_price',
};

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
};

const normalizeNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const clean = value.replace(',', '.');
    const parsed = Number.parseFloat(clean);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return undefined;
};

const normalizeCategory = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return undefined;
};

const normalizePayload = (raw: Partial<ProductProposalPayload>): ProductProposalPayload | null => {
  if (!raw.name || raw.name.trim().length < 2) {
    return null;
  }

  const barcode = raw.barcode?.trim() || undefined;
  if (barcode && !validateEAN13(barcode)) {
    return null; // Invalid EAN-13 — skip row
  }

  return {
    name: raw.name.trim(),
    brand: raw.brand?.trim() || undefined,
    barcode,
    category: normalizeCategory(raw.category),
    image_url: raw.image_url?.trim() || undefined,
    notes: raw.notes?.trim() || undefined,
    price: normalizeNumber(raw.price),
    unit_price: normalizeNumber(raw.unit_price),
    store: raw.store || undefined,
  };
};

const parseCsvProducts = (text: string): ProductProposalPayload[] => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase().trim());
  const mappedKeys = headers.map((header) => csvKeyAliases[header]);

  return lines
    .slice(1)
    .map((line) => {
      const values = parseCsvLine(line);
      const raw: Partial<ProductProposalPayload> = {};

      mappedKeys.forEach((mappedKey, index) => {
        if (!mappedKey) {
          return;
        }
        const value = values[index];
        if (value === undefined || value === '') {
          return;
        }
        if (mappedKey === 'category') {
          raw[mappedKey] = normalizeCategory(value);
          return;
        }
        if (mappedKey === 'price' || mappedKey === 'unit_price') {
          raw[mappedKey] = normalizeNumber(value);
          return;
        }
        (raw as any)[mappedKey] = value;
      });

      return normalizePayload(raw);
    })
    .filter((item): item is ProductProposalPayload => item !== null);
};

const parseJsonProducts = (text: string): ProductProposalPayload[] => {
  const parsed = JSON.parse(text) as unknown;
  const rows = Array.isArray(parsed) ? parsed : [parsed];

  return rows
    .map((row) => {
      if (typeof row !== 'object' || row === null) {
        return null;
      }

      const maybeRow = row as Record<string, unknown>;
      const raw: Partial<ProductProposalPayload> = {
        name: typeof maybeRow.name === 'string' ? maybeRow.name : '',
        brand: typeof maybeRow.brand === 'string' ? maybeRow.brand : undefined,
        barcode: typeof maybeRow.barcode === 'string' ? maybeRow.barcode : undefined,
        category: normalizeCategory(maybeRow.category),
        image_url: typeof maybeRow.image_url === 'string' ? maybeRow.image_url : undefined,
        notes: typeof maybeRow.notes === 'string' ? maybeRow.notes : undefined,
        price: normalizeNumber(maybeRow.price),
        unit_price: normalizeNumber(maybeRow.unit_price),
      };

      return normalizePayload(raw);
    })
    .filter((item): item is ProductProposalPayload => item !== null);
};

const ProductsUploadPage: React.FC = () => {
  const [manualForm] = Form.useForm<ProductProposalPayload>();
  const [manualLoading, setManualLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchRows, setBatchRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [associatedProducts, setAssociatedProducts] = useState<AssociatedProductRow[]>([]);
  const [associatedLoading, setAssociatedLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editProductForm] = Form.useForm<ProductProposalPayload>();
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [selectedBatchStore, setSelectedBatchStore] = useState<string | number | undefined>();
  const [editLoading, setEditLoading] = useState(false);

  const openDrawer = async (productId: string) => {
    setDrawerOpen(true);
    setEditLoading(true);
    setEditingProductId(productId);
    try {
      const res = await apiClient.get<{name: string, brand?: string, barcode?: string, category?: {id: number}, image_url?: string}>(`/products/${productId}/`);
      const data = res.data;
      editProductForm.setFieldsValue({
        name: data.name,
        brand: data.brand || undefined,
        barcode: data.barcode || undefined,
        category: data.category?.id || undefined,
        image_url: data.image_url || undefined,
      });
    } catch {
      void message.error('No se pudo cargar la información del producto');
      setDrawerOpen(false);
    } finally {
      setEditLoading(false);
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingProductId(null);
    editProductForm.resetFields();
  };

  const handleEditSubmit = async (values: ProductProposalPayload) => {
    if (!editingProductId) return;
    setEditLoading(true);
    try {
      await apiClient.patch(`/products/${editingProductId}/`, {
        name: values.name,
        brand: values.brand,
        barcode: values.barcode,
        category_id: values.category,
        image_url: values.image_url,
      });
      void message.success('Producto actualizado correctamente en el catálogo global');
      closeDrawer();
      window.location.reload();
    } catch (err) {
      void message.error(
        getErrorMessage(
          err,
          'No se pudo actualizar el producto. Revisa los datos o comprueba si el código EAN ya existe.',
        ),
      );
    } finally {
      setEditLoading(false);
    }
  };

  const categoryOptions = useMemo(
    () =>
      categories.flatMap((category) => {
        const rootOption = {
          value: category.id,
          label: category.name,
        };

        const childOptions = (category.children ?? []).map((child) => ({
          value: child.id,
          label: `${category.name} / ${child.name}`,
        }));

        return [rootOption, ...childOptions];
      }),
    [categories],
  );

  React.useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiClient.get<CategoryNode[]>('/products/categories/');
        setCategories(Array.isArray(response.data) ? response.data : []);
      } catch {
        setCategories([]);
      }
    };

    void fetchCategories();
  }, []);

  React.useEffect(() => {
    const loadAssociatedProducts = async () => {
      setAssociatedLoading(true);
      try {
        const [pricesResponse, promotionsResponse, storesResponse] = await Promise.all([
          apiClient.get<BusinessPriceRecord[] | { results?: BusinessPriceRecord[] }>('/business/prices/'),
          apiClient.get<PromotionRecord[] | { results?: PromotionRecord[] }>('/business/promotions/'),
          apiClient.get<StoreOption[]>('/business/prices/stores/'),
        ]);

        const pricesData = Array.isArray(pricesResponse.data)
          ? pricesResponse.data
          : pricesResponse.data?.results ?? [];
        const promotionsData = Array.isArray(promotionsResponse.data)
          ? promotionsResponse.data
          : promotionsResponse.data?.results ?? [];
        const storesData = Array.isArray(storesResponse.data) ? storesResponse.data : [];
        setStores(storesData);

        const storeNamesById = storesData.reduce<Record<string, string>>((acc, store) => {
          acc[String(store.id)] = store.name;
          return acc;
        }, {});

        const productIdsToResolve = collectUnresolvedEntityIds(
          pricesData.map((item) => item.product),
        );

        const productLookups = await Promise.allSettled(
          productIdsToResolve.map(async (productId) => {
            const response = await apiClient.get<ProductLookupRecord>(`/products/${productId}/`);
            return response.data;
          }),
        );

        const productNamesById = productLookups.reduce<Record<string, string>>((acc, result) => {
          if (result.status === 'fulfilled') {
            acc[String(result.value.id)] = result.value.name;
          }
          return acc;
        }, {});

        const promotionsByProduct = promotionsData.reduce<Record<string, number>>((acc, promo) => {
          if (!promo.is_active) {
            return acc;
          }
          const productId = getEntityId(promo.product);
          acc[productId] = (acc[productId] ?? 0) + 1;
          return acc;
        }, {});

        type MutableAggregate = {
          productId: string;
          productName: string;
          stores: Set<string>;
          basePrice: number;
          offerPrice?: number;
          lastUpdated?: string;
        };

        const byProduct = pricesData.reduce<Map<string, MutableAggregate>>((acc, item) => {
          const productId = getEntityId(item.product);
          const productName = resolveEntityName({
            entity: item.product as EntityLike,
            byId: productNamesById,
            fallback: 'Producto sin nombre',
          });
          const storeName = resolveEntityName({
            entity: item.store as EntityLike,
            byId: storeNamesById,
            fallback: 'Tienda sin nombre',
          });
          const itemBasePrice = Number.parseFloat(item.price);
          const itemOfferPrice = item.offer_price ? Number.parseFloat(item.offer_price) : undefined;
          const itemUpdatedAt = item.verified_at ?? item.created_at;

          const current = acc.get(productId);
          if (!current) {
            acc.set(productId, {
              productId,
              productName,
              stores: new Set([storeName]),
              basePrice: itemBasePrice,
              offerPrice: itemOfferPrice,
              lastUpdated: itemUpdatedAt,
            });
            return acc;
          }

          current.stores.add(storeName);
          if (Number.isFinite(itemBasePrice)) {
            current.basePrice = Math.min(current.basePrice, itemBasePrice);
          }

          if (itemOfferPrice !== undefined && Number.isFinite(itemOfferPrice)) {
            current.offerPrice =
              current.offerPrice !== undefined
                ? Math.min(current.offerPrice, itemOfferPrice)
                : itemOfferPrice;
          }

          if (itemUpdatedAt && (!current.lastUpdated || new Date(itemUpdatedAt) > new Date(current.lastUpdated))) {
            current.lastUpdated = itemUpdatedAt;
          }

          return acc;
        }, new Map());

        const rows: AssociatedProductRow[] = Array.from(byProduct.values())
          .map((aggregate) => ({
            key: aggregate.productId,
            productId: aggregate.productId,
            productName: aggregate.productName,
            stores: Array.from(aggregate.stores).sort((a, b) => a.localeCompare(b, 'es')).join(', '),
            storesCount: aggregate.stores.size,
            basePrice: aggregate.basePrice,
            offerPrice: aggregate.offerPrice,
            activePromotions: promotionsByProduct[aggregate.productId] ?? 0,
            lastUpdated: aggregate.lastUpdated,
          }))
          .sort((a, b) => a.productName.localeCompare(b.productName, 'es'));

        setAssociatedProducts(rows);
      } catch {
        setAssociatedProducts([]);
      } finally {
        setAssociatedLoading(false);
      }
    };

    void loadAssociatedProducts();
  }, []);

  React.useEffect(() => {
    if (stores.length > 0 && !selectedBatchStore) {
      setSelectedBatchStore(stores[0].id);
    }
  }, [stores, selectedBatchStore]);

  const associatedColumns: ColumnsType<AssociatedProductRow> = [
    {
      title: 'Producto',
      dataIndex: 'productName',
      key: 'productName',
    },
    {
      title: 'Tiendas',
      dataIndex: 'stores',
      key: 'stores',
    },
    {
      title: 'N. tiendas',
      dataIndex: 'storesCount',
      key: 'storesCount',
      width: 120,
    },
    {
      title: 'Precio base min.',
      dataIndex: 'basePrice',
      key: 'basePrice',
      width: 150,
      render: (value: number) => `${value.toFixed(2)} EUR`,
    },
    {
      title: 'Mejor oferta',
      dataIndex: 'offerPrice',
      key: 'offerPrice',
      width: 140,
      render: (value?: number) => (value !== undefined ? `${value.toFixed(2)} EUR` : '-'),
    },
    {
      title: 'Promociones activas',
      dataIndex: 'activePromotions',
      key: 'activePromotions',
      width: 170,
    },
    {
      title: 'Última actualización',
      dataIndex: 'lastUpdated',
      key: 'lastUpdated',
      width: 170,
      render: (value?: string) =>
        value ? new Date(value).toLocaleDateString('es-ES') : '-',
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_: unknown, record: AssociatedProductRow) => (
        <Button type="link" onClick={() => openDrawer(record.productId)}>
          Editar catálogo
        </Button>
      ),
    },
  ];

  const submitProposal = async (payload: ProductProposalPayload): Promise<void> => {
    await apiClient.post('/products/proposals/', payload);
  };

  const handleManualSubmit = async (values: ProductProposalPayload) => {
    setManualLoading(true);
    try {
      const payload = normalizePayload(values);
      if (!payload) {
        throw new Error('Revisa los campos obligatorios antes de enviar el producto.');
      }
      await submitProposal(payload);
      void message.success('Producto enviado para revisión correctamente');
      manualForm.resetFields();
    } catch (err) {
      void message.error(getErrorMessage(err, 'No se pudo enviar el producto. Revisa los datos e inténtalo de nuevo.'));
    } finally {
      setManualLoading(false);
    }
  };

  const parseFileContent = (fileName: string, text: string): ProductProposalPayload[] => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.json')) {
      return parseJsonProducts(text);
    }
    return parseCsvProducts(text);
  };

  const handleBeforeUpload = async (file: File) => {
    setParseError(null);
    try {
      const text = await file.text();
      const rows = parseFileContent(file.name, text).map((row, index) => ({
        ...row,
        rowKey: `${file.name}-${index}`,
      }));

      if (rows.length === 0) {
        setBatchRows([]);
        setParseError('No se encontraron filas válidas. Revisa el formato del archivo.');
        return false;
      }

      setBatchRows(rows);
      void message.success(`Archivo procesado: ${rows.length} productos listos para subir.`);
    } catch {
      setBatchRows([]);
      setParseError('No se pudo parsear el archivo. Usa CSV o JSON con estructura válida.');
    }

    return false;
  };

  const handleBatchSubmit = async () => {
    if (batchRows.length === 0) {
      void message.warning('Primero selecciona y procesa un archivo con productos.');
      return;
    }
    if (!selectedBatchStore) {
      void message.warning('Por favor, selecciona una tienda de destino para los productos.');
      return;
    }

    setBatchLoading(true);
    const results = await Promise.allSettled(
      batchRows.map((row) => submitProposal({ ...row, store: selectedBatchStore })),
    );
    const successCount = results.filter((result) => result.status === 'fulfilled').length;
    const failureCount = results.length - successCount;

    if (successCount > 0) {
      void message.success(`Productos enviados: ${successCount}`);
    }
    if (failureCount > 0) {
      void message.warning(`Filas con error: ${failureCount}. Revisa el archivo e inténtalo otra vez.`);
    }

    if (failureCount === 0) {
      setBatchRows([]);
    }

    setBatchLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Subida de productos
          </Title>
          <Text type="secondary">Alta manual o importación desde archivo CSV/JSON</Text>
        </div>
      </div>

      {stores.length === 0 && (
        <Alert
          message="No hay tiendas asociadas"
          description="Tu perfil de negocio no tiene tiendas vinculadas. Contacta con soporte o vincula tu tienda desde el panel de administración para poder subir productos."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Tabs
        items={[
          {
            key: 'manual',
            label: 'Manual',
            children: (
              <Card className="surface-card">
                <Form<ProductProposalPayload>
                  form={manualForm}
                  layout="vertical"
                  onFinish={handleManualSubmit}
                >
                  <Title level={4}>Información básica</Title>
                  <Space style={{ display: 'flex', width: '100%' }} align="start">
                    <Form.Item
                      name="name"
                      label="Nombre del producto"
                      rules={[
                        { required: true, message: 'Introduce el nombre del producto' },
                        { min: 2, message: 'El nombre debe tener al menos 2 caracteres' },
                      ]}
                      style={{ flex: 2 }}
                    >
                      <Input placeholder="Ej. Leche semidesnatada 1L" />
                    </Form.Item>
                    <Form.Item name="brand" label="Marca" style={{ flex: 1 }}>
                      <Input placeholder="Ej. Hacendado" />
                    </Form.Item>
                  </Space>

                  <Space style={{ display: 'flex', width: '100%' }} align="start">
                    <Form.Item
                      name="barcode"
                      label="Código de barras (EAN)"
                      style={{ flex: 1 }}
                      rules={[{
                        validator: (_, value: string) =>
                          !value || validateEAN13(value)
                            ? Promise.resolve()
                            : Promise.reject(new Error('EAN-13 inválido: debe tener 13 dígitos con dígito de control correcto')),
                      }]}
                    >
                      <Input placeholder="Ej. 8412345678901" />
                    </Form.Item>
                    <Form.Item name="category" label="Categoría" style={{ flex: 1 }}>
                      <Select
                        allowClear
                        showSearch
                        placeholder="Selecciona categoría"
                        options={categoryOptions}
                        optionFilterProp="label"
                      />
                    </Form.Item>
                  </Space>

                  <Title level={4} style={{ marginTop: 16 }}>
                    Precio e Inventario
                  </Title>
                  <Space style={{ display: 'flex', width: '100%' }} align="start">
                    <Form.Item
                      name="store"
                      label="Tienda de destino"
                      rules={[{ required: true, message: 'Selecciona una tienda' }]}
                      style={{ flex: 1 }}
                    >
                      <Select
                        placeholder="Selecciona la tienda"
                        options={stores.map((s) => ({ value: s.id, label: s.name }))}
                      />
                    </Form.Item>
                    <Form.Item
                      name="price"
                      label="Precio actual"
                      rules={[{ required: true, message: 'Introduce el precio' }]}
                      style={{ flex: 1 }}
                    >
                      <Input type="number" step="0.01" prefix="€" placeholder="0.00" />
                    </Form.Item>
                    <Form.Item name="unit_price" label="Precio unitario" style={{ flex: 1 }}>
                      <Input type="number" step="0.01" prefix="€" placeholder="0.00" />
                    </Form.Item>
                  </Space>

                  <Form.Item name="image_url" label="URL de imagen">
                    <Input placeholder="https://..." />
                  </Form.Item>

                  <Form.Item name="notes" label="Notas">
                    <Input.TextArea
                      rows={3}
                      placeholder="Detalles adicionales para validar mejor el producto"
                    />
                  </Form.Item>

                  <Button type="primary" htmlType="submit" loading={manualLoading} block>
                    Enviar producto para revisión
                  </Button>
                </Form>
              </Card>
            ),
          },
          {
            key: 'file',
            label: 'Archivo',
            children: (
              <Space orientation="vertical" style={{ width: '100%' }} size={16}>
                <Card className="surface-card">
                  <Title level={4}>1. Selecciona tienda de destino</Title>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                    Todos los productos del archivo se asignarán a esta tienda tras ser aprobados.
                  </Text>
                  <Select
                    style={{ width: '100%', maxWidth: 400, marginBottom: 24 }}
                    placeholder="Selecciona la tienda"
                    value={selectedBatchStore}
                    onChange={setSelectedBatchStore}
                    options={stores.map((s) => ({ value: s.id, label: s.name }))}
                  />

                  <Title level={4}>2. Sube tu archivo</Title>
                  <Upload
                    accept=".csv,.json"
                    maxCount={1}
                    showUploadList
                    beforeUpload={(file) => {
                      void handleBeforeUpload(file as File);
                      return false;
                    }}
                  >
                    <Button icon={<UploadOutlined />} style={{ marginBottom: 12 }}>
                      Seleccionar archivo CSV o JSON
                    </Button>
                  </Upload>
                  <Text type="secondary" style={{ display: 'block' }}>
                    CSV esperado: name, brand, barcode, category, price, unit_price.
                  </Text>
                </Card>

                {parseError && <Alert type="warning" message={parseError} />}

                <Card className="surface-card" title="Previsualización">
                  <Table<ParsedRow>
                    dataSource={batchRows}
                    rowKey="rowKey"
                    pagination={{ pageSize: 8 }}
                    columns={[
                      { title: 'Nombre', dataIndex: 'name', key: 'name' },
                      { title: 'Marca', dataIndex: 'brand', key: 'brand' },
                      { title: 'EAN', dataIndex: 'barcode', key: 'barcode' },
                      {
                        title: 'Precio',
                        dataIndex: 'price',
                        key: 'price',
                        render: (val: number | undefined) => (val ? `${val}€` : '—'),
                      },
                    ]}
                  />

                  <Button
                    type="primary"
                    loading={batchLoading}
                    onClick={handleBatchSubmit}
                    disabled={batchRows.length === 0}
                    style={{ marginTop: 16 }}
                  >
                    Subir productos del archivo
                  </Button>
                </Card>
              </Space>
            ),
          },
        ]}
      />

      <Card
        className="surface-card"
        title="Productos asociados a tu negocio"
        style={{ marginTop: 16 }}
      >
        <Table<AssociatedProductRow>
          dataSource={associatedProducts}
          columns={associatedColumns}
          loading={associatedLoading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: associatedLoading ? ' ' : 'Todavía no hay productos asociados por precios o promociones.' }}
        />
      </Card>

      <Drawer
        title="Editar producto en el catálogo"
        placement="right"
        size="large"
        open={drawerOpen}
        onClose={closeDrawer}
        footer={
          <Space>
            <Button onClick={closeDrawer}>Cancelar</Button>
            <Button type="primary" loading={editLoading} onClick={() => editProductForm.submit()}>
              Guardar cambios
            </Button>
          </Space>
        }
      >
        <Alert
          message="Catálogo centralizado"
          description="Al editar este producto, los cambios afectarán a todas las tiendas que lo usen. Usa esta opción solo para corregir descripciones o códigos de barras erróneos."
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />
        <Spin spinning={editLoading}>
          <Form<ProductProposalPayload>
            form={editProductForm}
            layout="vertical"
            onFinish={handleEditSubmit}
          >
            <Form.Item
              name="name"
              label="Nombre del producto"
              rules={[{ required: true, message: 'Introduce el nombre del producto' }, { min: 2, message: 'El nombre debe tener al menos 2 caracteres' }]}
            >
              <Input placeholder="Ej. Leche semidesnatada 1L" />
            </Form.Item>

            <Form.Item name="brand" label="Marca">
              <Input placeholder="Ej. Hacendado" />
            </Form.Item>

            <Form.Item
              name="barcode"
              label="Código de barras"
              rules={[{
                validator: (_, value: string) =>
                  !value || validateEAN13(value)
                    ? Promise.resolve()
                    : Promise.reject(new Error('EAN-13 inválido: debe tener 13 dígitos con dígito de control correcto')),
              }]}
            >
              <Input placeholder="Ej. 8412345678901" />
            </Form.Item>

            <Form.Item name="category" label="Categoría">
              <Select
                allowClear
                showSearch
                placeholder="Selecciona una categoría (opcional)"
                options={categoryOptions}
              />
            </Form.Item>

            <Form.Item name="image_url" label="URL de imagen">
              <Input placeholder="https://..." />
            </Form.Item>
          </Form>
        </Spin>
      </Drawer>
    </div>
  );
};

export default ProductsUploadPage;
