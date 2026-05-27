import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Col,
  Row,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';

import { optimizerService } from '../../../api/optimizerService';
import type { OptimizeResponse, RouteStop, RouteStopProduct } from '../../../types/consumer';

const DEFAULT_LAT = 37.3886;
const DEFAULT_LNG = -5.9823;

const productColumns = [
  { title: 'Producto', dataIndex: 'matched_product_name' as keyof RouteStopProduct },
  { title: 'Cantidad', dataIndex: 'quantity' as keyof RouteStopProduct },
  {
    title: 'Precio',
    dataIndex: 'price' as keyof RouteStopProduct,
    render: (v: number) => `${v.toFixed(2)} €`,
  },
];

export const RoutePage: React.FC = () => {
  const { listId } = useParams<{ listId: string }>();

  const [result, setResult] = useState<OptimizeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [usingDefaultCoords, setUsingDefaultCoords] = useState(false);

  useEffect(() => {
    if (!listId) {
      setError(true);
      setLoading(false);
      return;
    }

    const runOptimize = (lat: number, lng: number) => {
      optimizerService
        .optimize({ shopping_list_id: Number(listId), lat, lng })
        .then((data) => {
          setResult(data);
        })
        .catch(() => {
          void message.error('Error al obtener la ruta optimizada');
          setError(true);
        })
        .finally(() => {
          setLoading(false);
        });
    };

    if (!navigator.geolocation) {
      setUsingDefaultCoords(true);
      runOptimize(DEFAULT_LAT, DEFAULT_LNG);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        runOptimize(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setUsingDefaultCoords(true);
        runOptimize(DEFAULT_LAT, DEFAULT_LNG);
      },
    );
  }, [listId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <Spin tip="Optimizando ruta..." size="large" />
      </div>
    );
  }

  if (error || !result) {
    return (
      <div style={{ maxWidth: 600, margin: '40px auto' }}>
        <Alert
          type="error"
          message="No se pudo optimizar la ruta"
          description="Comprueba que la lista tiene artículos y hay tiendas en el radio configurado"
          style={{ marginBottom: 16 }}
        />
        <Link to={`/app/lists/${listId ?? ''}`}>
          <Button>Volver</Button>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: 8 }}>
        <Link to={`/app/lists/${listId ?? ''}`}>← Volver a la lista</Link>
      </div>

      <Typography.Title level={3}>Ruta optimizada</Typography.Title>

      {usingDefaultCoords && (
        <Alert
          type="warning"
          message="Usando ubicación predeterminada (Sevilla). No se pudo obtener tu ubicación actual."
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col>
          <Statistic
            title="Coste total"
            value={result.total_price}
            precision={2}
            suffix="€"
          />
        </Col>
        <Col>
          <Statistic
            title="Distancia total"
            value={result.total_distance_km}
            precision={1}
            suffix=" km"
          />
        </Col>
        <Col>
          <Statistic
            title="Tiempo estimado"
            value={result.estimated_time_minutes}
            suffix=" min"
          />
        </Col>
        <Col>
          <Statistic title="Paradas" value={result.route.length} />
        </Col>
      </Row>

      {result.route.map((stop: RouteStop, index: number) => (
        <Card
          key={stop.store_id}
          title={`Parada ${index + 1}: ${stop.store_name}`}
          extra={<Tag color="blue">{stop.chain}</Tag>}
          style={{ marginBottom: 16 }}
        >
          <Typography.Text type="secondary">
            {stop.distance_km.toFixed(1)} km · {stop.time_minutes} min
          </Typography.Text>
          <Table<RouteStopProduct>
            dataSource={stop.products}
            rowKey="matched_product_id"
            pagination={false}
            size="small"
            columns={productColumns}
            style={{ marginTop: 8 }}
          />
        </Card>
      ))}
    </div>
  );
};

export default RoutePage;
