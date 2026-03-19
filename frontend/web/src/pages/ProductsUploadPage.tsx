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
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { apiClient } from '../api/client';

const { Title, Text } = Typography;

interface ProductProposalPayload {
  name: string;
  brand?: string;
  barcode?: string;
  category?: number;
  image_url?: string;
  notes?: string;
}

interface CategoryNode {
  id: number;
  name: string;
  children?: CategoryNode[];
}

interface ParsedRow extends ProductProposalPayload {
  rowKey: string;
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

  return {
    name: raw.name.trim(),
    brand: raw.brand?.trim() || undefined,
    barcode: raw.barcode?.trim() || undefined,
    category: normalizeCategory(raw.category),
    image_url: raw.image_url?.trim() || undefined,
    notes: raw.notes?.trim() || undefined,
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
        raw[mappedKey] = value;
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

  const submitProposal = async (payload: ProductProposalPayload): Promise<void> => {
    await apiClient.post('/products/proposals/', payload);
  };

  const handleManualSubmit = async (values: ProductProposalPayload) => {
    setManualLoading(true);
    try {
      await submitProposal(values);
      void message.success('Producto enviado para revisión correctamente');
      manualForm.resetFields();
    } catch {
      void message.error('No se pudo enviar el producto. Revisa los datos e inténtalo de nuevo.');
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

    setBatchLoading(true);
    const results = await Promise.allSettled(batchRows.map((row) => submitProposal(row)));
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>
          Subida de productos
        </Title>
        <Text type="secondary">Alta manual o importación desde archivo CSV/JSON</Text>
      </div>

      <Tabs
        items={[
          {
            key: 'manual',
            label: 'Manual',
            children: (
              <Card>
                <Form<ProductProposalPayload>
                  form={manualForm}
                  layout="vertical"
                  onFinish={handleManualSubmit}
                >
                  <Form.Item
                    name="name"
                    label="Nombre del producto"
                    rules={[
                      { required: true, message: 'Introduce el nombre del producto' },
                      { min: 2, message: 'El nombre debe tener al menos 2 caracteres' },
                    ]}
                  >
                    <Input placeholder="Ej. Leche semidesnatada 1L" />
                  </Form.Item>

                  <Form.Item name="brand" label="Marca">
                    <Input placeholder="Ej. Hacendado" />
                  </Form.Item>

                  <Form.Item name="barcode" label="Código de barras">
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

                  <Form.Item name="notes" label="Notas">
                    <Input.TextArea
                      rows={3}
                      placeholder="Detalles adicionales para validar mejor el producto"
                    />
                  </Form.Item>

                  <Button type="primary" htmlType="submit" loading={manualLoading}>
                    Enviar producto
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
                <Card>
                  <Upload
                    accept=".csv,.json"
                    maxCount={1}
                    showUploadList
                    beforeUpload={(file) => {
                      void handleBeforeUpload(file as File);
                      return false;
                    }}
                  >
                    <Button icon={<UploadOutlined />}>Seleccionar archivo CSV o JSON</Button>
                  </Upload>
                  <Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
                    CSV esperado: columnas name, brand, barcode, category/category_id, image_url, notes.
                  </Text>
                </Card>

                {parseError && <Alert type="warning" message={parseError} />}

                <Card title="Previsualización">
                  <Table<ParsedRow>
                    dataSource={batchRows}
                    rowKey="rowKey"
                    pagination={{ pageSize: 8 }}
                    columns={[
                      { title: 'Nombre', dataIndex: 'name', key: 'name' },
                      { title: 'Marca', dataIndex: 'brand', key: 'brand' },
                      { title: 'EAN', dataIndex: 'barcode', key: 'barcode' },
                      { title: 'Categoría (ID)', dataIndex: 'category', key: 'category' },
                    ]}
                  />

                  <Button
                    type="primary"
                    loading={batchLoading}
                    onClick={handleBatchSubmit}
                    disabled={batchRows.length === 0}
                  >
                    Subir productos del archivo
                  </Button>
                </Card>
              </Space>
            ),
          },
        ]}
      />
    </div>
  );
};

export default ProductsUploadPage;
