import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../src/api";
import { useAuth } from "../src/context/AuthContext";
import { useLang } from "../src/context/LangContext";
import { colors, spacing, typography } from "../src/theme";
import { LangSwitcher } from "../components/LangSwitcher";
import { PrimaryButton } from "../components/PrimaryButton";
import { EmptyState } from "../components/EmptyState";
import { TaskCardRow, type TaskItem } from "../components/TaskCardRow";
import type { MainTabParamList } from "../src/navigation/types";

export default function OrdersScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList, "Orders">>();
  const { user } = useAuth();
  const { t } = useLang();
  const [items, setItems] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const url = user.role === "customer" ? "/tasks/mine" : "/applications/mine";
      const data = await apiFetch(url, { method: "GET" });
      if (user.role === "customer") {
        setItems(Array.isArray(data) ? data : []);
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) return null;

  if (user.role === "specialist") {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("my_applications")}</Text>
          <LangSwitcher />
        </View>
        <EmptyState text={t("specialist_orders_hint")}>
          <PrimaryButton title={t("open_home_feed")} onPress={() => navigation.navigate("Home")} />
        </EmptyState>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("my_tasks")}</Text>
          <LangSwitcher />
        </View>
        <PrimaryButton
          title={t("create_task")}
          onPress={() => Alert.alert(t("soon"), t("create_task_soon"))}
          style={styles.create}
        />
        {loading ? (
          <ActivityIndicator style={styles.loader} color={colors.neutral400} />
        ) : items.length === 0 ? (
          <EmptyState text={t("no_tasks")} />
        ) : (
          <View style={styles.list}>
            {items.map((task) => (
              <TaskCardRow
                key={task.id}
                task={task}
                onPress={() => Alert.alert(t("soon"), "Детали заказа — в следующей версии.")}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 32 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.md,
    marginBottom: spacing.md,
  },
  title: { ...typography.title, fontSize: 22 },
  create: { marginBottom: spacing.lg },
  list: { gap: 12 },
  loader: { marginTop: 32 },
});
