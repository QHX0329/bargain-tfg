import React, { useEffect, useState } from 'react';
import {
  Button,
  Empty,
  Input,
  List,
  Modal,
  Popconfirm,
  Spin,
  Typography,
  message,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { listService } from '../../../api/listService';
import type { ShoppingList } from '../../../types/consumer';

export const ListsPage: React.FC = () => {
  const navigate = useNavigate();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);
  const [newListName, setNewListName] = useState<string>('');
  const [confirmLoading, setConfirmLoading] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listService
      .getLists()
      .then((data) => {
        if (!cancelled) setLists(data);
      })
      .catch(() => {
        if (!cancelled) void message.error('No se pudieron cargar las listas');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = async () => {
    const trimmed = newListName.trim();
    if (!trimmed) {
      void message.warning('El nombre de la lista no puede estar vacío');
      return;
    }
    setConfirmLoading(true);
    try {
      const created = await listService.createList(trimmed);
      setLists((prev) => [created, ...prev]);
      setCreating(false);
      setNewListName('');
    } catch {
      void message.error('No se pudo crear la lista');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await listService.deleteList(id);
      setLists((prev) => prev.filter((l) => l.id !== id));
    } catch {
      void message.error('No se pudo eliminar la lista');
    }
  };

  const handleModalCancel = () => {
    setCreating(false);
    setNewListName('');
  };

  return (
    <div>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}
      >
        <Typography.Title level={3} style={{ margin: 0 }}>
          Mis Listas
        </Typography.Title>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            icon={<UnorderedListOutlined />}
            onClick={() => navigate('/app/templates')}
          >
            Plantillas
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreating(true)}
          >
            Nueva lista
          </Button>
        </div>
      </div>

      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        {lists.length} lista{lists.length !== 1 ? 's' : ''}
      </Typography.Text>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : lists.length === 0 ? (
        <Empty
          description="No tienes listas aún"
          style={{ marginTop: 48 }}
        >
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>
            Crear primera lista
          </Button>
        </Empty>
      ) : (
        <List<ShoppingList>
          dataSource={lists}
          renderItem={(list) => (
            <List.Item
              key={list.id}
              actions={[
                <Button
                  key="open"
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/app/lists/${list.id}`)}
                >
                  Abrir
                </Button>,
                <Popconfirm
                  key="delete"
                  title="¿Eliminar esta lista?"
                  description="Esta acción no se puede deshacer"
                  onConfirm={() => handleDelete(list.id)}
                  okText="Eliminar"
                  cancelText="Cancelar"
                  okButtonProps={{ danger: true }}
                >
                  <Button type="text" danger icon={<DeleteOutlined />}>
                    Eliminar
                  </Button>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                title={<Link to={`/app/lists/${list.id}`}>{list.name}</Link>}
                description={`${list.items?.length ?? 0} artículo${(list.items?.length ?? 0) !== 1 ? 's' : ''} · ${list.is_archived ? 'Archivada' : 'Activa'}`}
              />
            </List.Item>
          )}
          bordered
        />
      )}

      <Modal
        title="Nueva lista de la compra"
        open={creating}
        onOk={() => void handleCreate()}
        onCancel={handleModalCancel}
        confirmLoading={confirmLoading}
        okText="Crear"
        cancelText="Cancelar"
      >
        <Input
          placeholder="Nombre de la lista (ej. Semana del 3 de junio)"
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
          onPressEnter={() => void handleCreate()}
          autoFocus
          style={{ marginTop: 8 }}
        />
      </Modal>
    </div>
  );
};

export default ListsPage;
