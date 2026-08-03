import React, { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { TabScreenLayout } from "../components/TabScreenLayout";
import { TaskCardRow, type TaskItem } from "../components/TaskCardRow";
import type { CategoryTileData } from "../components/CategoryTile";
import { apiFetch } from "../src/api";
import { colors, spacing } from "../src/theme";
import type { MainTabParamList, RootStackParamList } from "../src/navigation/types";

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Home">,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [categories, setCategories] = useState<CategoryTileData[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, ts] = await Promise.all([
        apiFetch("/categories", { method: "GET" }),
        apiFetch("/tasks/mine", { method: "GET" }),
      ]);
      setCategories(Array.isArray(cats) ? cats : []);
      setTasks(Array.isArray(ts) ? ts : []);
    } catch {
      setCategories([]);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <TabScreenLayout>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>МОИ ЗАЯВКИ</Text>
          <Text style={styles.heroTitle}>Всё, что вы поручили Treabo</Text>
          <Text style={styles.heroText}>Создайте новую заявку через кнопку + — AI поможет сформулировать задачу.</Text>
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} color={colors.neutral400} />
        ) : tasks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={30} color={colors.neutral400} />
            <Text style={styles.emptyTitle}>Заявок пока нет</Text>
            <Text style={styles.empty}>Нажмите большую кнопку + внизу экрана и расскажите, что нужно сделать.</Text>
          </View>
        ) : (
          <View style={styles.taskList}>
            {tasks.map((task) => (
              <TaskCardRow
                key={String(task.id)}
                task={task}
                category={categories.find((c) => String(c.id) === String(task.category_id || task.category))}
                onPress={() => navigation.navigate("TaskDetail", { taskId: String(task.id) })}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </TabScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.lavender50 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 96 },
  hero: { marginTop: spacing.md, marginBottom: spacing.xl, borderRadius: 24, backgroundColor: "#F1F7D9", padding: 22 },
  heroEyebrow: { fontSize: 11, fontWeight: "800", color: "#737D2F", letterSpacing: 1.1 },
  heroTitle: { fontSize: 26, lineHeight: 31, fontWeight: "900", color: colors.black, marginTop: 8 },
  heroText: { fontSize: 14, lineHeight: 21, color: colors.neutral600, marginTop: 8 },
  taskList: { gap: 12 },
  loader: { marginVertical: 24 },
  emptyCard: { alignItems: "center", borderRadius: 22, backgroundColor: colors.white, padding: 28 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: colors.black, marginTop: 10 },
  empty: { textAlign: "center", color: colors.neutral500, marginTop: 8, fontSize: 14, lineHeight: 20 },
});
