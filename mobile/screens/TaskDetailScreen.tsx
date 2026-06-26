import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomActionBar } from "../components/BottomActionBar";
import { ScreenLayout } from "../components/ScreenLayout";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../src/api";
import { fileUrl } from "../src/api";
import { useAuth } from "../src/context/AuthContext";
import { useLang } from "../src/context/LangContext";
import { useChatStore } from "../src/store/chatStore";
import { yandexMapsApiKey } from "../src/maps/yandexMapHtml";
import { timeAgo } from "../src/utils/timeAgo";
import { colors, radii, spacing, typography } from "../src/theme";
import { ScreenHeader } from "../components/ScreenHeader";
import { Badge } from "../components/Badge";
import { PrimaryButton } from "../components/PrimaryButton";
import { CardLight } from "../components/CardLight";
import type { RootStackParamList } from "../src/navigation/types";
import type { CategoryTileData } from "../components/CategoryTile";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, "TaskDetail">;

type TaskFull = {
  id: string;
  title: string;
  description: string;
  category: string | number;
  city: string;
  address?: string | null;
  budget?: number | null;
  deadline?: string | null;
  status: string;
  customer_id: string;
  customer_name?: string;
  created_at: string;
  photos?: string[];
  lat?: number | null;
  lng?: number | null;
  distance_km?: number | null;
};

type AppRow = {
  id: string;
  specialist_id: string;
  specialist_name: string;
  specialist_city?: string | null;
  message: string;
  price?: number | null;
  status: string;
  chat_id?: string | null;
};

function yandexStaticMapUrl(lat: number, lng: number): string {
  const params = new URLSearchParams({
    ll: `${lng},${lat}`,
    z: "12",
    size: "650,320",
    l: "map",
    pt: `${lng},${lat},pm2rdm`,
    lang: "ru_RU",
  });
  const apiKey = yandexMapsApiKey();
  if (apiKey) params.set("apikey", apiKey);
  return `https://static-maps.yandex.ru/v1?${params.toString()}`;
}

