import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Message } from "../types/chat";
import { colors, radii } from "../theme";

type Props = {
  message: Message;
  isMine: boolean;
};

export function MessageBubble({ message, isMine }: Props) {
  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const body =
    message.type === "image" ? "📷 Изображение" : message.type === "pin" ? "📍 Pin" : message.text;

  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowOther]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
        <Text style={[styles.text, isMine && styles.textMine]}>{body}</Text>
        <Text style={[styles.time, isMine && styles.timeMine]}>{time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 6, paddingHorizontal: 4 },
  rowMine: { alignItems: "flex-end" },
  rowOther: { alignItems: "flex-start" },
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleMine: {
    backgroundColor: colors.black,
    borderBottomRightRadius: 6,
  },
  bubbleOther: {
    backgroundColor: colors.white,
    borderBottomLeftRadius: 6,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  text: { fontSize: 15, lineHeight: 21, color: colors.black },
  textMine: { color: colors.white },
  time: { fontSize: 10, marginTop: 4, color: colors.neutral400, alignSelf: "flex-end" },
  timeMine: { color: "rgba(255,255,255,0.65)" },
});
