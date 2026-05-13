import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../src/api";
import { useAuth } from "../src/context/AuthContext";
import { useLang } from "../src/context/LangContext";
import { colors, radii, spacing, typography } from "../src/theme";
import { ScreenHeader } from "../components/ScreenHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import type { CategoryTileData } from "../components/CategoryTile";
import type { RootStackParamList } from "../src/navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function CreateTaskScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [categories, setCategories] = useState<CategoryTileData[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [city, setCity] = useState(user?.city || "");
  const [address, setAddress] = useState("");
  const [budget, setBudget] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    apiFetch("/categories", { method: "GET" })
      .then((d) => (Array.isArray(d) ? d : []))
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const canSubmit = title.trim() && description.trim() && category && city.trim();

  const attachLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("", t("geo_denied"));
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    setLat(loc.coords.latitude);
    setLng(loc.coords.longitude);
    Alert.alert(t("success"), t("location_added"));
  };

  const onSubmit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    const payload = {
      title: title.trim(),
      description: description.trim(),
      category: String(category),
      city: city.trim(),
      address: address.trim() || null,
      budget: budget ? parseInt(budget, 10) : null,
      lat,
      lng,
      photos: [] as string[],
    };
    try {
      const data = await apiFetch("/tasks", { method: "POST", body: JSON.stringify(payload) });
      Alert.alert(t("success"));
      navigation.replace("TaskDetail", { taskId: String(data.id) });
    } catch (e: unknown) {
      Alert.alert(
        t("demo_publish_title"),
        t("demo_publish_body"),
        [
          { text: t("cancel"), style: "cancel" },
          {
            text: t("go_to_demo_task"),
            onPress: () => navigation.replace("TaskDetail", { taskId: "demo-task-1" }),
          },
        ]
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScreenHeader title={t("new_task")} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>{t("task_title_label")}</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder={t("task_title_placeholder")} placeholderTextColor={colors.neutral400} />

          <Text style={styles.label}>{t("task_description")}</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={description}
            onChangeText={setDescription}
            placeholder={t("task_description_placeholder")}
            placeholderTextColor={colors.neutral400}
            multiline
          />

          <Text style={styles.label}>{t("category")}</Text>
          <TouchableOpacity style={styles.input} onPress={() => setPickerOpen(!pickerOpen)}>
            <Text style={category ? styles.inputText : styles.placeholder}>
              {category
                ? (() => {
                    const c = categories.find((x) => String(x.id) === String(category));
                    return c ? (lang === "ru" ? c.name_ru : c.name_ro) : t("select_category");
                  })()
                : t("select_category")}
            </Text>
          </TouchableOpacity>
          {pickerOpen && (
            <View style={styles.picker}>
              {categories.map((c) => (
                <TouchableOpacity
                  key={String(c.id)}
                  style={styles.pickerRow}
                  onPress={() => {
                    setCategory(String(c.id));
                    setPickerOpen(false);
                  }}
                >
                  <Text>{lang === "ru" ? c.name_ru : c.name_ro}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>{t("city")}</Text>
          <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder={t("city_placeholder")} placeholderTextColor={colors.neutral400} />

          <Text style={styles.label}>{t("address")}</Text>
          <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder={t("address_optional")} placeholderTextColor={colors.neutral400} />

          <Text style={styles.label}>{t("budget")}</Text>
          <TextInput
            style={styles.input}
            value={budget}
            onChangeText={(x) => setBudget(x.replace(/\D/g, ""))}
            placeholder={t("budget_placeholder")}
            placeholderTextColor={colors.neutral400}
            keyboardType="number-pad"
          />

          <TouchableOpacity style={styles.locRow} onPress={attachLocation}>
            <Ionicons name="location-outline" size={20} color={colors.black} />
            <Text style={styles.locText}>{t("use_my_location")}</Text>
            {lat != null && <Text style={styles.locOk}>✓</Text>}
          </TouchableOpacity>

          <PrimaryButton title={t("publish")} onPress={onSubmit} disabled={!canSubmit} loading={busy} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  scroll: { padding: spacing.xl, paddingBottom: 40, gap: 4 },
  label: { fontSize: 13, fontWeight: "600", color: colors.neutral600, marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: colors.lavender50,
    borderRadius: radii.lg,
    padding: 14,
    fontSize: 16,
    color: colors.black,
    minHeight: 52,
  },
  inputText: { fontSize: 16, color: colors.black },
  placeholder: { fontSize: 16, color: colors.neutral400 },
  textarea: { minHeight: 120, textAlignVertical: "top" },
  picker: { borderWidth: 1, borderColor: colors.neutral100, borderRadius: radii.md, marginBottom: 8 },
  pickerRow: { padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.neutral100 },
  locRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 14 },
  locText: { fontSize: 15, fontWeight: "600" },
  locOk: { marginLeft: "auto", fontSize: 16, color: colors.emerald },
});
