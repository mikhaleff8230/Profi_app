import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  onShowWork: () => void;
  onFindMaster: () => void;
};

export function CreateActionSheet({ visible, onClose, onShowWork, onFindMaster }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Закрыть"
          style={styles.backdrop}
          onPress={onClose}
        />
        <SafeAreaView style={styles.sheet} edges={["bottom"]}>
          <View style={styles.handle} />
          <Text style={styles.title}>Что вы хотите сделать?</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.action, styles.actionPrimary]} onPress={onShowWork}>
              <View style={styles.iconBox}>
                <Ionicons name="images-outline" size={24} color={colors.black} />
              </View>
              <View style={styles.actionCopy}>
                <Text style={styles.actionTitle}>Показать работу</Text>
                <Text style={styles.actionHint}>Добавить готовый проект в ленту Плейсов</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={colors.black} />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              style={styles.action}
              activeOpacity={0.78}
              onPress={onFindMaster}
            >
              <View style={[styles.iconBox, styles.iconBoxAccent]}>
                <Ionicons name="sparkles-outline" size={24} color={colors.black} />
              </View>
              <View style={styles.actionCopy}>
                <Text style={styles.actionTitle}>Найти мастера</Text>
                <Text style={styles.actionHint}>Описать задачу с помощью AI</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.neutral500} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(9, 12, 16, 0.34)",
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    shadowColor: colors.black,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -5 },
    elevation: 18,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    backgroundColor: colors.neutral300,
    marginBottom: 20,
  },
  title: {
    color: colors.black,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    marginBottom: 18,
  },
  actions: { gap: 10, paddingBottom: 16 },
  action: {
    minHeight: 76,
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.neutral50,
    borderWidth: 1,
    borderColor: colors.neutral100,
  },
  actionUnavailable: { opacity: 0.52 },
  actionPrimary: { backgroundColor: "#F2FCE5", borderColor: "#E5F7BD" },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  iconBoxAccent: { backgroundColor: colors.accent },
  actionCopy: { flex: 1, paddingHorizontal: 12 },
  actionTitle: { color: colors.black, fontSize: 16, fontWeight: "700" },
  actionHint: { color: colors.neutral500, fontSize: 12, lineHeight: 17, marginTop: 3 },
});
