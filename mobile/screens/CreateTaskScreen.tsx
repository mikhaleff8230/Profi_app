import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ScreenLayout, useScrollBottomPadding } from "../components/ScreenLayout";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, apiUploadFile } from "../src/api";
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
  const [photos, setPhotos] = useState<{ uri: string; path: string }[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const scrollPadding = useScrollBottomPadding(40);

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

  const pickPhotos = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Доступ", "Нужно разрешение на фото");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: Math.max(1, 6 - photos.length),
      quality: 0.85,
    });
    if (res.canceled) return;
    setUploadingPhoto(true);
    try {
      const next: { uri: string; path: string }[] = [];
      for (const asset of res.assets.slice(0, Math.max(0, 6 - photos.length))) {
        if (!asset.uri) continue;
        const mime = asset.mimeType || "image/jpeg";
        const uploaded = await apiUploadFile(asset.uri, mime, asset.fileName || "task-photo.jpg");
        next.push({ uri: asset.uri, path: uploaded.path });
      }
      setPhotos((prev) => [...prev, ...next].slice(0, 6));
    } catch (e: unknown) {
      Alert.alert("Ошибка", e instanceof Error ? e.message : String(e));
    } finally {
      setUploadingPhoto(false);
    }
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
      photos: photos.map((photo) => photo.path),
    };
    try {
      const data = await apiFetch("/tasks", { method: "POST", body: JSON.stringify(payload) });
      Alert.alert(t("success"));
      navigation.replace("TaskDetail", { taskId: String(data.id) });
    } catch (e: unknown) {
      Alert.alert("Ошибка", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenLayout>
      <ScreenHeader title={t("new_task")} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.scroll, scrollPadding]} keyboardShouldPersistTaps="handled">
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

          <Text style={styles.label}>Фото заказа</Text>
          {photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoPreviewRow}>
              {photos.map((photo, index) => (
                <View key={photo.path} style={styles.photoPreviewWrap}>
                  <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                  <TouchableOpacity
                    style={styles.removePhotoBtn}
                    onPress={() => setPhotos((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <Ionicons name="close" size={14} color={colors.white} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
          <TouchableOpacity style={styles.photoBtn} onPress={pickPhotos} disabled={uploadingPhoto || photos.length >= 6}>
            {uploadingPhoto ? (
              <ActivityIndicator size="small" color={colors.black} />
            ) : (
              <Ionicons name="camera-outline" size={20} color={colors.black} />
            )}
            <Text style={styles.photoBtnText}>
              {photos.length ? `Добавить фото (${photos.length}/6)` : "Добавить фото"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>{t("category")}</Text>
          <TouchableOpacity style={styles.input} onPress={() => setPickerOpen(!pickerOpen)}>
            <Text style={category ? styles.inputText : styles.placeholder}>
              {category
                ? (() => {
                    const c = categories.find((x) => String(x.id) === String(category));
                    return c ? (c.name_ru) : t("select_category");
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
                  <Text>{c.name_ru}</Text>
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
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, gap: 4 },
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
  photoPreviewRow: { gap: 10, paddingVertical: 4 },
  photoPreviewWrap: {
    width: 88,
    height: 88,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: colors.lavender50,
  },
  photoPreview: { width: "100%", height: "100%" },
  removePhotoBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.68)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoBtn: {
    minHeight: 52,
    borderRadius: radii.lg,
    backgroundColor: colors.lavender50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  photoBtnText: { fontSize: 15, fontWeight: "700", color: colors.black },
  picker: { borderWidth: 1, borderColor: colors.neutral100, borderRadius: radii.md, marginBottom: 8 },
  pickerRow: { padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.neutral100 },
  locRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 14 },
  locText: { fontSize: 15, fontWeight: "600" },
  locOk: { marginLeft: "auto", fontSize: 16, color: colors.emerald },
});
