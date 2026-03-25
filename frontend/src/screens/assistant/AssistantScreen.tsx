/**
 * [F4-17 / F4-18] Pantalla del asistente de compras IA.
 *
 * Chat interface con:
 *  - Historial de conversación persistente (local, no sincronizado con backend aún)
 *  - Sugerencias rápidas de inicio
 *  - Indicador de escritura animado (typing dots)
 *  - Mensajes con timestamps
 *
 * Conecta con:
 *   POST /assistant/chat/ (pendiente F5-12) → respuesta del LLM
 *
 * Mientras el backend no esté disponible, genera respuestas mock inteligentes
 * basadas en palabras clave del mensaje del usuario.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import {
  borderRadius,
  colors,
  fontFamilies,
  fontSize,
  shadows,
  spacing,
} from "@/theme";
import type { AssistantMessage } from "@/types/domain";

// ─── Sugerencias rápidas ──────────────────────────────────────────────────────

const QUICK_SUGGESTIONS = [
  "¿Qué tienda tiene la leche más barata hoy?",
  "Compara el aceite de oliva en Mercadona y Lidl",
  "Dame ideas para una cena económica para 4 personas",
  "¿Cuál es el mejor día para hacer la compra?",
  "Optimiza mi lista de la compra por precio",
];

// ─── Respuestas mock del asistente ───────────────────────────────────────────

function generateMockResponse(message: string): string {
  const lower = message.toLowerCase();

  if (
    lower.includes("leche") ||
    lower.includes("mercadona") ||
    lower.includes("lidl")
  ) {
    return "Basándome en los datos de precios disponibles, **Mercadona** suele tener la leche entera a 1,05 €/L con su marca Hacendado, mientras que **Lidl** la tiene a 0,99 €/L con Milbona. Para la leche semidesnatada, Mercadona gana ligeramente en precio. ¿Quieres que compare más productos?";
  }

  if (lower.includes("aceite") || lower.includes("oliva")) {
    return "El aceite de oliva ha subido bastante últimamente. En este momento:\n\n• **Mercadona** — Aceite Hacendado AOVE 750ml: 6,95 €\n• **Lidl** — Belvin AOVE 750ml: 6,49 €\n• **Carrefour** — Aceite propio 750ml: 7,20 €\n\nLidl tiene la mejor relación calidad-precio ahora mismo. ¿Quieres añadirlo a tu lista?";
  }

  if (
    lower.includes("cena") ||
    lower.includes("económic") ||
    lower.includes("receta")
  ) {
    return "Aquí tienes una cena económica para 4 personas con un presupuesto de ~8€:\n\n🍳 **Tortilla de patatas**\n• 6 huevos (~1,50 €)\n• 800g patatas (~0,90 €)\n• 1 cebolla (~0,30 €)\n• Aceite de oliva (aprox. 0,50 €)\n\n🥗 **Ensalada mixta**\n• Lechuga (~0,80 €)\n• 2 tomates (~0,60 €)\n• Atún en lata x2 (~1,20 €)\n\n**Total estimado: ~5,80 €**\n¿Añado estos ingredientes a tu lista de la compra?";
  }

  if (
    lower.includes("día") ||
    lower.includes("semana") ||
    lower.includes("cuando")
  ) {
    return "Los mejores días para hacer la compra según los datos que tenemos son:\n\n📅 **Martes y miércoles**: los supermercados reponen el pescado fresco y suelen iniciar nuevas ofertas.\n\n📅 **Jueves**: muchos supermercados activan descuentos en productos próximos a caducar.\n\n⚠️ **Evita los domingos por la tarde**: hay menos stock y los precios dinámicos suelen ser más altos.\n\n¿Quieres que te avise cuando haya ofertas en los productos de tu lista habitual?";
  }

  if (
    lower.includes("optimiz") ||
    lower.includes("lista") ||
    lower.includes("ruta")
  ) {
    return "Para optimizar tu lista de la compra, el algoritmo de BargAIn analiza:\n\n1. **Precios actuales** en todas las tiendas de tu radio\n2. **Distancia** desde tu ubicación\n3. **Tu preferencia** (precio / distancia / equilibrado)\n\nVe a la pestaña **Listas**, abre una lista y pulsa el botón **Optimizar** para generar la ruta óptima. ¿Tienes alguna lista creada?";
  }

  return (
    'Entiendo tu pregunta sobre "' +
    message.slice(0, 50) +
    '...". Soy el asistente de compras de BargAIn. Puedo ayudarte a:\n\n• Comparar precios entre tiendas\n• Sugerir recetas económicas\n• Optimizar tu lista de la compra\n• Encontrar las mejores ofertas\n\nEl asistente completo con IA estará disponible próximamente. ¿En qué más puedo ayudarte?'
  );
}

// ─── Componentes de mensaje ───────────────────────────────────────────────────

interface MessageBubbleProps {
  message: AssistantMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === "user";
  const time = new Date(message.timestamp).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Animated.View
      entering={isUser ? FadeInRight.delay(50) : FadeInLeft.delay(50)}
      style={[bubbleStyles.wrapper, isUser && bubbleStyles.wrapperUser]}
    >
      {!isUser && (
        <View style={bubbleStyles.avatar}>
          <Ionicons name="sparkles" size={14} color={colors.white} />
        </View>
      )}

      <View
        style={[
          bubbleStyles.bubble,
          isUser ? bubbleStyles.bubbleUser : bubbleStyles.bubbleBot,
        ]}
      >
        <Text style={[bubbleStyles.text, isUser && bubbleStyles.textUser]}>
          {message.content}
        </Text>
        <Text style={[bubbleStyles.time, isUser && bubbleStyles.timeUser]}>
          {time}
        </Text>
      </View>
    </Animated.View>
  );
};

// ─── Indicador de escritura ───────────────────────────────────────────────────

const TypingIndicator: React.FC = () => {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const anim = (sv: typeof dot1, delay: number) => {
      sv.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 300 }),
          withTiming(0, { duration: 300 }),
        ),
        -1,
        false,
      );
    };
    setTimeout(() => anim(dot1, 0), 0);
    setTimeout(() => anim(dot2, 150), 150);
    setTimeout(() => anim(dot3, 300), 300);
  }, [dot1, dot2, dot3]);

  const d1 = useAnimatedStyle(() => ({
    opacity: 0.3 + dot1.value * 0.7,
    transform: [{ scale: 0.8 + dot1.value * 0.4 }],
  }));
  const d2 = useAnimatedStyle(() => ({
    opacity: 0.3 + dot2.value * 0.7,
    transform: [{ scale: 0.8 + dot2.value * 0.4 }],
  }));
  const d3 = useAnimatedStyle(() => ({
    opacity: 0.3 + dot3.value * 0.7,
    transform: [{ scale: 0.8 + dot3.value * 0.4 }],
  }));

  return (
    <Animated.View entering={FadeIn} style={typingStyles.wrapper}>
      <View style={typingStyles.avatar}>
        <Ionicons name="sparkles" size={14} color={colors.white} />
      </View>
      <View style={typingStyles.bubble}>
        <Animated.View style={[typingStyles.dot, d1]} />
        <Animated.View style={[typingStyles.dot, d2]} />
        <Animated.View style={[typingStyles.dot, d3]} />
      </View>
    </Animated.View>
  );
};

// ─── Pantalla principal ───────────────────────────────────────────────────────

export const AssistantScreen: React.FC = () => {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "¡Hola! Soy el asistente de compras de **BargAIn** 🛒\n\nPuedo ayudarte a comparar precios, encontrar ofertas y optimizar tu lista de la compra. ¿En qué puedo ayudarte hoy?",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const listRef = useRef<FlatList>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const userMsg: AssistantMessage = {
        id: Date.now().toString(),
        role: "user",
        content: trimmed,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputText("");
      setShowSuggestions(false);
      setIsTyping(true);
      scrollToBottom();

      // Simular latencia de respuesta
      const delay = 800 + Math.random() * 1000;
      setTimeout(() => {
        const botMsg: AssistantMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: generateMockResponse(trimmed),
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, botMsg]);
        setIsTyping(false);
        scrollToBottom();
      }, delay);
    },
    [scrollToBottom],
  );

  const clearConversation = useCallback(() => {
    setMessages([
      {
        id: "welcome-new",
        role: "assistant",
        content: "Conversación nueva. ¿En qué puedo ayudarte?",
        timestamp: new Date().toISOString(),
      },
    ]);
    setShowSuggestions(true);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarBig}>
            <Ionicons name="sparkles" size={20} color={colors.white} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Asistente BargAIn</Text>
            <View style={styles.statusRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.statusText}>IA de compras · Claude API</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={clearConversation} style={styles.clearBtn}>
          <Ionicons name="refresh-outline" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Banner de development */}
      <View style={styles.devBanner}>
        <Ionicons name="flask-outline" size={12} color={colors.info} />
        <Text style={styles.devBannerText}>
          Asistente en desarrollo — respuestas generadas localmente
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Lista de mensajes */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <>
              {isTyping && <TypingIndicator />}
              {showSuggestions && messages.length <= 1 && (
                <Animated.View
                  entering={FadeInDown.delay(300).springify()}
                  style={styles.suggestionsContainer}
                >
                  <Text style={styles.suggestionsTitle}>Sugerencias</Text>
                  {QUICK_SUGGESTIONS.map((s, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.suggestion}
                      onPress={() => sendMessage(s)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="chatbubble-outline"
                        size={14}
                        color={colors.primary}
                      />
                      <Text style={styles.suggestionText}>{s}</Text>
                      <Ionicons
                        name="arrow-forward"
                        size={14}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  ))}
                </Animated.View>
              )}
              <View style={{ height: spacing.sm }} />
            </>
          }
          onContentSizeChange={scrollToBottom}
        />

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Pregúntame sobre precios, tiendas…"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage(inputText)}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!inputText.trim() || isTyping) && styles.sendBtnDisabled,
            ]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || isTyping}
          >
            <Ionicons
              name="send"
              size={18}
              color={
                !inputText.trim() || isTyping
                  ? colors.textDisabled
                  : colors.white
              }
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  avatarBig: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  headerTitle: {
    fontFamily: fontFamilies.display,
    fontSize: fontSize.md,
    color: colors.text,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  statusText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  clearBtn: { padding: spacing.xs },
  devBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.infoBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.info + "33",
  },
  devBannerText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.xs,
    color: colors.info,
  },
  messagesList: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  input: {
    flex: 1,
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.text,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    maxHeight: 100,
    lineHeight: 20,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
  },
  sendBtnDisabled: {
    backgroundColor: colors.surfaceVariant,
  },
  suggestionsContainer: {
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  suggestionsTitle: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
    paddingLeft: spacing.xs,
  },
  suggestion: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionText: {
    flex: 1,
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
});

const bubbleStyles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  wrapperUser: {
    justifyContent: "flex-end",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
    flexShrink: 0,
  },
  bubble: {
    maxWidth: "80%",
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    ...shadows.card,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: borderRadius.sm,
  },
  bubbleBot: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    fontFamily: fontFamilies.body,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  textUser: { color: colors.white },
  time: {
    fontFamily: fontFamilies.body,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  timeUser: { color: colors.white, opacity: 0.7 },
});

const typingStyles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderBottomLeftRadius: borderRadius.sm,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});
