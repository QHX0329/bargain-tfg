import React, { useEffect, useState } from 'react';
import { Badge, Button, Empty, List, Popconfirm, Spin, Space, Typography, message } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { notificationService } from '../../../api/notificationService';
import type { Notification } from '../../../types/consumer';

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    notificationService
      .getNotifications(1)
      .then((page) => setNotifications(page.results))
      .catch(() => message.error('No se pudieron cargar las notificaciones'))
      .finally(() => setLoading(false));
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
    } catch {
      message.error('No se pudo marcar como leída');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      message.error('No se pudo eliminar la notificación');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      message.error('No se pudieron marcar como leídas');
    }
  };

  if (loading) return <Spin />;

  return (
    <div>
      <Space style={{ marginBottom: 16 }} align="center">
        <Typography.Title level={3} style={{ margin: 0 }}>
          Notificaciones
        </Typography.Title>
        {unreadCount > 0 && <Badge count={unreadCount} />}
        {unreadCount > 0 && (
          <Button size="small" onClick={handleMarkAllRead}>
            Marcar todas como leídas
          </Button>
        )}
      </Space>

      {notifications.length === 0 ? (
        <Empty description="No tienes notificaciones" />
      ) : (
        <List
          dataSource={notifications}
          renderItem={(n) => (
            <List.Item
              key={n.id}
              actions={[
                !n.is_read && (
                  <Button type="text" size="small" onClick={() => handleMarkRead(n.id)}>
                    Marcar leída
                  </Button>
                ),
                <Popconfirm
                  key="delete"
                  title="¿Eliminar esta notificación?"
                  onConfirm={() => handleDelete(n.id)}
                >
                  <Button type="text" size="small" danger>
                    Eliminar
                  </Button>
                </Popconfirm>,
              ].filter(Boolean)}
            >
              <List.Item.Meta
                avatar={
                  <BellOutlined style={{ fontSize: 20, color: n.is_read ? '#bbb' : '#5f5e5e' }} />
                }
                title={
                  <Typography.Text strong={!n.is_read} type={n.is_read ? 'secondary' : undefined}>
                    {n.title}
                  </Typography.Text>
                }
                description={
                  <>
                    <div>{n.body}</div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {new Date(n.created_at).toLocaleString('es-ES')}
                    </Typography.Text>
                  </>
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );
};

export default NotificationsPage;
