import React, { useState } from 'react';
import { Layout, Menu, Button, Typography, theme } from 'antd';
import {
  DashboardOutlined,
  ShoppingOutlined,
  AppstoreAddOutlined,
  TagsOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useBusinessStore } from '../store/businessStore';

const { Sider, Header, Content } = Layout;
const { Title } = Typography;

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useBusinessStore();
  const [collapsed, setCollapsed] = useState(false);
  const { token: designToken } = theme.useToken();

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/prices',
      icon: <ShoppingOutlined />,
      label: 'Precios',
    },
    {
      key: '/products-upload',
      icon: <AppstoreAddOutlined />,
      label: 'Productos',
    },
    {
      key: '/promotions',
      icon: <TagsOutlined />,
      label: 'Promociones',
    },
    {
      key: '/profile',
      icon: <UserOutlined />,
      label: 'Perfil',
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
        <div
          style={{
            height: 32,
            margin: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
        >
          {!collapsed && (
            <Title level={5} style={{ color: 'white', margin: 0 }}>
              BarGAIN
            </Title>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: designToken.colorBgContainer,
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${designToken.colorBorderSecondary}`,
          }}
        >
          <Title level={4} style={{ margin: 0 }}>
            BarGAIN Business
          </Title>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            danger
          >
            Cerrar sesión
          </Button>
        </Header>
        <Content style={{ margin: '24px 16px', padding: 24, background: designToken.colorBgContainer }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
