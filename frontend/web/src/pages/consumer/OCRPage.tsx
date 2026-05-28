import React, { useState, useEffect } from 'react';
import { Button, Select, Space, Spin, Table, Tag, Typography, Upload, message } from 'antd';
import { InboxOutlined, ScanOutlined } from '@ant-design/icons';
import type { UploadChangeParam } from 'antd/es/upload';
import { ocrService } from '../../../api/ocrService';
import { listService } from '../../../api/listService';
import type { OCRItem, ShoppingList } from '../../../types/consumer';

const OCRPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [items, setItems] = useState<OCRItem[]>([]);
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [addingToList, setAddingToList] = useState<boolean>(false);

  useEffect(() => {
    listService
      .getLists()
      .then(setLists)
      .catch(() => message.error('No se pudieron cargar las listas'));
  }, []);

  const handleUploadChange = (info: UploadChangeParam) => {
    const f = info.file.originFileObj as File | undefined;
    if (f) {
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
      setItems([]);
    }
  };

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const response = await ocrService.processImage(file);
      setItems(response.items);
    } catch {
      message.error('Error al procesar la imagen');
    } finally {
      setProcessing(false);
    }
  };

  const handleAddAll = async () => {
    if (!selectedListId) return;
    const matchedItems = items.filter((i) => i.matched_product_name);
    if (matchedItems.length === 0) return;

    setAddingToList(true);
    let count = 0;
    try {
      for (const item of matchedItems) {
        await listService.addItem(selectedListId, {
          name: item.matched_product_name ?? item.raw_text,
          quantity: item.quantity || 1,
        });
        count++;
      }
      message.success(`${count} artículo(s) añadidos`);
    } catch {
      message.error('Error al añadir artículos a la lista');
    } finally {
      setAddingToList(false);
    }
  };

  const columns = [
    {
      title: 'Texto original',
      dataIndex: 'raw_text' as const,
    },
    {
      title: 'Producto detectado',
      dataIndex: 'matched_product_name' as const,
      render: (v?: string) =>
        v ? <span>{v}</span> : <Tag color="orange">Sin coincidencia</Tag>,
    },
    {
      title: 'Cantidad',
      dataIndex: 'quantity' as const,
    },
    {
      title: 'Confianza',
      dataIndex: 'confidence' as const,
      render: (v: number) => `${Math.round(v * 100)}%`,
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>Escanear Ticket o Lista</Typography.Title>
      <Typography.Text type="secondary" style={{ marginBottom: 24, display: 'block' }}>
        Sube una foto de tu ticket de compra o lista manuscrita para extraer los artículos
        automáticamente.
      </Typography.Text>

      {/* Upload area */}
      <Upload.Dragger
        name="image"
        accept="image/*"
        multiple={false}
        showUploadList={false}
        beforeUpload={() => false}
        onChange={handleUploadChange}
        style={{ marginBottom: 16 }}
      >
        <p>
          <InboxOutlined style={{ fontSize: 48, color: '#5f5e5e' }} />
        </p>
        <p>Haz clic o arrastra una imagen aquí</p>
        <p>
          <Typography.Text type="secondary">JPG, PNG, HEIC — máximo 10 MB</Typography.Text>
        </p>
      </Upload.Dragger>

      {/* Image preview */}
      {previewUrl && (
        <div style={{ marginBottom: 16 }}>
          <img src={previewUrl} alt="Vista previa" style={{ maxHeight: 200, borderRadius: 8 }} />
        </div>
      )}

      {/* Process button */}
      <Button
        type="primary"
        icon={<ScanOutlined />}
        onClick={handleProcess}
        loading={processing}
        disabled={!file}
        style={{ marginBottom: 24 }}
      >
        Procesar imagen
      </Button>

      {/* Results */}
      {processing && (
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Spin tip="Procesando imagen..." />
        </div>
      )}

      {items.length > 0 && (
        <>
          <Typography.Title level={4}>Artículos detectados ({items.length})</Typography.Title>
          <Table<OCRItem>
            dataSource={items}
            rowKey={(_, idx) => String(idx)}
            pagination={false}
            size="small"
            columns={columns}
            style={{ marginBottom: 16 }}
          />

          {/* Add to list */}
          <Space wrap>
            <Select
              placeholder="Selecciona una lista"
              value={selectedListId}
              onChange={setSelectedListId}
              style={{ width: 240 }}
              options={lists.map((l) => ({ value: l.id, label: l.name }))}
            />
            <Button
              type="primary"
              onClick={handleAddAll}
              loading={addingToList}
              disabled={
                !selectedListId || items.filter((i) => i.matched_product_name).length === 0
              }
            >
              Añadir artículos detectados a la lista
            </Button>
          </Space>
        </>
      )}
    </div>
  );
};

export default OCRPage;
