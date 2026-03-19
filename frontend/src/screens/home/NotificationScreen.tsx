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
  Modal,
  Pressable,
  SectionList,
  SectionListData,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";

import {
  borderRadius,
  colors,
  fontFamilies,
  fontSize,
  shadows,
  spacing,
} from "@/theme";
import { SkeletonBox } from "@/components/ui/SkeletonBox";
import { useNotificationStore } from "@/store/notificationStore";
import { notificationService } from "@/api/notificationService";
import type { Notification } from "@/types/domain";
import type { HomeStackParamList } from "@/navigation/types";
import { blurActiveElementOnWeb } from "@/utils/webA11y";

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
      testID={`delete-notification-${String(notification.id)}`}
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
        testID={`notification-row-${String(notification.id)}`}
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
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
  const currentPage = useRef(1);

  const loadFirstPage = useCallback(async () => {
    setInitialLoading(true);
    try {
      const result = await notificationService.getNotifications(1);
      setNotifications(result.results);
      currentPage.current = 1;
      useNotificationStore.setState({ hasMore: result.next !== null });
    } finally {
      setInitialLoading(false);
    }
  }, [setNotifications]);

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

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  useFocusEffect(
    useCallback(() => {
      void loadFirstPage();
    }, [loadFirstPage]),
  );

  const handleTap = useCallback(
    async (notification: Notification) => {
      blurActiveElementOnWeb();

      // Open modal with notification details
      setSelectedNotif(notification);
      // Mark as read in background
      try {
        await notificationService.markAsRead(notification.id);
        markRead(notification.id);
      } catch {
        // silent
      }
    },
    [markRead],
  );

  const handleDelete = useCallback(
    (notification: Notification) => {
      void (async () => {
        try {
          await notificationService.deleteNotification(notification.id);
          removeNotification(notification.id);
          if (
            selectedNotif &&
            String(selectedNotif.id) === String(notification.id)
          ) {
            setSelectedNotif(null);
          }
        } catch {
          Alert.alert("Error", "No se pudo eliminar la notificación");
        }
      })();
    },
    [removeNotification, selectedNotif],
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
    <>
      <SectionList
        testID="notifications-list"
        sections={sections}
        keyExtractor={(item) => String(item.id)}
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

      {/* Notification detail modal */}
      <Modal
        visible={selectedNotif !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedNotif(null)}
      >
        <Pressable style={modalStyles.overlay} onPress={() => setSelectedNotif(null)}>
          <Pressable style={modalStyles.card} onPress={(e) => e.stopPropagation()}>
            <View style={modalStyles.accentBar} />
            <Text style={modalStyles.title}>{selectedNotif?.title}</Text>
            <Text style={modalStyles.body}>{selectedNotif?.body}</Text>
            {selectedNotif?.created_at ? (
              <Text style={modalStyles.date}>
                {new Date(selectedNotif.created_at).toLocaleString("es-ES", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            ) : null}
            <TouchableOpacity
              style={modalStyles.closeButton}
              onPress={() => setSelectedNotif(null)}
            >
              <Text style={modalStyles.closeText}>Cerrar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
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

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    ...(shadows.elevated as object),
  },
  accentBar: {
    height: 4,
    backgroundColor: colors.primary,
  },
  title: {
    fontFamily: fontFamilies.display,
    fontSize: fontSize.lg,
    color: colors.text,
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
  },
  body: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginHorizontal: spacing.lg,
    lineHeight: 22,
  },
  date: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.textDisabled,
    marginTop: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  closeButton: {
    margin: spacing.lg,
    alignSelf: "flex-end",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primaryTint,
    borderRadius: borderRadius.md,
  },
  closeText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
});

export default NotificationScreen;
