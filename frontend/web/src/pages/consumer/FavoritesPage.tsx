import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Typography, List, Tag, Button, Spin, Empty, message } from 'antd';
import { StarFilled } from '@ant-design/icons';
import { storeService } from '../../../api/storeService';
import type { Store } from '../../../types/consumer';

const FavoritesPage: React.FC = () => {
  const [favorites, setFavorites] = useState<Store[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    storeService
      .getFavorites()
      .then((data) => setFavorites(data))
      .catch(() => setFavorites([]))
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (storeId: string) => {
    setRemovingId(storeId);
    try {
      await storeService.toggleFavorite(storeId);
      setFavorites((prev) => prev.filter((s) => s.id !== storeId));
      message.success('Tienda eliminada de favoritas');
    } catch {
      message.error('No se pudo eliminar la tienda de favoritas');
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return <Spin tip="Cargando favoritas..." style={{ display: 'block', marginTop: 48 }} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Tiendas Favoritas
        </Typography.Title>
        <Link to="/app/map">
          <Button size="small">Volver al mapa</Button>
        </Link>
      </div>

      {favorites.length === 0 ? (
        <Empty description="No tienes tiendas favoritas" />
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={favorites}
          renderItem={(store) => (
            <List.Item
              actions={[
                <Button
                  key="remove"
                  danger
                  size="small"
                  icon={<StarFilled />}
                  loading={removingId === store.id}
                  onClick={() => void handleRemove(store.id)}
                >
                  Quitar
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Link to={`/app/map/store/${store.id}`}>
                    {store.name}
                  </Link>
                }
                description={
                  <span>
                    <Tag color="blue">{store.chain}</Tag>
                    {store.address}
                  </span>
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );
};

export default FavoritesPage;
