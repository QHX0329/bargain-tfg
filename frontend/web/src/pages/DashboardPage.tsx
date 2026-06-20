import React, { useEffect, useMemo, useState } from 'react';
import { Row, Col, Card, Statistic, Typography, Spin, Alert, Tag, Progress, Table } from 'antd';
import { ShopOutlined, TagsOutlined, EyeOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { apiClient } from '../api/client';
import { useBusinessStore } from '../store/businessStore';
import type { BusinessProfile, Promotion } from '../store/businessStore';
import { extractBusinessProfiles } from '../utils/businessProfiles';
import {
  collectUnresolvedEntityIds,
  resolveEntityName,
} from '../utils/entityResolver';
import type { BusinessStats } from '../types/business';

const { Title, Text } = Typography;

interface PriceRecord {
  id: string;
  product: { id: string; name?: string } | string | number | null;
  price: string;
  updated_at: string;
}

interface ProductLookupRecord {
  id: string | number;
  name: string;
}

type PromotionStatus = 'active' | 'pending' | 'inactive';

const getPromotionStatus = (promotion: Promotion): PromotionStatus => {
  if (!promotion.is_active) {
    return 'inactive';
  }

  const today = new Date();
  const start = new Date(promotion.start_date);
  const end = promotion.end_date ? new Date(promotion.end_date) : null;

  if (start > today) {
    return 'pending';
  }

  if (end && end < today) {
    return 'inactive';
  }

  return 'active';
};

const DashboardPage: React.FC = () => {
  const { setProfile } = useBusinessStore();
  const [currentProfile, setCurrentProfile] = useState<BusinessProfile | null>(null);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [recentPrices, setRecentPrices] = useState<PriceRecord[]>([]);
  const [productNamesById, setProductNamesById] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      // El perfil es imprescindible; promociones, precios y estadísticas son datos
      // complementarios que solo están disponibles para perfiles verificados. Se
      // cargan de forma independiente (allSettled) para que un 403 por perfil no
      // verificado no derive en un error genérico de conexión.
      let profileRes;
      try {
        profileRes = await apiClient.get<BusinessProfile[]>('/business/profiles/');
      } catch {
        setError(
          'No se pudo cargar tu perfil de negocio. Comprueba tu conexión e inténtalo de nuevo.',
        );
        setLoading(false);
        return;
      }

      const profiles = extractBusinessProfiles(profileRes.data);
      const profile = profiles.length > 0 ? profiles[0] : null;
      if (profile) {
        setProfile(profile);
        setCurrentProfile(profile);
      }

      // Si el perfil aún no está verificado, no se intentan cargar los datos
      // restringidos: el panel muestra el aviso de verificación pendiente.
      if (!profile || !profile.is_verified) {
        setLoading(false);
        return;
      }

      const [promotionsResult, pricesResult, statsResult] = await Promise.allSettled([
        apiClient.get<Promotion[] | { results?: Promotion[] }>('/business/promotions/'),
        apiClient.get<{ results?: PriceRecord[] } | PriceRecord[]>(
          '/business/prices/?limit=8&ordering=-updated_at',
        ),
        apiClient.get<BusinessStats>('/business/profiles/stats/'),
      ]);

      if (promotionsResult.status === 'fulfilled') {
        const promotionsData = promotionsResult.value.data;
        if (Array.isArray(promotionsData)) {
          setPromotions(promotionsData);
        } else if (
          promotionsData &&
          'results' in promotionsData &&
          Array.isArray(promotionsData.results)
        ) {
          setPromotions(promotionsData.results);
        } else {
          setPromotions([]);
        }
      }

      if (pricesResult.status === 'fulfilled') {
        const pricesData = pricesResult.value.data;
        if (Array.isArray(pricesData)) {
          setRecentPrices(pricesData);
        } else if (pricesData && 'results' in pricesData && Array.isArray(pricesData.results)) {
          setRecentPrices(pricesData.results);
        }
      }

      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value.data);
      }

      setLoading(false);
    };

    void fetchData();
  }, [setProfile]);

  useEffect(() => {
    const unresolvedProductIds = collectUnresolvedEntityIds(
      recentPrices.map((price) => price.product),
      productNamesById,
    );

    if (unresolvedProductIds.length === 0) {
      return;
    }

    const resolveNames = async () => {
      const lookups = await Promise.allSettled(
        unresolvedProductIds.map(async (productId) => {
          const response = await apiClient.get<ProductLookupRecord>(`/products/${productId}/`);
          return response.data;
        }),
      );

      const resolved = lookups.reduce<Record<string, string>>((acc, result) => {
        if (result.status === 'fulfilled') {
          acc[String(result.value.id)] = result.value.name;
        }
        return acc;
      }, {});

      if (Object.keys(resolved).length > 0) {
        setProductNamesById((previous) => ({ ...previous, ...resolved }));
      }
    };

    void resolveNames();
  }, [recentPrices, productNamesById]);

  const resolveProductName = (entity: PriceRecord['product']): string => {
    return resolveEntityName({
      entity,
      byId: productNamesById,
      fallback: 'Producto sin nombre',
    });
  };

  const promotionsByStatus = useMemo(() => {
    const counters = { active: 0, pending: 0, inactive: 0 };
    promotions.forEach((promotion) => {
      counters[getPromotionStatus(promotion)] += 1;
    });
    return counters;
  }, [promotions]);

  const activePromotions = promotionsByStatus.active;
  const totalViews = useMemo(
    () => promotions.reduce((sum, promotion) => sum + (promotion.views ?? 0), 0),
    [promotions],
  );



  const statusRatio = useMemo(() => {
    const total = promotions.length || 1;
    return {
      active: Math.round((promotionsByStatus.active / total) * 100),
      pending: Math.round((promotionsByStatus.pending / total) * 100),
      inactive: Math.round((promotionsByStatus.inactive / total) * 100),
    };
  }, [promotions.length, promotionsByStatus.active, promotionsByStatus.inactive, promotionsByStatus.pending]);

  const priceColumns: ColumnsType<PriceRecord> = [
    {
      title: 'Producto',
      key: 'product',
      render: (_: unknown, record: PriceRecord) => resolveProductName(record.product),
    },
    {
      title: 'Precio actual',
      dataIndex: 'price',
      key: 'price',
      width: 140,
      render: (value: string) => `${value} EUR`,
    },
    {
      title: 'Actualizado',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 150,
      render: (value: string) => (value ? new Date(value).toLocaleDateString('es-ES') : '—'),
    },
  ];

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
      {currentProfile && !currentProfile.is_verified && !currentProfile.rejection_reason && (
        <Alert
          type="info"
          showIcon
          message="Perfil pendiente de verificación"
          description="Tu perfil de negocio está siendo revisado por el equipo de BarGAIN. Te avisaremos por email cuando esté aprobado."
          style={{ marginBottom: 16 }}
          closable
        />
      )}
      {currentProfile?.is_verified && (
        <Alert
          type="success"
          showIcon
          message="¡Perfil aprobado!"
          description="Tu perfil de negocio ha sido verificado. Ya puedes gestionar precios y promociones."
          style={{ marginBottom: 16 }}
          closable
        />
      )}
      {currentProfile && !currentProfile.is_verified && currentProfile.rejection_reason && (
        <Alert
          type="error"
          showIcon
          message="Perfil rechazado"
          description={`Motivo: ${currentProfile.rejection_reason}. Actualiza tu perfil y contacta con soporte.`}
          style={{ marginBottom: 16 }}
        />
      )}
      <section className="dashboard-hero">
        <Title level={3}>
          Panel ejecutivo del negocio
        </Title>
        <Text type="secondary">
          Prioriza decisiones con indicadores de actividad comercial y promociones en tiempo real.
        </Text>
        <div style={{ marginTop: 14 }}>
          <Tag color="success">Operativo</Tag>
          <Tag color="processing">Modo analitico</Tag>
          <Tag color="default">Actualizado hoy</Tag>
        </div>
      </section>

      <Row gutter={[16, 16]} align="stretch">
        <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
          <Card className="surface-card kpi-card" style={{ width: '100%', height: '100%' }}>
            <Statistic
              title="Tiendas activas"
              value={stats?.total_stores ?? 0}
              prefix={<ShopOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
          <Card className="surface-card kpi-card" style={{ width: '100%', height: '100%' }}>
            <Statistic
              title="Precios activos"
              value={stats?.total_active_prices ?? recentPrices.length}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
          <Card className="surface-card kpi-card" style={{ width: '100%', height: '100%' }}>
            <Statistic
              title="Promociones activas"
              value={stats?.total_active_promotions ?? activePromotions}
              prefix={<TagsOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
          <Card className="surface-card kpi-card" style={{ width: '100%', height: '100%' }}>
            <Statistic
              title="Visualizaciones totales"
              value={stats?.total_promotion_views ?? totalViews}
              prefix={<EyeOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={8}>
          <Card className="surface-card" title="Salud de promociones" style={{ height: '100%' }}>
            <div style={{ marginBottom: 10 }}>
              <Text>Activas ({promotionsByStatus.active})</Text>
              <Progress percent={statusRatio.active} strokeColor="#5a7d66" showInfo={false} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <Text>Pendientes ({promotionsByStatus.pending})</Text>
              <Progress percent={statusRatio.pending} strokeColor="#8f6d43" showInfo={false} />
            </div>
            <div>
              <Text>Inactivas ({promotionsByStatus.inactive})</Text>
              <Progress percent={statusRatio.inactive} strokeColor="#9b8f80" showInfo={false} />
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card className="surface-card" title="Ajustes recientes de precio">
            <Table<PriceRecord>
              dataSource={recentPrices}
              columns={priceColumns}
              rowKey="id"
              pagination={false}
              locale={{ emptyText: 'No hay actualizaciones de precio recientes.' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
