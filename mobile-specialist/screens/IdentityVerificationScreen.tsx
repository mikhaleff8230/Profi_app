import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScreenLayout } from "../components/ScreenLayout";
import { ScreenHeader } from "../components/ScreenHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import { apiFetch, apiUploadFile, fileUrl } from "../src/api";
import { colors, radii, spacing, typography } from "../src/theme";
import type { RootStackParamList } from "../src/navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Slot = "passport_main_photo" | "passport_registration_photo" | "passport_selfie_photo";

const SLOT_LABELS: Record<Slot, string> = {
  passport_main_photo: "Разворот паспорта",
  passport_registration_photo: "Страница с пропиской",
  passport_selfie_photo: "Селфи с паспортом",
};

export default function IdentityVerificationScreen() {
  const navigation = useNavigation<Nav>();
  const [status, setStatus] = useState("not_submitted");
  const [photos, setPhotos] = useState<Partial<Record<Slot, string>>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/identity-verification", { method: "GET" })
      .then((data) => {
        setStatus(data?.status || "not_submitted");
        setPhotos({
          passport_main_photo: data?.passport_main_photo,
          passport_registration_photo: data?.passport_registration_photo,
          passport_selfie_photo: data?.passport_selfie_photo,
        });
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const capture = async (slot: Slot) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Камера", "Нужен доступ к камере для верификации");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });
    if (res.canceled || !res.assets[0]?.uri) return;
    setBusy(true);
    try {
      const asset = res.assets[0];
      const upload = await apiUploadFile(asset.uri, asset.mimeType || "image/jpeg", `${slot}.jpg`);
      setPhotos((prev) => ({ ...prev, [slot]: upload.path }));
    } catch (e: unknown) {
      Alert.alert("Ошибка", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    const payload = {
      passport_main_photo: photos.passport_main_photo,
      passport_registration_photo: photos.passport_registration_photo,
      passport_selfie_photo: photos.passport_selfie_photo,
    };
    if (!payload.passport_main_photo || !payload.passport_registration_photo || !payload.passport_selfie_photo) {
      Alert.alert("Фото", "Сделайте все три снимка через камеру");
      return;
    }
    setBusy(true);
    try {
      const data = await apiFetch("/identity-verification", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setStatus(data?.status || "pending");
      Alert.alert("Отправлено", "Заявка на проверку отправлена");
      navigation.goBack();
    } catch (e: unknown) {
      Alert.alert("Ошибка", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <ScreenLayout>
        <View style={styles.center}>
          <ActivityIndicator color={colors.black} />
        </View>
      </ScreenLayout>
    );
  }

  const readOnly = status === "pending" || status === "approved";

  return (
    <ScreenLayout>
      <ScreenHeader title="Верификация" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.status}>Статус: {status}</Text>
        <Text style={styles.hint}>Используйте только камеру — загрузка из галереи недоступна.</Text>
        {(Object.keys(SLOT_LABELS) as Slot[]).map((slot) => {
          const previewUri = photos[slot] ? fileUrl(photos[slot]!) : null;
          return (
          <View key={slot} style={styles.card}>
            <Text style={styles.label}>{SLOT_LABELS[slot]}</Text>
            {previewUri ? (
              <Image source={{ uri: previewUri }} style={styles.preview} />
            ) : (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderText}>Нет фото</Text>
              </View>
            )}
            {!readOnly && (
              <TouchableOpacity style={styles.camBtn} onPress={() => capture(slot)} disabled={busy}>
                <Text style={styles.camBtnText}>Сфотографировать</Text>
              </TouchableOpacity>
            )}
          </View>
          );
        })}
        {!readOnly && <PrimaryButton title="Отправить на проверку" onPress={submit} loading={busy} />}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  status: { ...typography.headline, color: colors.black },
  hint: { ...typography.body, color: colors.neutral500 },
  card: {
    borderWidth: 1,
    borderColor: colors.neutral100,
    borderRadius: radii.xl,
    padding: spacing.md,
    gap: spacing.sm,
  },
  label: { fontWeight: "700", color: colors.black },
  preview: { width: "100%", height: 160, borderRadius: radii.lg },
  placeholder: {
    height: 120,
    borderRadius: radii.lg,
    backgroundColor: colors.lavender50,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: { color: colors.neutral400 },
  camBtn: {
    alignSelf: "flex-start",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.black,
  },
  camBtnText: { color: colors.white, fontWeight: "700" },
});
