import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Empty, Spin, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { priceService } from '../../../api/priceService';
import type { PriceCompare } from '../../../types/consumer';

export const PriceComparePage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();

  const [prices, setPrices] = useState<PriceCompare[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }

    priceService
      .compare(productId)
      .then((data) => {
        setPrices(data);
      })
      .catch(() => {
        setPrices([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [productId]);

  const columns: ColumnsType<PriceCompare> = [
    {
      title: 'Tienda',
      dataIndex: 'store_name',
      sorter: (a: PriceCompare, b: PriceCompare) =>
        a.store_name.localeCompare(b.store_name),
    },
    {
      title: 'Precio',
      dataIndex: 'price',
      defaultSortOrder: 'ascend',
      sorter: (a: PriceCompare, b: PriceCompare) =>
        parseFloat(a.price) - parseFloat(b.price),
      render: (v: string) => `${parseFloat(v).toFixed(2)} €`,
    },
    {
      title: 'Oferta',
      dataIndex: 'offer_price',
      render: (v: string | null) => (v ? `${parseFloat(v).toFixed(2)} €` : '—'),
    },
    {
      title: 'Fuente',
      dataIndex: 'source',
    },
    {
      title: 'Distancia',
      dataIndex: 'distance_km',
      render: (v: number | null) => (v != null ? `${v.toFixed(1)} km` : '—'),
    },
    {
      title: 'Actualizado',
      dataIndex: 'verified_at',
      render: (v: string) => new Date(v).toLocaleDateString('es-ES'),
    },
    {
      title: 'Estado',
      dataIndex: 'is_stale',
      render: (v: boolean) => (
        <Tag color={v ? 'orange' : 'green'}>{v ? 'Desactualizado' : 'Actualizado'}</Tag>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: 16 }}>
        <Button onClick={() => navigate(-1)}>← Volver</Button>
      </div>

      <Typography.Title level={3}>
        Comparar precios — Producto #{productId}
      </Typography.Title>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
          <Spin size="large" />
        </div>
      ) : prices.length === 0 ? (
        <Empty description="No hay precios disponibles para este producto" />
      ) : (
        <Table<PriceCompare>
          dataSource={prices}
          rowKey="store_id"
          columns={columns}
          pagination={false}
        />
      )}
    </div>
  );
};

export default PriceComparePage;
