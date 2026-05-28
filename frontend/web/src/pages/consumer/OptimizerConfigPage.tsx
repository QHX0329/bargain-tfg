import React, { useEffect, useState } from 'react';
import { Button, Form, InputNumber, Slider, Spin, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { optimizerService } from '../../../api/optimizerService';
import type { OptimizerConfig } from '../../../types/consumer';

const OptimizerConfigPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<OptimizerConfig>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sliderSum, setSliderSum] = useState(0);

  useEffect(() => {
    optimizerService
      .getConfig()
      .then((cfg) => {
        form.setFieldsValue(cfg);
        setSliderSum((cfg.w_precio ?? 0) + (cfg.w_distancia ?? 0) + (cfg.w_tiempo ?? 0));
      })
      .catch(() => message.error('No se pudo cargar la configuración'))
      .finally(() => setLoading(false));
  }, [form]);

  const handleValuesChange = (_: Partial<OptimizerConfig>, all: OptimizerConfig) => {
    setSliderSum((all.w_precio ?? 0) + (all.w_distancia ?? 0) + (all.w_tiempo ?? 0));
  };

  const handleSubmit = async (values: OptimizerConfig) => {
    setSubmitting(true);
    try {
      await optimizerService.updateConfig(values);
      message.success('Configuración guardada');
    } catch {
      message.error('No se pudo guardar la configuración');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spin />;

  return (
    <div style={{ maxWidth: 560 }}>
      <Typography.Title level={3}>Configurar Optimizador</Typography.Title>
      <Button onClick={() => navigate('/app/profile')} style={{ marginBottom: 24 }}>
        ← Volver
      </Button>

      <Form form={form} layout="vertical" onFinish={handleSubmit} onValuesChange={handleValuesChange}>
        <Form.Item name="w_precio" label="Peso: Precio (%)">
          <Slider min={0} max={100} step={1} tooltip={{ formatter: (v) => `${v}%` }} />
        </Form.Item>
        <Form.Item name="w_distancia" label="Peso: Distancia (%)">
          <Slider min={0} max={100} step={1} tooltip={{ formatter: (v) => `${v}%` }} />
        </Form.Item>
        <Form.Item name="w_tiempo" label="Peso: Tiempo (%)">
          <Slider min={0} max={100} step={1} tooltip={{ formatter: (v) => `${v}%` }} />
        </Form.Item>

        <Typography.Text type={sliderSum === 100 ? 'success' : 'warning'} style={{ display: 'block', marginBottom: 16 }}>
          Suma de pesos: {sliderSum}% (recomendado: 100%)
        </Typography.Text>

        <Form.Item name="max_stops" label="Máximo de paradas" rules={[{ required: true }]}>
          <InputNumber min={1} max={6} style={{ width: 120 }} />
        </Form.Item>
        <Form.Item name="max_distance_km" label="Radio máximo (km)" rules={[{ required: true }]}>
          <InputNumber min={1} max={50} style={{ width: 120 }} />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting}>
            Guardar configuración
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default OptimizerConfigPage;