export default function TaskDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const { taskId } = route.params;
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [task, setTask] = useState<TaskFull | null>(null);
  const [categories, setCategories] = useState<CategoryTileData[]>([]);
  const [apps, setApps] = useState<AppRow[]>([]);
  const [specInfo, setSpecInfo] = useState<{
    has_applied?: boolean;
    application_status?: string | null;
    chat_id?: string | null;
    rank?: number;
    customer?: { id: string; name: string; last_seen?: string };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showApply, setShowApply] = useState(false);
  const [applyMsg, setApplyMsg] = useState("");
  const [applyPrice, setApplyPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const loadChats = useChatStore((s) => s.loadChats);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/tasks/${taskId}`, { method: "GET" });
      setTask(data as TaskFull);
      setDemo(false);
      setLoadError(null);
      if (user?.role === "customer" && String(data.customer_id) === String(user.id)) {
        try {
          const a = await apiFetch(`/tasks/${taskId}/applications`, { method: "GET" });
          setApps(Array.isArray(a) ? a : []);
        } catch {
          setApps([]);
        }
      } else setApps([]);
      if (user?.role === "specialist") {
        try {
          const si = await apiFetch(`/tasks/${taskId}/specialist-info`, { method: "GET" });
          setSpecInfo(si);
        } catch {
          setSpecInfo({ has_applied: false, rank: 1, customer: { id: "0", name: data.customer_name || "Клиент" } });
        }
      }
    } catch (e: unknown) {
      setTask(null);
      setDemo(false);
      setLoadError(e instanceof Error ? e.message : String(e));
      setApps([]);
      setSpecInfo(null);
    } finally {
      setLoading(false);
    }
  }, [taskId, user]);

  useEffect(() => {
    apiFetch("/categories", { method: "GET" })
      .then((d) => (Array.isArray(d) ? d : []))
      .catch(() => [])
      .then(setCategories);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cat = task ? categories.find((c) => String(c.id) === String(task.category)) : null;
  const isOwner = user?.role === "customer" && task && String(task.customer_id) === String(user.id);
  const isSpecialist = user?.role === "specialist";
  const hasApplied = specInfo?.has_applied;
  const chatId = specInfo?.chat_id ? String(specInfo.chat_id) : "";

  const openExistingChat = async () => {
    if (!chatId) return;
    await loadChats();
    navigation.navigate("ChatDetail", { chatId });
  };

  const submitApplication = async () => {
    if (!applyMsg.trim()) return;
    setBusy(true);
    try {
      if (demo) {
        Alert.alert(t("success"), t("demo_apply_saved"));
        setShowApply(false);
        setApplyMsg("");
        setApplyPrice("");
        setSpecInfo((s) => ({ ...s, has_applied: true }));
        return;
      }
      const response = await apiFetch(`/tasks/${taskId}/applications`, {
        method: "POST",
        body: JSON.stringify({
          message: applyMsg.trim(),
          price: applyPrice ? parseInt(applyPrice, 10) : null,
        }),
      });
      const nextChatId = response?.chat_id ? String(response.chat_id) : "";
      setShowApply(false);
      setApplyMsg("");
      setApplyPrice("");
      if (nextChatId) {
        await loadChats();
        navigation.navigate("ChatDetail", { chatId: nextChatId });
        return;
      }
      Alert.alert(t("success"));
      load();
    } catch (e: unknown) {
      Alert.alert("Ошибка", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const acceptApp = async (appId: string) => {
    try {
      if (demo) {
        Alert.alert(t("success"), t("demo_action"));
        return;
      }
      const response = await apiFetch(`/applications/${appId}/accept`, { method: "POST" });
      const chatId = response?.chat_id ? String(response.chat_id) : "";
      await loadChats();
      if (chatId) {
        navigation.navigate("ChatDetail", { chatId });
        return;
      }
      Alert.alert(t("success"));
      load();
    } catch (e: unknown) {
      Alert.alert("Ошибка", e instanceof Error ? e.message : String(e));
    }
  };

  const deleteTask = () => {
    Alert.alert(t("confirm_delete_title"), t("confirm_delete"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("yes"),
        style: "destructive",
        onPress: async () => {
          try {
            if (demo) {
              navigation.goBack();
              return;
            }
            await apiFetch(`/tasks/${taskId}`, { method: "DELETE" });
            navigation.goBack();
          } catch (e: unknown) {
            Alert.alert("Ошибка", e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={["top", "bottom", "left", "right"]}>
        <ActivityIndicator size="large" />
        <Text style={styles.muted}>{t("loading")}</Text>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.center} edges={["top", "bottom", "left", "right"]}>
        <Text style={styles.errorTitle}>Ошибка</Text>
        <Text style={styles.errorText}>{loadError || t("no_tasks")}</Text>
        <PrimaryButton title={t("cancel")} fullWidth={false} style={styles.errorBtn} onPress={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  const shortId = task.id.replace(/-/g, "").slice(0, 8).toUpperCase();
  const statusVariant =
    task.status === "open" ? "default" : task.status === "in_progress" ? "warning" : task.status === "completed" ? "success" : "muted";
  const showFooter = isSpecialist && (task.status === "open" || !!chatId);
  const photos = (task.photos || []).map((path) => fileUrl(path) || path).filter(Boolean);
  const hasCoords = task.lat != null && task.lng != null;

  return (
    <ScreenLayout bottomInset={!showFooter}>
      <ScreenHeader
        title={isSpecialist ? task.title : ""}
        onBack={() => navigation.goBack()}
        right={
          isOwner && task.status === "open" ? (
            <TouchableOpacity onPress={deleteTask}>
              <Ionicons name="ellipsis-horizontal" size={22} color={colors.neutral500} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => {}}>
              <Ionicons name="ellipsis-horizontal" size={22} color={colors.neutral500} />
            </TouchableOpacity>
          )
        }
      />
      {demo && (
        <View style={styles.demoBanner}>
          <Text style={styles.demoText}>{t("demo_data_banner")}</Text>
        </View>
      )}

      <ScrollView style={styles.scrollFlex} contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>{task.title}</Text>

        {photos.length > 0 && (
          <View style={styles.photoSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoTrack}>
              {photos.map((uri, index) => (
                <View key={`${uri}-${index}`} style={styles.photoWrap}>
                  <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
                  <View style={styles.photoCounter}>
                    <Text style={styles.photoCounterText}>
                      {index + 1}/{photos.length}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {isSpecialist && (
          <View style={styles.specBlock}>
            <Text style={styles.orderNo}>
              {t("order_no")} {shortId}
            </Text>
            <Text style={styles.metaLine}>
              {t("order_left_at")}{" "}
              {new Date(task.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
            </Text>
            <View style={styles.bannerInfo}>
              <Ionicons name="information-circle-outline" size={18} color={colors.neutral600} />
              <Text style={styles.bannerInfoText}>
                {specInfo?.rank === 1 ? t("rank_first") : t("rank_position").replace("{n}", String(specInfo?.rank ?? "—"))}
              </Text>
            </View>
            {specInfo?.customer && (
              <TouchableOpacity
                style={styles.customerRow}
                onPress={() => {}}
                activeOpacity={0.9}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarTxt}>{specInfo.customer.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.custName}>{specInfo.customer.name}</Text>
                  <Text style={styles.custSub}>
                    {t("online_ago")} {specInfo.customer.last_seen ? timeAgo(specInfo.customer.last_seen, lang) : "—"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.neutral300} />
              </TouchableOpacity>
            )}
          </View>
        )}

        <CardLight style={styles.sectionCard}>
          <Text style={styles.h2}>{t("description_label")}</Text>
          <Text style={styles.desc}>{task.description}</Text>
        </CardLight>

        <CardLight style={styles.metaCard}>
          <View style={styles.badgeRow}>
            <Badge variant={statusVariant as "default" | "warning" | "success" | "muted"}>{t(task.status) || task.status}</Badge>
            {task.budget != null && task.budget > 0 && (
              <Badge>
                {t("budget_upto")} {task.budget} {t("rub")}
              </Badge>
            )}
          </View>
          {cat && (
            <View style={styles.rowSm}>
              <Ionicons name="pricetag-outline" size={16} color={colors.neutral500} />
              <Text style={styles.rowSmText}>{cat.name_ru}</Text>
            </View>
          )}
          <View style={styles.rowSm}>
            <Ionicons name="location-outline" size={16} color={colors.neutral500} />
            <Text style={styles.rowSmText}>
              {task.city}
              {task.address ? `, ${task.address}` : ""}
              {task.distance_km != null && ` · ${task.distance_km} ${t("distance_km")}`}
            </Text>
          </View>
        </CardLight>

        {(task.address || task.city || hasCoords) && (
          <CardLight style={styles.mapCard}>
            <View style={styles.mapHead}>
              <Ionicons name="home-outline" size={18} color={colors.black} />
              <Text style={styles.h2Small}>Адрес</Text>
            </View>
            <Text style={styles.addressText}>
              {[task.city, task.address].filter(Boolean).join(", ")}
            </Text>
            {hasCoords ? (
              <Image
                source={{ uri: yandexStaticMapUrl(Number(task.lat), Number(task.lng)) }}
                style={styles.staticMap}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.mapPlaceholder}>
                <Ionicons name="map-outline" size={28} color={colors.neutral400} />
                <Text style={styles.mapPlaceholderText}>Координаты заказа пока не указаны</Text>
              </View>
            )}
          </CardLight>
        )}

        {isOwner && (
          <View style={styles.section}>
            <Text style={styles.h2}>
              {t("applications")} <Text style={styles.mutedCount}>({apps.length})</Text>
            </Text>
            {apps.length === 0 && <Text style={styles.muted}>{t("no_applications")}</Text>}
            {apps.map((a) => (
              <CardLight key={a.id} style={styles.appCard}>
                <TouchableOpacity
                  style={styles.appHead}
                  onPress={() => navigation.navigate("SpecialistProfile", { specialistId: String(a.specialist_id) })}
                >
                  <View style={styles.avatarSm}>
                    <Text style={styles.avatarSmTxt}>{a.specialist_name.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.custName}>{a.specialist_name}</Text>
                    <Text style={styles.custSub}>{a.specialist_city || ""}</Text>
                  </View>
                  {a.status === "accepted" && <Badge variant="success">{t("accepted")}</Badge>}
                  {a.status === "rejected" && <Badge variant="muted">{t("rejected")}</Badge>}
                </TouchableOpacity>
                <Text style={styles.appMsg}>{a.message}</Text>
                <View style={styles.appFoot}>
                  {a.price != null && a.price > 0 && (
                    <Text style={styles.price}>
                      {a.price} {t("rub")}
                    </Text>
                  )}
                  {a.status === "accepted" && a.chat_id && (
                    <PrimaryButton
                      title="Написать в чат"
                      fullWidth={false}
                      style={styles.acceptBtn}
                      onPress={async () => {
                        await loadChats();
                        navigation.navigate("ChatDetail", { chatId: String(a.chat_id) });
                      }}
                    />
                  )}
                  {task.status === "open" && a.status === "pending" && (
                    <PrimaryButton title={t("accept")} fullWidth={false} style={styles.acceptBtn} onPress={() => acceptApp(a.id)} />
                  )}
                </View>
              </CardLight>
            ))}
          </View>
        )}

        {isSpecialist && showApply && (
          <View style={styles.applyBox}>
            <Text style={styles.h2}>{t("fits_question")}</Text>
            <TextInput
              style={styles.textarea}
              placeholder={t("message_placeholder")}
              placeholderTextColor={colors.neutral400}
              value={applyMsg}
              onChangeText={setApplyMsg}
              multiline
            />
            <TextInput
              style={styles.input}
              placeholder={t("your_price")}
              placeholderTextColor={colors.neutral400}
              keyboardType="number-pad"
              value={applyPrice}
              onChangeText={(x) => setApplyPrice(x.replace(/\D/g, ""))}
            />
          </View>
        )}
      </ScrollView>

      {isSpecialist && (task.status === "open" || !!chatId) && (
        <BottomActionBar>
          {!!chatId && !showApply && (
            <PrimaryButton title="Написать в чат" onPress={openExistingChat} />
          )}
          {!hasApplied && !showApply && (
            <PrimaryButton title={t("message_client")} onPress={() => setShowApply(true)} />
          )}
          {hasApplied && !chatId && !showApply && (
            <PrimaryButton
              title={specInfo?.application_status === "accepted" ? "Чат создается" : "Отклик отправлен"}
              onPress={() => {}}
              disabled
            />
          )}
          {showApply && (
            <View style={styles.footerRow}>
              <PrimaryButton title={t("cancel")} variant="secondary" fullWidth={false} style={styles.half} onPress={() => setShowApply(false)} />
              <PrimaryButton
                title={busy ? t("loading") : t("submit_application")}
                fullWidth={false}
                style={styles.half}
                onPress={submitApplication}
                disabled={busy || !applyMsg.trim()}
              />
            </View>
          )}
        </BottomActionBar>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.white },
  muted: { marginTop: 8, color: colors.neutral400 },
  errorTitle: { fontSize: 18, fontWeight: "800", color: colors.black, marginBottom: 8 },
  errorText: { fontSize: 14, color: colors.neutral500, textAlign: "center", paddingHorizontal: spacing.xl, marginBottom: 16 },
  errorBtn: { paddingHorizontal: 24 },
  scrollFlex: { flex: 1 },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  demoBanner: { paddingVertical: 8, backgroundColor: colors.lavender100 },
  demoText: { textAlign: "center", fontSize: 12, color: colors.neutral600 },
  h1: { ...typography.title, fontSize: 26, marginBottom: 16, lineHeight: 32 },
  h2: { ...typography.headline, fontSize: 18, marginBottom: 8 },
  h2Small: { ...typography.headline, fontSize: 16 },
  photoSection: { marginBottom: 16, marginHorizontal: -spacing.xl },
  photoTrack: { paddingHorizontal: spacing.xl, gap: 12 },
  photoWrap: {
    width: 252,
    aspectRatio: 1,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: colors.lavender50,
  },
  photo: { width: "100%", height: "100%" },
  photoCounter: {
    position: "absolute",
    right: 10,
    bottom: 10,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.68)",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  photoCounterText: { color: colors.white, fontSize: 12, fontWeight: "800" },
  specBlock: { marginBottom: 16, gap: 8 },
  orderNo: { fontSize: 18, fontWeight: "800" },
  metaLine: { fontSize: 14, color: colors.neutral500 },
  bannerInfo: { flexDirection: "row", gap: 8, backgroundColor: colors.lavender100, padding: 12, borderRadius: radii.lg },
  bannerInfoText: { flex: 1, fontSize: 14, color: colors.neutral700 },
  customerRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderTopWidth: 1, borderColor: colors.neutral100 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { fontSize: 18, fontWeight: "800", color: colors.white },
  avatarSm: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lavender100,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSmTxt: { fontSize: 16, fontWeight: "800", color: colors.black },
  custName: { fontWeight: "700", fontSize: 15 },
  custSub: { fontSize: 12, color: colors.neutral400 },
  desc: { fontSize: 16, color: colors.neutral700, lineHeight: 24 },
  sectionCard: { backgroundColor: colors.white, marginBottom: 16 },
  metaCard: { backgroundColor: colors.lavender50, borderWidth: 0, gap: 8, marginBottom: 16 },
  mapCard: { backgroundColor: colors.white, marginBottom: 16, gap: 10 },
  mapHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  addressText: { fontSize: 14, color: colors.neutral700, lineHeight: 20 },
  staticMap: { width: "100%", height: 180, borderRadius: 16, backgroundColor: colors.lavender50 },
  mapPlaceholder: {
    height: 150,
    borderRadius: 16,
    backgroundColor: colors.lavender50,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  mapPlaceholderText: { color: colors.neutral500, fontSize: 13, textAlign: "center" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  rowSm: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowSmText: { fontSize: 14, flex: 1 },
  section: { marginTop: 8 },
  mutedCount: { fontWeight: "400", color: colors.neutral400 },
  appCard: { marginTop: 12 },
  appHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  appMsg: { fontSize: 14, color: colors.neutral700, marginBottom: 8 },
  appFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  price: { fontWeight: "800", fontSize: 16 },
  acceptBtn: { minWidth: 120, paddingHorizontal: 16 },
  applyBox: { marginTop: 12, gap: 8 },
  textarea: {
    minHeight: 100,
    backgroundColor: colors.lavender50,
    borderRadius: radii.lg,
    padding: 12,
    fontSize: 15,
    textAlignVertical: "top",
  },
  input: {
    backgroundColor: colors.lavender50,
    borderRadius: radii.lg,
    padding: 14,
    fontSize: 16,
  },
  footerRow: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
});
