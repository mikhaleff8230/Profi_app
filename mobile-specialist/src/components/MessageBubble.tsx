import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { fileUrl } from "../api";
import type { Message } from "../types/chat";
import { colors } from "../theme";

type Props = {
  message: Message;
  isMine: boolean;
};

function messageAttachmentUrl(message: Message): string | null {
  const meta = message.metadata || {};
  return fileUrl(meta.url || meta.path || meta.original);
}

export function MessageBubble({ message, isMine }: Props) {
  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const attachmentUrl = messageAttachmentUrl(message);
  const isImage = message.type === "image" || Boolean(attachmentUrl && /\.(jpe?g|png|gif|webp)(\?|$)/i.test(attachmentUrl));
  const body = message.type === "file" ? message.metadata?.name || message.text || "Файл" : message.text;

  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowOther]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
        {isImage && attachmentUrl ? (
          <Image source={{ uri: attachmentUrl }} style={styles.image} resizeMode="cover" />
        ) : null}
        {body ? <Text style={[styles.text, isMine && styles.textMine]}>{body}</Text> : null}
        {!attachmentUrl && message.type === "image" ? (
          <Text style={[styles.text, isMine && styles.textMine]}>Фото недоступно</Text>
        ) : null}
        <Text style={[styles.time, isMine && styles.timeMine]}>
          {isMine ? (message.read_at ? "✓✓ " : "✓ ") : ""}
          {time}
        </Text>
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
  image: { width: 220, height: 180, borderRadius: 14, marginBottom: 6, backgroundColor: colors.neutral100 },
  time: { fontSize: 10, marginTop: 4, color: colors.neutral400, alignSelf: "flex-end" },
  timeMine: { color: "rgba(255,255,255,0.65)" },
});
