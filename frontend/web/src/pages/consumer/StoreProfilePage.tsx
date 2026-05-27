import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Tag, Descriptions, Card, Button, Space, Spin, Empty, message } from 'antd';
import { StarFilled, StarOutlined } from '@ant-design/icons';
import { storeService } from '../../../api/storeService';
import type { Store } from '../../../types/consumer';

const StoreProfilePage: React.FC = () => {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();

  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [favoriteLoading, setFavoriteLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    storeService
      .getDetail(storeId)
      .then((data) => setStore(data))
      .catch(() => setStore(null))
      .finally(() => setLoading(false));
  }, [storeId]);

  const handleToggleFavorite = async () => {
    if (!store || !storeId) return;
    setFavoriteLoading(true);
    try {
      const newIsFavorite = await storeService.toggleFavorite(storeId);
      setStore({ ...store, isFavorite: newIsFavorite });
      message.success(newIsFavorite ? 'Añadida a favoritas' : 'Eliminada de favoritas');
    } catch {
      message.error('No se pudo actualizar el favorito');
    } finally {
      setFavoriteLoading(false);
    }
  };

  if (loading) {
    return <Spin tip="Cargando tienda..." style={{ display: 'block', marginTop: 48 }} />;
  }

  if (!store) {
    return (
      <Empty
        description="No se encontró la tienda"
        style={{ marginTop: 48 }}
      />
    );
  }

  return (
    <div>
      <Typography.Title level={3}>{store.name}</Typography.Title>
      <Space wrap style={{ marginBottom: 8 }}>
        <Tag color="blue">{store.chain}</Tag>
        {store.isFavorite && <Tag color="gold">Favorita</Tag>}
        <Tag color={store.isOpen ? 'green' : 'red'}>{store.isOpen ? 'Abierto' : 'Cerrado'}</Tag>
      </Space>

      <Descriptions column={1} bordered style={{ marginTop: 16 }}>
        <Descriptions.Item label="Dirección">{store.address}</Descriptions.Item>
        <Descriptions.Item label="Cadena">{store.chain}</Descriptions.Item>
        <Descriptions.Item label="Estado">{store.isOpen ? 'Abierto' : 'Cerrado'}</Descriptions.Item>
        {store.distanceKm > 0 && (
          <Descriptions.Item label="Distancia">{store.distanceKm.toFixed(1)} km</Descriptions.Item>
        )}
        {store.estimatedMinutes > 0 && (
          <Descriptions.Item label="Tiempo estimado">
            {store.estimatedMinutes} min
          </Descriptions.Item>
        )}
      </Descriptions>

      {store.openingHours && Object.keys(store.openingHours).length > 0 && (
        <Card title="Horarios" style={{ marginTop: 16 }}>
          {Object.entries(store.openingHours).map(([day, hours]) => (
            <div key={day}>
              <Typography.Text strong>{day}:</Typography.Text> {hours}
            </div>
          ))}
        </Card>
      )}

      <Space style={{ marginTop: 24 }}>
        <Button
          type={store.isFavorite ? 'default' : 'primary'}
          icon={store.isFavorite ? <StarFilled /> : <StarOutlined />}
          loading={favoriteLoading}
          onClick={() => void handleToggleFavorite()}
        >
          {store.isFavorite ? 'Quitar de favoritas' : 'Añadir a favoritas'}
        </Button>
        <Button onClick={() => navigate(-1)}>Volver</Button>
      </Space>
    </div>
  );
};

export default StoreProfilePage;
