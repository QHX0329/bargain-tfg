import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input, Space, Table, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

import { productService } from '../../../api/productService';
import type { Product } from '../../../types/consumer';

const DEBOUNCE_MS = 300;
const DEFAULT_PAGE_SIZE = 20;

export const ProductsCatalogPage: React.FC = () => {
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = DEFAULT_PAGE_SIZE;

  // Debounced query state (the value actually sent to the API)
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update debounced query whenever query changes
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  // Fetch when debounced query or page changes
  useEffect(() => {
    setLoading(true);
    productService
      .list({ q: debouncedQuery || undefined, page })
      .then((res) => {
        setProducts(res.results);
        setTotal(res.count);
      })
      .catch(() => {
        setProducts([]);
        setTotal(0);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [debouncedQuery, page]);

  const columns: ColumnsType<Product> = [
    {
      title: 'Nombre',
      dataIndex: 'name',
      render: (name: string, record: Product) => (
        <Link to={`/app/catalog/compare/${record.id}`}>{name}</Link>
      ),
    },
    {
      title: 'Marca',
      dataIndex: 'brand',
      render: (v?: string) => v ?? '—',
    },
    {
      title: 'Categoría',
      dataIndex: 'category',
    },
    {
      title: 'Unidad',
      dataIndex: 'unit',
    },
    {
      title: 'Comparar',
      render: (_: unknown, record: Product) => (
        <Button size="small" onClick={() => navigate(`/app/catalog/compare/${record.id}`)}>
          Ver precios
        </Button>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <Typography.Title level={3}>Catálogo de Productos</Typography.Title>

      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Buscar producto..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onSearch={(v) => {
            setQuery(v);
            setPage(1);
          }}
          style={{ width: 320 }}
          allowClear
        />
        <Button
          icon={<PlusOutlined />}
          onClick={() => navigate('/app/catalog/propose')}
        >
          Proponer producto
        </Button>
      </Space>

      <Table<Product>
        dataSource={products}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: setPage,
          showSizeChanger: false,
        }}
        columns={columns}
      />
    </div>
  );
};

export default ProductsCatalogPage;
