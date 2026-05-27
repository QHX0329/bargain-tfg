import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu, Button, Typography } from 'antd';
import {
  UnorderedListOutlined,
  ShopOutlined,
  EnvironmentOutlined,
  RobotOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';

const { Sider, Content } = Layout;
const { Title } = Typography;

const NAV_ITEMS = [
  { key: '/app/lists', label: 'Listas', icon: <UnorderedListOutlined /> },
  { key: '/app/catalog', label: 'Catálogo', icon: <ShopOutlined /> },
  { key: '/app/map', label: 'Mapa', icon: <EnvironmentOutlined /> },
  { key: '/app/assistant', label: 'Asistente', icon: <RobotOutlined /> },
  { key: '/app/profile', label: 'Perfil', icon: <UserOutlined /> },
];

const ConsumerLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const selectedKey =
    NAV_ITEMS.find((i) => location.pathname.startsWith(i.key))?.key ?? '/app/lists';

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    void navigate('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        theme="dark"
        width={220}
        style={{ position: 'fixed', height: '100vh', left: 0, top: 0, bottom: 0 }}
      >
        <div style={{ padding: '20px 16px 8px' }}>
          <Title level={4} style={{ color: '#fff', margin: 0 }}>
            BargAIn
          </Title>
          <Typography.Text style={{ color: '#aaa', fontSize: 12 }}>Consumidor</Typography.Text>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={NAV_ITEMS.map(({ key, label, icon }) => ({
            key,
            icon,
            label: <Link to={key}>{label}</Link>,
          }))}
        />
        <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
          <Button
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            block
            type="text"
            style={{ color: '#aaa' }}
          >
            Cerrar sesión
          </Button>
        </div>
      </Sider>
      <Layout style={{ marginLeft: 220 }}>
        <Content style={{ padding: 24, minHeight: '100vh' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default ConsumerLayout;
