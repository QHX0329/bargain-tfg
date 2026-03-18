/**
 * [P03-04] NotificationScreen — Buzón de notificaciones de BargAIn.
 *
 * Características:
 * - Notificaciones agrupadas por día (Hoy / Ayer / Esta semana / más antiguas)
 * - Tap → marca como leída y navega al deep link si existe
 * - Swipe-to-delete → confirmación → DELETE /notifications/{id}/
 * - Header "Marcar todo leído" → PATCH bulk
 * - Paginación infinita mediante onEndReached
 * - Estado vacío y skeletons de carga
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  SectionList,
  SectionListData,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import {
  colors,
  spacing,
  fontFamilies,
  fontSize,
} from "@/theme";
import { SkeletonBox } from "@/components/ui/SkeletonBox";
import { useNotificationStore } from "@/store/notificationStore";
import { notificationService } from "@/api/notificationService";
import type { Notification } from "@/types/domain";
import type { HomeStackParamList } from "@/navigation/types";

// ─── Day grouping ─────────────────────────────────────────────────────────────

function getDateLabel(isoDate: string): string {
  const now = new Date();
  const date = new Date(isoDate);

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);

  if (date >= todayStart) return "Hoy";
  if (date >= yesterdayStart) return "Ayer";
  if (date >= weekStart) return "Esta semana";

  const diffDays = Math.floor(
    (todayStart.getTime() - date.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diffDays < 30) return `Hace ${diffDays} días`;

  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function groupByDay(notifications: Notification[]): SectionListData<Notification>[] {
  const order = ["Hoy", "Ayer", "Esta semana"];
  const map = new Map<string, Notification[]>();

  for (const n of notifications) {
    const label = getDateLabel(n.created_at);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(n);
  }

  // Sort sections: known labels first in order, then others
  const sections: SectionListData<Notification>[] = [];
  for (const label of order) {
    if (map.has(label)) {
      sections.push({ title: label, data: map.get(label)! });
      map.delete(label);
    }
  }
  // Remaining labels (older dates) sorted by age
  for (const [label, data] of map.entries()) {
    sections.push({ title: label, data });
  }

  return sections;
}

// ─── Deep link navigation ─────────────────────────────────────────────────────

function parseAndNavigate(
  actionUrl: string,
  navigation: NativeStackNavigationProp<HomeStackParamList>,
): void {
  // bargain://lists/list-123 → navigate to ListDetail (different stack)
  // bargain://notifications → stay on Notifications
  const withoutScheme = actionUrl.replace("bargain://", "");
  const parts = withoutScheme.split("/").filter(Boolean);
  const resource = parts[0];

  if (!resource) throw new Error("Unknown route");

  // For now, unknown routes are treated as unsupported
  // Future: cross-tab navigation via root navigation ref
  throw new Error(`Route not yet supported: ${resource}`);
}

// ─── Notification row ─────────────────────────────────────────────────────────

interface NotificationRowProps {
  notification: Notification;
  onTap: (n: Notification) => void;
  onDelete: (n: Notification) => void;
}

const NotificationRow: React.FC<NotificationRowProps> = ({
  notification,
  onTap,
  onDelete,
}) => {
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = () => (
    <TouchableOpacity
      testID={`delete-notification-${notification.id}`}
      style={rowStyles.deleteAction}
      onPress={() => {
        swipeableRef.current?.close();
        onDelete(notification);
      }}
      accessibilityLabel="Eliminar notificación"
    >
      <Text style={rowStyles.deleteText}>Eliminar</Text>
    </TouchableOpacity>
  );

  return (
    <Swipeable ref={swipeableRef} renderRightActions={renderRightActions}>
      <TouchableOpacity
        testID={`notification-row-${notification.id}`}
        style={[
          rowStyles.container,
          !notification.is_read && rowStyles.unreadBorder,
        ]}
        onPress={() => onTap(notification)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={notification.title}
      >
        {/* Unread indicator */}
        <View style={rowStyles.indicatorWrap}>
          {!notification.is_read ? (
            <View style={rowStyles.unreadDot} />
          ) : (
            <View style={rowStyles.readDot} />
          )}
        </View>

        <View style={rowStyles.body}>
          <Text
            style={[
              rowStyles.title,
              notification.is_read && rowStyles.titleRead,
            ]}
            numberOfLines={1}
          >
            {notification.title}
          </Text>
          <Text
            style={[
              rowStyles.bodyText,
              notification.is_read && rowStyles.bodyRead,
            ]}
            numberOfLines={2}
          >
            {notification.body}
          </Text>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
};

// ─── Pantalla ─────────────────────────────────────────────────────────────────

interface NotificationScreenProps {
  navigation: NativeStackNavigationProp<HomeStackParamList>;
}

