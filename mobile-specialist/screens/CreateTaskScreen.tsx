import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import {
  detectByIp,
  reverseGeocode,
  saveConfirmedAddress,
  suggestAddresses,
  type GeoAddressResult,
} from "../src/geo";
import { useAuth } from "../src/context/AuthContext";
import { useLang } from "../src/context/LangContext";
import { colors, radii, spacing, typography } from "../src/theme";
import { ScreenHeader } from "../components/ScreenHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import type { CategoryTileData } from "../components/CategoryTile";
import type { RootStackParamList } from "../src/navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

function formatDetectedLabel(result: GeoAddressResult): string {
  if (result.full_address) return result.full_address;
  return [result.city, result.address, result.region].filter(Boolean).join(", ") || "";
}

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

  const [detecting, setDetecting] = useState(true);
  const [detected, setDetected] = useState<GeoAddressResult | null>(null);
  const [gpsUsed, setGpsUsed] = useState(false);
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [suggestions, setSuggestions] = useState<GeoAddressResult[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detectStarted = useRef(false);

  const applyGeoResult = useCallback((result: GeoAddressResult) => {
    if (result.city) setCity(result.city);
    if (result.address || result.full_address) setAddress(result.address || result.full_address || "");
    if (result.lat != null && result.lng != null) {
      setLat(result.lat);
      setLng(result.lng);
    }
    setDetected(result);
  }, []);

  useEffect(() => {
    apiFetch("/categories", { method: "GET" })
      .then((d) => (Array.isArray(d) ? d : []))
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (detectStarted.current) return;
    detectStarted.current = true;

    (async () => {
      setDetecting(true);
      const ipHint = await detectByIp().catch(() => null);

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const reversed = await reverseGeocode(loc.coords.latitude, loc.coords.longitude, loc.coords.accuracy);
          const merged: GeoAddressResult = {
            ...reversed,
            city: reversed.city || ipHint?.city || null,
            region: reversed.region || ipHint?.region || null,
            country: reversed.country || ipHint?.country || "Россия",
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            accuracy: loc.coords.accuracy,
            source: "browser",
            needs_confirmation: true,
          };
          setGpsUsed(true);
          setDetected(merged);
          applyGeoResult(merged);
        } else if (ipHint) {
          setGpsUsed(false);
          setDetected(ipHint);
          if (ipHint.city) setCity(ipHint.city);
          setEditMode(true);
        }
      } catch {
        if (ipHint) {
          setGpsUsed(false);
          setDetected(ipHint);
          if (ipHint.city) setCity(ipHint.city);
          setEditMode(true);
        }
      } finally {
        setDetecting(false);
      }
    })();
  }, [applyGeoResult]);

  useEffect(() => {
    if (!editMode || address.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    suggestTimer.current = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const items = await suggestAddresses(address, { city, count: 8 });
        setSuggestions(items);
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestLoading(false);
      }
    }, 350);

    return () => {
      if (suggestTimer.current) clearTimeout(suggestTimer.current);
    };
  }, [address, city, editMode]);

  const canSubmit = title.trim() && description.trim() && category && city.trim() && addressConfirmed;

  const confirmAddress = async () => {
    const payload: GeoAddressResult = {
      city: city.trim() || detected?.city || null,
      region: detected?.region || null,
      country: detected?.country || "Россия",
      address: address.trim() || detected?.address || null,
      full_address: detected?.full_address || address.trim() || null,
      lat,
      lng,
      fias_id: detected?.fias_id,
      kladr_id: detected?.kladr_id,
      source: gpsUsed ? "browser" : "manual",
      needs_confirmation: false,
    };
    applyGeoResult(payload);
    setAddressConfirmed(true);
    setEditMode(false);
    try {
      await saveConfirmedAddress(payload);
    } catch {
      // optional
    }
  };

  const pickSuggestion = (item: GeoAddressResult) => {
    applyGeoResult(item);
    setEditMode(true);
    setAddressConfirmed(false);
    setSuggestions([]);
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
    if (!canSubmit) {
      if (!addressConfirmed) Alert.alert("", "Подтвердите адрес перед публикацией");
      return;
    }
    setBusy(true);
    const payload = {
      title: title.trim(),
      description: description.trim(),
      category: String(category),
      category_id: category || null,
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

  const showConfirmBlock = !editMode && !addressConfirmed && detected && (detected.full_address || detected.city);

  return (
    <ScreenLayout>
      <ScreenHeader title={t("new_task")} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.scroll, scrollPadding]} keyboardShouldPersistTaps="handled">
          {detecting ? (
            <View style={styles.detectBox}>
              <ActivityIndicator color={colors.black} />
              <Text style={styles.detectText}>Определяем адрес…</Text>
            </View>
          ) : null}

          {showConfirmBlock ? (
            <View style={styles.confirmBox}>
              <Text style={styles.confirmTitle}>
                {gpsUsed ? "Мы определили адрес" : "Мы определили ваш город"}
              </Text>
              <Text style={styles.confirmAddress}>{formatDetectedLabel(detected)}</Text>
              {!gpsUsed ? (
                <Text style={styles.confirmHint}>Уточните точный адрес в поле ниже</Text>
              ) : null}
              <View style={styles.confirmActions}>
                <TouchableOpacity style={styles.confirmBtn} onPress={confirmAddress}>
                  <Text style={styles.confirmBtnText}>Подтвердить</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.changeBtn}
                  onPress={() => {
                    setEditMode(true);
                    setAddressConfirmed(false);
                  }}
                >
                  <Text style={styles.changeBtnText}>Изменить</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {addressConfirmed && !editMode ? (
            <View style={styles.confirmedBox}>
              <Text style={styles.confirmedTitle}>Адрес подтверждён</Text>
              <Text style={styles.confirmedText}>{[city, address].filter(Boolean).join(", ")}</Text>
              <TouchableOpacity onPress={() => { setEditMode(true); setAddressConfirmed(false); }}>
                <Text style={styles.changeLink}>Изменить адрес</Text>
              </TouchableOpacity>
            </View>
          ) : null}

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
                    return c ? c.name_ru : t("select_category");
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

          {(editMode || !showConfirmBlock) && !addressConfirmed ? (
            <>
              <Text style={styles.label}>{t("city")}</Text>
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={(v) => { setCity(v); setAddressConfirmed(false); }}
                placeholder={t("city_placeholder")}
                placeholderTextColor={colors.neutral400}
              />

              <Text style={styles.label}>{t("address")}</Text>
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={(v) => { setAddress(v); setAddressConfirmed(false); setEditMode(true); }}
                placeholder={t("address_optional")}
                placeholderTextColor={colors.neutral400}
              />
              {suggestLoading ? <ActivityIndicator style={{ marginTop: 8 }} color={colors.black} /> : null}
              {suggestions.length > 0 ? (
                <View style={styles.suggestBox}>
                  {suggestions.map((item, index) => (
                    <TouchableOpacity
                      key={`${index}-${item.full_address}`}
                      style={styles.suggestRow}
                      onPress={() => pickSuggestion(item)}
                    >
                      <Text style={styles.suggestText}>{item.full_address || item.address}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              {address.trim().length >= 3 ? (
                <TouchableOpacity style={styles.confirmBtnInline} onPress={confirmAddress}>
                  <Text style={styles.confirmBtnText}>Подтвердить адрес</Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : null}

          <Text style={styles.label}>{t("budget")}</Text>
          <TextInput
            style={styles.input}
            value={budget}
            onChangeText={(x) => setBudget(x.replace(/\D/g, ""))}
            placeholder={t("budget_placeholder")}
            placeholderTextColor={colors.neutral400}
            keyboardType="number-pad"
          />

          <PrimaryButton title={t("publish")} onPress={onSubmit} disabled={!canSubmit} loading={busy} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, gap: 4 },
  detectBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.lavender50,
    borderRadius: radii.lg,
    padding: 14,
    marginBottom: 8,
  },
  detectText: { fontSize: 14, fontWeight: "600", color: colors.neutral600 },
  confirmBox: {
    backgroundColor: colors.lavender50,
    borderRadius: radii.lg,
    padding: 16,
    marginBottom: 12,
    gap: 8,
  },
  confirmTitle: { fontSize: 13, fontWeight: "800", color: colors.neutral600, textTransform: "uppercase" },
  confirmAddress: { fontSize: 16, fontWeight: "700", color: colors.black, lineHeight: 22 },
  confirmHint: { fontSize: 13, color: colors.neutral500 },
  confirmActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  confirmBtn: {
    backgroundColor: '#d9f36b',
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  confirmBtnInline: {
    backgroundColor: '#d9f36b',
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  confirmBtnText: { fontSize: 14, fontWeight: "800", color: colors.black },
  changeBtn: {
    backgroundColor: colors.lavender100,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  changeBtnText: { fontSize: 14, fontWeight: "700", color: colors.black },
  confirmedBox: {
    backgroundColor: "#f8fce8",
    borderRadius: radii.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#d9f36b',
  },
  confirmedTitle: { fontSize: 14, fontWeight: "800", color: colors.black },
  confirmedText: { fontSize: 14, color: colors.neutral600, marginTop: 4 },
  changeLink: { fontSize: 14, fontWeight: "700", color: colors.black, marginTop: 8, textDecorationLine: "underline" },
  suggestBox: {
    borderWidth: 1,
    borderColor: colors.neutral100,
    borderRadius: radii.md,
    marginTop: 6,
    overflow: "hidden",
  },
  suggestRow: { padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.neutral100 },
  suggestText: { fontSize: 14, color: colors.black },
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
});
