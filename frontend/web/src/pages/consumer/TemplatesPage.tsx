import React, { useEffect, useState } from 'react';
import {
  Button,
  Empty,
  Input,
  List,
  Modal,
  Popconfirm,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { listService } from '../../../api/listService';
import type { ListTemplate } from '../../../types/consumer';

export const TemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<ListTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Create-from-template modal state
  const [selectedTemplate, setSelectedTemplate] = useState<ListTemplate | null>(null);
  const [newListName, setNewListName] = useState<string>('');
  const [creating, setCreating] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listService
      .getTemplates()
      .then((data) => {
        if (!cancelled) setTemplates(data);
      })
      .catch(() => {
        if (!cancelled) void message.error('No se pudieron cargar las plantillas');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleOpenCreateModal = (template: ListTemplate) => {
    setSelectedTemplate(template);
    setNewListName(template.name);
  };

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplate) return;
    const trimmed = newListName.trim();
    setCreating(true);
    try {
      const newList = await listService.createListFromTemplate(
        selectedTemplate.id,
        trimmed || undefined,
      );
      void message.success(`Lista "${newList.name}" creada`);
      setSelectedTemplate(null);
      setNewListName('');
      navigate(`/app/lists/${newList.id}`);
    } catch {
      void message.error('No se pudo crear la lista desde la plantilla');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await listService.deleteTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch {
      void message.error('No se pudo eliminar la plantilla');
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 8 }}>
        <Link to="/app/lists" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
          <ArrowLeftOutlined /> Mis listas
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Plantillas de Lista
          </Typography.Title>
          <Typography.Text type="secondary">
            {templates.length} plantilla{templates.length !== 1 ? 's' : ''}
          </Typography.Text>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 64 }}>
          <Spin size="large" />
        </div>
      ) : templates.length === 0 ? (
        <Empty
          description="No tienes plantillas guardadas"
          style={{ marginTop: 48 }}
        >
          <Typography.Text type="secondary">
            Guarda una lista como plantilla desde la pantalla de detalle de lista.
          </Typography.Text>
        </Empty>
      ) : (
        <List<ListTemplate>
          dataSource={templates}
          renderItem={(template) => (
            <List.Item
              key={template.id}
              actions={[
                <Button
                  key="create"
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => handleOpenCreateModal(template)}
                >
                  Crear lista
                </Button>,
                <Popconfirm
                  key="delete"
                  title="¿Eliminar esta plantilla?"
                  description="Esta acción no se puede deshacer"
                  onConfirm={() => void handleDeleteTemplate(template.id)}
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
                title={template.name}
                description={
                  <Tag color="blue">
                    {template.item_count} artículo{template.item_count !== 1 ? 's' : ''}
                  </Tag>
                }
              />
            </List.Item>
          )}
          bordered
        />
      )}

      {/* Create list from template modal */}
      <Modal
        title={`Crear lista desde "${selectedTemplate?.name ?? ''}"`}
        open={selectedTemplate !== null}
        onOk={() => void handleCreateFromTemplate()}
        onCancel={() => {
          setSelectedTemplate(null);
          setNewListName('');
        }}
        confirmLoading={creating}
        okText="Crear lista"
        cancelText="Cancelar"
      >
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
          Nombre para la nueva lista (opcional — se usará el nombre de la plantilla si se deja vacío):
        </Typography.Text>
        <Input
          placeholder={selectedTemplate?.name ?? 'Nombre de la lista'}
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
          onPressEnter={() => void handleCreateFromTemplate()}
          autoFocus
        />
      </Modal>
    </div>
  );
};

export default TemplatesPage;