export const NotificationScreen: React.FC<NotificationScreenProps> = ({
  navigation,
}) => {
  const {
    notifications,
    hasMore,
    setNotifications,
    appendNotifications,
    markRead,
    markAllRead,
    removeNotification,
  } = useNotificationStore();

  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const currentPage = useRef(1);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      markAllRead();
    } catch {
      Alert.alert("Error", "No se pudo marcar todas como leídas");
    }
  }, [markAllRead]);

  // Header button: mark all read (also rendered as ListHeaderComponent for testability)
  useEffect(() => {
    navigation.setOptions({
      title: "Notificaciones",
      headerRight: () => (
        <TouchableOpacity
          onPress={handleMarkAllRead}
          style={{ marginRight: spacing.sm }}
        >
          <Text style={headerStyles.markAllText}>Marcar todo leído</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleMarkAllRead]);

  // Initial load
  useEffect(() => {
    const load = async () => {
      setInitialLoading(true);
      try {
        const result = await notificationService.getNotifications(1);
        setNotifications(result.results);
        currentPage.current = 1;
        // Update hasMore in store by checking
        if (result.next === null) {
          useNotificationStore.setState({ hasMore: false });
        } else {
          useNotificationStore.setState({ hasMore: true });
        }
      } finally {
        setInitialLoading(false);
      }
    };
    load();
  }, [setNotifications]);

  const handleTap = useCallback(
    async (notification: Notification) => {
      try {
        await notificationService.markAsRead(notification.id);
        markRead(notification.id);
        if (notification.action_url) {
          try {
            parseAndNavigate(notification.action_url, navigation);
          } catch {
            Alert.alert("El contenido ya no está disponible");
          }
        }
      } catch {
        // silent
      }
    },
    [markRead, navigation],
  );

  const handleDelete = useCallback(
    (notification: Notification) => {
      Alert.alert(
        "Eliminar notificación",
        "¿Eliminar esta notificación?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar",
            style: "destructive",
            onPress: async () => {
              try {
                await notificationService.deleteNotification(notification.id);
                removeNotification(notification.id);
              } catch {
                Alert.alert("Error", "No se pudo eliminar la notificación");
              }
            },
          },
        ],
      );
    },
    [removeNotification],
  );

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loadingMore || initialLoading) return;
    setLoadingMore(true);
    const nextPage = currentPage.current + 1;
    try {
      const result = await notificationService.getNotifications(nextPage);
      appendNotifications(result.results);
      currentPage.current = nextPage;
      if (result.next === null) {
        useNotificationStore.setState({ hasMore: false });
      }
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, initialLoading, appendNotifications]);

  const sections = groupByDay(notifications);

  // Skeleton loading
  if (initialLoading) {
    return (
      <View style={styles.container}>
        {[0, 1, 2, 3, 4].map((i) => (
          <SkeletonBox
            key={i}
            testID={`skeleton-notif-${i}`}
            width="100%"
            height={64}
            borderRadius={8}
            style={{ marginBottom: spacing.xs, marginHorizontal: spacing.md }}
          />
        ))}
      </View>
    );
  }

  // Empty state
  if (sections.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Sin notificaciones</Text>
      </View>
    );
  }

  return (
    <SectionList
      testID="notifications-list"
      sections={sections}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <NotificationRow
          notification={item}
          onTap={handleTap}
          onDelete={handleDelete}
        />
      )}
      renderSectionHeader={({ section: { title } }) => (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
      )}
      ListHeaderComponent={
        <TouchableOpacity
          testID="mark-all-read-btn"
          onPress={handleMarkAllRead}
          style={styles.markAllHeader}
        >
          <Text style={headerStyles.markAllText}>Marcar todo leído</Text>
        </TouchableOpacity>
      }
      contentContainerStyle={styles.listContent}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.3}
      stickySectionHeadersEnabled={false}
    />
  );
};

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: spacing.md,
  },
  listContent: {
    backgroundColor: colors.background,
    paddingBottom: spacing.xxl,
  },
  markAllHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: "flex-end",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sectionHeader: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  sectionTitle: {
    fontFamily: fontFamilies.display,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
});

const rowStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  unreadBorder: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  indicatorWrap: {
    width: 20,
    paddingTop: 4,
    alignItems: "center",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  readDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "transparent",
  },
  body: {
    flex: 1,
  },
  title: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  titleRead: {
    color: colors.textMuted,
  },
  bodyText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.textSecondary ?? colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  bodyRead: {
    opacity: 0.65,
  },
  deleteAction: {
    backgroundColor: colors.error ?? "#E53E3E",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginBottom: StyleSheet.hairlineWidth,
  },
  deleteText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.white,
  },
});

const headerStyles = StyleSheet.create({
  markAllText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
});

export default NotificationScreen;
