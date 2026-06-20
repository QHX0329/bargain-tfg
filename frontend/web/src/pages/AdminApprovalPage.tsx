import React, { useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  ShopOutlined,
  TagOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { apiClient } from '../api/client';
import { getErrorMessage } from '../utils/errorMessage';

const { Title, Text } = Typography;

interface BusinessProfile {
  id: number;
  business_name: string;
  tax_id: string;
  address: string;
  website?: string;
  is_verified: boolean;
  rejection_reason?: string;
  user?: { username: string; email: string };
  created_at?: string;
}

interface ProductProposal {
  id: number;
  name: string;
  brand?: string;
  barcode?: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  price?: string;
  store?: number;
  proposed_by?: { username: string };
  created_at?: string;
}

const AdminApprovalPage: React.FC = () => {
  const [profiles, setProfiles] = useState<BusinessProfile[]>([]);
  const [proposals, setProposals] = useState<ProductProposal[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [loadingProposals, setLoadingProposals] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const [rejectModal, setRejectModal] = useState<{
    open: boolean;
    type: 'profile' | 'proposal';
    id: number | null;
  }>({ open: false, type: 'profile', id: null });
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const res = await apiClient.get<BusinessProfile[] | { results?: BusinessProfile[] }>(
        '/business/profiles/?is_verified=false',
      );
      const data = res.data;
      const list = Array.isArray(data) ? data : (data.results ?? []);
      setProfiles(list.filter((p) => !p.is_verified));
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      if (e.response?.status === 403) setForbidden(true);
      else void message.error(getErrorMessage(err, 'No se pudieron cargar los perfiles pendientes.'));
    } finally {
      setLoadingProfiles(false);
    }
  };

  const fetchProposals = async () => {
    setLoadingProposals(true);
    try {
      const res = await apiClient.get<
        ProductProposal[] | { results?: ProductProposal[] }
      >('/products/proposals/admin/?status=pending');
      const data = res.data;
      setProposals(Array.isArray(data) ? data : (data.results ?? []));
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      if (e.response?.status === 403) setForbidden(true);
      else void message.error(getErrorMessage(err, 'No se pudieron cargar las propuestas pendientes.'));
    } finally {
      setLoadingProposals(false);
    }
  };

  useEffect(() => {
    void fetchProfiles();
    void fetchProposals();
  }, []);

  const handleApproveProfile = async (id: number) => {
    setActionLoading(true);
    try {
      await apiClient.post(`/business/profiles/${id}/approve/`);
      void message.success('Perfil aprobado');
      setProfiles((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      void message.error(getErrorMessage(err, 'No se pudo aprobar el perfil. Inténtalo de nuevo.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveProposal = async (id: number) => {
    setActionLoading(true);
    try {
      await apiClient.post(`/products/proposals/admin/${id}/approve/`);
      void message.success('Propuesta aprobada y producto creado');
      setProposals((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      void message.error(getErrorMessage(err, 'No se pudo aprobar la propuesta. Inténtalo de nuevo.'));
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (type: 'profile' | 'proposal', id: number) => {
    setRejectReason('');
    setRejectModal({ open: true, type, id });
  };

  const handleRejectConfirm = async () => {
    if (!rejectModal.id) return;
    setActionLoading(true);
    try {
      const { type, id } = rejectModal;
      if (type === 'profile') {
        await apiClient.post(`/business/profiles/${id}/reject/`, { reason: rejectReason });
        void message.success('Perfil rechazado');
        setProfiles((prev) => prev.filter((p) => p.id !== id));
      } else {
        await apiClient.post(`/products/proposals/admin/${id}/reject/`, { reason: rejectReason });
        void message.success('Propuesta rechazada');
        setProposals((prev) => prev.filter((p) => p.id !== id));
      }
      setRejectModal({ open: false, type: 'profile', id: null });
    } catch (err) {
      void message.error(getErrorMessage(err, 'No se pudo completar el rechazo. Inténtalo de nuevo.'));
    } finally {
      setActionLoading(false);
    }
  };

  if (forbidden) {
    return (
      <Alert
        type="error"
        showIcon
        message="Acceso denegado"
        description="Esta sección es exclusiva para administradores."
        style={{ margin: 24 }}
      />
    );
  }

  const profileColumns: ColumnsType<BusinessProfile> = [
    {
      title: 'Negocio',
      dataIndex: 'business_name',
      key: 'business_name',
      render: (name: string, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.user?.email ?? '—'}
          </Text>
        </Space>
      ),
    },
    { title: 'CIF/NIF', dataIndex: 'tax_id', key: 'tax_id' },
    { title: 'Dirección', dataIndex: 'address', key: 'address', ellipsis: true },
    {
      title: 'Web',
      dataIndex: 'website',
      key: 'website',
      render: (url?: string) =>
        url ? (
          <a href={url} target="_blank" rel="noopener noreferrer">
            {url}
          </a>
        ) : (
          '—'
        ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space>
          <Tooltip title="Aprobar">
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              size="small"
              loading={actionLoading}
              onClick={() => handleApproveProfile(record.id)}
            />
          </Tooltip>
          <Tooltip title="Rechazar">
            <Button
              danger
              icon={<CloseCircleOutlined />}
              size="small"
              onClick={() => openRejectModal('profile', record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const proposalColumns: ColumnsType<ProductProposal> = [
    {
      title: 'Producto',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name}</Text>
          {record.brand && <Text type="secondary" style={{ fontSize: 12 }}>{record.brand}</Text>}
        </Space>
      ),
    },
    { title: 'EAN', dataIndex: 'barcode', key: 'barcode', render: (v?: string) => v ?? '—' },
    {
      title: 'Precio',
      dataIndex: 'price',
      key: 'price',
      render: (v?: string) => (v ? `${parseFloat(v).toFixed(2)} €` : '—'),
    },
    {
      title: 'Usuario',
      key: 'proposed_by',
      render: (_: unknown, record) => record.proposed_by?.username ?? '—',
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={s === 'pending' ? 'orange' : s === 'approved' ? 'green' : 'red'}>
          {s === 'pending' ? 'Pendiente' : s === 'approved' ? 'Aprobado' : 'Rechazado'}
        </Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space>
          <Tooltip title="Aprobar y crear producto">
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              size="small"
              loading={actionLoading}
              onClick={() => handleApproveProposal(record.id)}
            />
          </Tooltip>
          <Tooltip title="Rechazar">
            <Button
              danger
              icon={<CloseCircleOutlined />}
              size="small"
              onClick={() => openRejectModal('proposal', record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'profiles',
      label: (
        <span>
          <ShopOutlined />
          Perfiles PYME{' '}
          {profiles.length > 0 && <Badge count={profiles.length} style={{ marginLeft: 6 }} />}
        </span>
      ),
      children: (
        <Table
          columns={profileColumns}
          dataSource={profiles}
          rowKey="id"
          loading={loadingProfiles}
          locale={{
            emptyText: loadingProfiles ? ' ' : (
              <Space direction="vertical">
                <CheckCircleOutlined style={{ fontSize: 32, color: '#5a7d66' }} />
                <Text type="secondary">No hay perfiles pendientes de aprobación</Text>
              </Space>
            ),
          }}
          pagination={{ pageSize: 10 }}
          size="middle"
        />
      ),
    },
    {
      key: 'proposals',
      label: (
        <span>
          <TagOutlined />
          Propuestas de Producto{' '}
          {proposals.length > 0 && <Badge count={proposals.length} style={{ marginLeft: 6 }} />}
        </span>
      ),
      children: (
        <Table
          columns={proposalColumns}
          dataSource={proposals}
          rowKey="id"
          loading={loadingProposals}
          locale={{
            emptyText: loadingProposals ? ' ' : (
              <Space direction="vertical">
                <CheckCircleOutlined style={{ fontSize: 32, color: '#5a7d66' }} />
                <Text type="secondary">No hay propuestas pendientes de revisión</Text>
              </Space>
            ),
          }}
          pagination={{ pageSize: 10 }}
          size="middle"
        />
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 24 }} align="center">
        <ExclamationCircleOutlined style={{ fontSize: 20, color: '#8f6d43' }} />
        <Title level={4} style={{ margin: 0 }}>
          Panel de Administración
        </Title>
      </Space>

      <Tabs items={tabItems} />

      <Modal
        title="Motivo del rechazo"
        open={rejectModal.open}
        onOk={handleRejectConfirm}
        onCancel={() => setRejectModal({ open: false, type: 'profile', id: null })}
        okText="Rechazar"
        okButtonProps={{ danger: true, loading: actionLoading }}
        cancelText="Cancelar"
      >
        <Form layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item label="Motivo (opcional)">
            <Input.TextArea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explica brevemente el motivo del rechazo..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminApprovalPage;
