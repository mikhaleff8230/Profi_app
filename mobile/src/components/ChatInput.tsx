import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radii, spacing } from "../theme";

export const CHAT_INPUT_NATIVE_ID = "proffi-chat-input";
export const CHAT_INPUT_BASE_HEIGHT = 48;

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  placeholder?: string;
  sending?: boolean;
  disabled?: boolean;
};

export function ChatInput({
  value,
  onChangeText,
  onSend,
  placeholder = "Сообщение…",
  sending = false,
  disabled = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const canSend = value.trim().length > 0 && !sending && !disabled;

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <View style={styles.row}>
        <TextInput
          nativeID={CHAT_INPUT_NATIVE_ID}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.neutral400}
          value={value}
          onChangeText={onChangeText}
          multiline
          maxLength={4000}
          editable={!disabled && !sending}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !canSend && styles.sendDisabled]}
          onPress={onSend}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Отправить"
          testID="chat-send-button"
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Ionicons name="send" size={18} color={canSend ? colors.white : colors.neutral400} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.neutral100,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  row: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  input: {
    flex: 1,
    backgroundColor: colors.lavender50,
    borderRadius: radii.xl,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    maxHeight: 120,
    color: colors.black,
    minHeight: CHAT_INPUT_BASE_HEIGHT,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: { backgroundColor: colors.neutral100 },
});
