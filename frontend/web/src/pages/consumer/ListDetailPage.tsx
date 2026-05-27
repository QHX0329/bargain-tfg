import React, { useEffect, useState } from 'react';
import {
  Button,
  Checkbox,
  Empty,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Typography,
  Input,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  PlusOutlined,
  RocketOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { listService } from '../../../api/listService';
import type { ShoppingList, ShoppingListItem } from '../../../types/consumer';

export const ListDetailPage: React.FC = () => {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();

  const [list, setList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemQty, setNewItemQty] = useState<number>(1);
  const [addingItem, setAddingItem] = useState<boolean>(false);

  // Save-as-template modal state
  const [templateModalOpen, setTemplateModalOpen] = useState<boolean>(false);
  const [templateName, setTemplateName] = useState<string>('');
  const [savingTemplate, setSavingTemplate] = useState<boolean>(false);

  useEffect(() => {
    if (!listId) return;
    let cancelled = false;
    setLoading(true);
    listService
      .getList(listId)
      .then((data) => {
        if (!cancelled) setList(data);
      })
      .catch(() => {
        if (!cancelled) void message.error('No se pudo cargar la lista');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listId]);

  const handleToggleItem = async (item: ShoppingListItem) => {
    if (!listId) return;
    const updated = await listService
      .updateItem(listId, item.id, { is_checked: !item.is_checked })
      .catch(() => {
        void message.error('No se pudo actualizar el artículo');
        return null;
      });
    if (!updated) return;
    setList((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((i) => (i.id === item.id ? updated : i)),
      };
    });
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!listId) return;
    try {
      await listService.deleteItem(listId, itemId);
      setList((prev) => {
        if (!prev) return prev;
        return { ...prev, items: prev.items.filter((i) => i.id !== itemId) };
      });
    } catch {
      void message.error('No se pudo eliminar el artículo');
    }
  };

  const handleAddItem = async () => {
    if (!listId) return;
    const trimmed = newItemName.trim();
    if (!trimmed) {
      void message.warning('El nombre del artículo no puede estar vacío');
      return;
    }
    setAddingItem(true);
    try {
      const created = await listService.addItem(listId, {
        name: trimmed,
        quantity: newItemQty,
      });
      setList((prev) => {
        if (!prev) return prev;
        return { ...prev, items: [created, ...prev.items] };
      });
      setNewItemName('');
      setNewItemQty(1);
    } catch {
      void message.error('No se pudo añadir el artículo');
    } finally {
      setAddingItem(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!listId) return;
    const trimmed = templateName.trim();
    if (!trimmed) {
      void message.warning('El nombre de la plantilla no puede estar vacío');
      return;
    }
    setSavingTemplate(true);
    try {
      await listService.saveAsTemplate(listId, trimmed);
      void message.success('Plantilla guardada');
      setTemplateModalOpen(false);
      setTemplateName('');
    } catch {
      void message.error('No se pudo guardar la plantilla');
    } finally {
      setSavingTemplate(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 64 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!list) {
    return (
      <Empty description="Lista no encontrada">
        <Link to="/app/lists">
          <Button icon={<ArrowLeftOutlined />}>Volver a mis listas</Button>
        </Link>
      </Empty>
    );
  }

  const checkedCount = list.items.filter((i) => i.is_checked).length;

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 8,
        }}
      >
        <div>
          <Link to="/app/lists" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
            <ArrowLeftOutlined /> Mis listas
          </Link>
          <Typography.Title level={3} style={{ margin: 0 }}>
            {list.name}
          </Typography.Title>
          <Typography.Text type="secondary">
            {checkedCount}/{list.items.length} artículo{list.items.length !== 1 ? 's' : ''} completados
          </Typography.Text>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <Button
            icon={<SaveOutlined />}
            onClick={() => {
              setTemplateName(list.name);
              setTemplateModalOpen(true);
            }}
          >
            Guardar como plantilla
          </Button>
          <Button
            type="primary"
            icon={<RocketOutlined />}
            onClick={() => navigate(`/app/lists/${listId}/route`)}
          >
            Optimizar ruta
          </Button>
        </div>
      </div>

      {/* Item list */}
      {list.items.length === 0 ? (
        <Empty description="No hay artículos en esta lista" style={{ marginTop: 32 }} />
      ) : (
        <List<ShoppingListItem>
          dataSource={list.items}
          renderItem={(item) => (
            <List.Item
              key={item.id}
              actions={[
                <Popconfirm
                  key="delete"
                  title="¿Eliminar este artículo?"
                  onConfirm={() => void handleDeleteItem(item.id)}
                  okText="Eliminar"
                  cancelText="Cancelar"
                  okButtonProps={{ danger: true }}
                >
                  <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                </Popconfirm>,
              ]}
            >
              <Space align="center">
                <Checkbox
                  checked={item.is_checked ?? false}
                  onChange={() => void handleToggleItem(item)}
                />
                <span
                  style={{
                    textDecoration: item.is_checked ? 'line-through' : 'none',
                    color: item.is_checked ? '#999' : undefined,
                  }}
                >
                  {item.name}
                </span>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  ×{item.quantity}
                </Typography.Text>
                {item.latest_price != null && (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {item.latest_price.toFixed(2)} €
                  </Typography.Text>
                )}
              </Space>
            </List.Item>
          )}
          bordered
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Add item form */}
      <Space.Compact style={{ width: '100%', marginTop: 16 }}>
        <Input
          placeholder="Nombre del artículo (ej. Leche entera)"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          onPressEnter={() => void handleAddItem()}
        />
        <InputNumber
          min={1}
          max={999}
          value={newItemQty}
          onChange={(v) => setNewItemQty(v ?? 1)}
          style={{ width: 80 }}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => void handleAddItem()}
          loading={addingItem}
        >
          Añadir
        </Button>
      </Space.Compact>

      {/* Save as template modal */}
      <Modal
        title="Guardar como plantilla"
        open={templateModalOpen}
        onOk={() => void handleSaveAsTemplate()}
        onCancel={() => {
          setTemplateModalOpen(false);
          setTemplateName('');
        }}
        confirmLoading={savingTemplate}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Input
          placeholder="Nombre de la plantilla"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          onPressEnter={() => void handleSaveAsTemplate()}
          autoFocus
          style={{ marginTop: 8 }}
        />
      </Modal>
    </div>
  );
};

export default ListDetailPage;
