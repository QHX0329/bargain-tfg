import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, List, Typography, Spin, Alert } from 'antd';
import { ShopOutlined, TagsOutlined, DollarOutlined } from '@ant-design/icons';
import { apiClient } from '../api/client';
import { useBusinessStore } from '../store/businessStore';
import type { BusinessProfile, Promotion } from '../store/businessStore';
import { extractBusinessProfiles } from '../utils/businessProfiles';

const { Title, Text } = Typography;

interface PriceRecord {
  id: string;
  product: { id: string; name: string };
  price: string;
  updated_at: string;
}

const DashboardPage: React.FC = () => {
  const { profile, setProfile } = useBusinessStore();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [recentPrices, setRecentPrices] = useState<PriceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [profileRes, promotionsRes, pricesRes] = await Promise.all([
          apiClient.get<BusinessProfile[]>('/business/profiles/'),
          apiClient.get<Promotion[]>('/business/promotions/?is_active=true'),
          apiClient.get<{ results?: PriceRecord[] } | PriceRecord[]>(
            '/business/prices/?limit=5&ordering=-updated_at',
          ),
        ]);

        const profiles = extractBusinessProfiles(profileRes.data);
        if (profiles.length > 0) {
          setProfile(profiles[0]);
        }

        const promotionsData = promotionsRes.data;
        setPromotions(Array.isArray(promotionsData) ? promotionsData : []);

        const pricesData = pricesRes.data;
        if (Array.isArray(pricesData)) {
          setRecentPrices(pricesData);
        } else if (pricesData && 'results' in pricesData && Array.isArray(pricesData.results)) {
          setRecentPrices(pricesData.results);
        }
      } catch {
        setError('Error al cargar los datos del dashboard. Comprueba la conexión con el servidor.');
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [setProfile]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return <Alert type="error" message={error} />;
  }

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>
        Dashboard
      </Title>

      <Row gutter={[16, 16]} align="stretch">
        <Col xs={24} sm={8} style={{ display: 'flex' }}>
          <Card style={{ width: '100%', height: '100%' }}>
            <Statistic
              title="Nombre del negocio"
              value={profile?.business_name ?? '—'}
              prefix={<ShopOutlined />}
              styles={{ content: { fontSize: 18 } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8} style={{ display: 'flex' }}>
          <Card style={{ width: '100%', height: '100%' }}>
            <Statistic
              title="Promociones activas"
              value={promotions.length}
              prefix={<TagsOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8} style={{ display: 'flex' }}>
          <Card style={{ width: '100%', height: '100%' }}>
            <Statistic
              title="Últimas actualizaciones de precio"
              value={recentPrices.length}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24}>
          <Card title="Últimas actualizaciones de precio">
            {recentPrices.length === 0 ? (
              <Text type="secondary">No hay actualizaciones de precio recientes.</Text>
            ) : (
              <List
                dataSource={recentPrices}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={item.product.name}
                      description={`Precio: ${item.price} — ${new Date(item.updated_at).toLocaleDateString('es-ES')}`}
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
