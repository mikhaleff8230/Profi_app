import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  InteractionManager,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { BottomActionBar } from "../components/BottomActionBar";
import { ScreenLayout } from "../components/ScreenLayout";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../src/api";
import { useAuth } from "../src/context/AuthContext";
import { useLang } from "../src/context/LangContext";
import { useChatStore } from "../src/store/chatStore";
import { buildMapUpdateScript, buildYandexMapShellHtml, yandexMapsApiKey } from "../src/maps/yandexMapHtml";
import { timeAgo } from "../src/utils/timeAgo";
import { colors, radii, spacing, typography } from "../src/theme";
import { ScreenHeader } from "../components/ScreenHeader";
import { Badge } from "../components/Badge";
import { PrimaryButton } from "../components/PrimaryButton";
import { CardLight } from "../components/CardLight";
import type { RootStackParamList } from "../src/navigation/types";
import type { CategoryTileData } from "../components/CategoryTile";
import type { Application, ApplicationPreview, Task } from "../src/types/proffi";
import { resolveTaskPhotos } from "../src/utils/photos";
import { formatResponseFeeMdl, formatTaskBudget } from "../src/utils/currency";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, "TaskDetail">;

type AppRow = Application;

type SpecInfo = {
  has_applied?: boolean;
  application_status?: string | null;
  chat_id?: string | null;
  rank?: number;
  customer?: { id: string; name: string; last_seen?: string };
};

type DetailRow = {
  label: string;
  value: string;
};

function TaskInlineMap({ task }: { task: Task }) {
  const webRef = useRef<WebView>(null);
  const [canLoadMap, setCanLoadMap] = useState(false);
  const apiKey = yandexMapsApiKey();
  const html = useMemo(() => (apiKey ? buildYandexMapShellHtml(apiKey) : ""), [apiKey]);
  const lat = Number(task.lat);
  const lng = Number(task.lng);

  useEffect(() => {
    const interaction = InteractionManager.runAfterInteractions(() => setCanLoadMap(true));
    return () => interaction.cancel();
  }, []);

  const injectPoint = useCallback(() => {
    if (!webRef.current || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    webRef.current.injectJavaScript(
      buildMapUpdateScript(
        [
          {
            id: String(task.id),
            title: task.title || "Задание",
            priceLabel: formatTaskBudget(task),
            city: task.city,
            address: task.address,
            lat,
            lng,
          },
        ],
        String(task.id)
      )
    );
  }, [lat, lng, task]);

  if (!apiKey) {
    return (
      <View style={styles.mapPlaceholder}>
        <Ionicons name="map-outline" size={28} color={colors.neutral400} />
        <Text style={styles.mapPlaceholderText}>Ключ Яндекс.Карт не задан</Text>
      </View>
    );
  }

  if (!canLoadMap) {
    return (
      <View style={styles.mapPlaceholder}>
        <ActivityIndicator color={colors.neutral400} />
      </View>
    );
  }

  return (
    <WebView
      ref={webRef}
      originWhitelist={["*"]}
      source={{ html }}
      onLoadEnd={injectPoint}
      onMessage={(event) => {
        try {
          const message = JSON.parse(event.nativeEvent.data);
          if (message.type === "ready") injectPoint();
        } catch {
          /* ignore */
        }
      }}
      javaScriptEnabled
      domStorageEnabled
      style={styles.staticMap}
    />
  );
}

function stringifyDetailValue(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) return value.filter(Boolean).map(String).join(", ");
  if (typeof value === "object") return "";
  return String(value).trim();
}

function parseDescriptionDetails(description: string): DetailRow[] {
  const rows: DetailRow[] = [];
  const lines = description.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  let inAnswers = false;

  for (const line of lines) {
    if (/^Уточнения:?$/i.test(line)) {
      inAnswers = true;
      continue;
    }
    if (/^(Запрос клиента|Кратко|Дополнительные пожелания):/i.test(line)) {
      const [label, ...rest] = line.split(":");
      const value = rest.join(":").trim();
      if (value) rows.push({ label: label.trim(), value });
      inAnswers = false;
      continue;
    }
    if (inAnswers && line.includes(":")) {
      const [label, ...rest] = line.split(":");
      const value = rest.join(":").trim();
      if (label.trim() && value) rows.push({ label: label.trim(), value });
    }
  }

  return rows;
}

function rowsFromStructuredDetails(details: Record<string, unknown> | null | undefined): DetailRow[] {
  if (!details) return [];
  const rows: DetailRow[] = [];
  const answers = details.question_answers;
  const labels: Record<string, string> = {
    city: "Город",
    urgency: "Срок",
    master_summary: "Кратко",
    ai_description: "Описание AI",
    additional_details: "Дополнительные пожелания",
  };

  if (Array.isArray(answers)) {
    answers.forEach((item) => {
      if (!item || typeof item !== "object") return;
      const record = item as Record<string, unknown>;
      const label = stringifyDetailValue(record.question || record.label || record.key);
      const value = stringifyDetailValue(record.answer || record.value);
      if (label && value) rows.push({ label, value });
    });
  }

  const skip = new Set(["question_answers", "prompt", "title", "category_id", "category_slug", "work_id"]);
  Object.entries(details).forEach(([label, value]) => {
    if (skip.has(label)) return;
    const normalized = stringifyDetailValue(value);
    if (normalized) rows.push({ label: labels[label] || label, value: normalized });
  });

  return rows;
}

export default function TaskDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const { taskId } = route.params;
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [task, setTask] = useState<Task | null>(null);
  const [categories, setCategories] = useState<CategoryTileData[]>([]);
  const [apps, setApps] = useState<AppRow[]>([]);
  const [specInfo, setSpecInfo] = useState<SpecInfo | null>(null);
  const [applyPreview, setApplyPreview] = useState<ApplicationPreview | null>(null);
  const [loading, setLoading] = useState(true);
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
      setTask(data as Task);
      setLoadError(null);
      // The task itself is enough to render the screen. Role-specific data is
      // loaded below without keeping the user behind a full-screen spinner.
      setLoading(false);
      if (user?.role === "customer" && String(data.customer_id) === String(user.id)) {
        await apiFetch(`/tasks/${taskId}/applications`, { method: "GET" })
          .then((a) => setApps(Array.isArray(a) ? a : []))
          .catch(() => setApps([]));
      } else setApps([]);
      if (user?.role === "specialist") {
        await Promise.all([
          apiFetch(`/tasks/${taskId}/specialist-info`, { method: "GET" })
            .then(setSpecInfo)
            .catch(() => setSpecInfo(null)),
          apiFetch(`/tasks/${taskId}/applications/preview`, { method: "GET" })
            .then((preview) => setApplyPreview(preview as ApplicationPreview))
            .catch(() => setApplyPreview(null)),
        ]);
      } else {
        setSpecInfo(null);
        setApplyPreview(null);
      }
    } catch (e: unknown) {
      setTask(null);
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

  const cat = task ? categories.find((c) => String(c.id) === String(task.category_id || task.category)) : null;
  const detailRows: DetailRow[] = task
    ? [
        cat ? { label: "Категория", value: cat.name_ru } : null,
        task.city ? { label: "Город", value: task.city } : null,
        task.work_title || task.work?.title || task.work?.name
          ? { label: "Работа", value: String(task.work_title || task.work?.title || task.work?.name) }
          : null,
        ...rowsFromStructuredDetails(task.details || task.ai_answers || task.answers),
        ...parseDescriptionDetails(task.description),
      ].filter((row): row is DetailRow => Boolean(row && row.value))
    : [];
  const isOwner = user?.role === "customer" && task && String(task.customer_id) === String(user.id);
  const isSpecialist = user?.role === "specialist";
  const hasApplied = specInfo?.has_applied;
  const chatId = specInfo?.chat_id ? String(specInfo.chat_id) : "";

  const openExistingChat = async () => {
    if (!chatId) return;
    await loadChats();
    navigation.navigate("ChatDetail", { chatId });
  };

  const openApplyForm = async () => {
    if (!applyPreview) {
      try {
        const preview = await apiFetch(`/tasks/${taskId}/applications/preview`, { method: "GET" });
        setApplyPreview(preview as ApplicationPreview);
      } catch {
        /* preview optional */
      }
    }
    navigation.navigate("TaskApply", { taskId, title: task?.title });
  };

  const submitApplication = async () => {
    if (!applyMsg.trim()) return;
    setBusy(true);
    try {
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
        <Text style={styles.errorTitle}>{t("error_title")}</Text>
        <Text style={styles.errorText}>{loadError || t("no_tasks")}</Text>
        <PrimaryButton title={t("cancel")} fullWidth={false} style={styles.errorBtn} onPress={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  const shortId = task.id.replace(/-/g, "").slice(0, 8).toUpperCase();
  const statusVariant =
    task.status === "open" ? "default" : task.status === "in_progress" ? "warning" : task.status === "completed" ? "success" : "muted";
  const showFooter = isSpecialist && (task.status === "open" || !!chatId);
  const photos = resolveTaskPhotos(task.photos);
  const hasCoords = task.lat != null && task.lng != null;
  const budgetLabel = formatTaskBudget(task);

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

        {budgetLabel && (
          <View style={styles.budgetCard}>
            <Text style={styles.budgetLabel}>Бюджет задания</Text>
            <Text style={styles.budgetValue}>{budgetLabel}</Text>
          </View>
        )}

        <CardLight style={styles.metaCard}>
          <View style={styles.badgeRow}>
            <Badge variant={statusVariant as "default" | "warning" | "success" | "muted"}>{t(task.status) || task.status}</Badge>
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

        {detailRows.length > 0 && (
          <CardLight style={styles.detailsCard}>
            <Text style={styles.h2}>Детали заявки</Text>
            <View style={styles.detailsList}>
              {detailRows.map((row, index) => (
                <View key={`${row.label}-${index}`} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{row.label}</Text>
                  <Text style={styles.detailValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          </CardLight>
        )}

        {(task.address || task.city || hasCoords) && (
          <CardLight style={styles.mapCard}>
            <View style={styles.mapHead}>
              <Ionicons name="home-outline" size={18} color={colors.black} />
              <Text style={styles.h2Small}>{t("address_label")}</Text>
            </View>
            <Text style={styles.addressText}>
              {[task.city, task.address].filter(Boolean).join(", ")}
            </Text>
            {hasCoords ? (
              <TaskInlineMap task={task} />
            ) : (
              <View style={styles.mapPlaceholder}>
                <Ionicons name="map-outline" size={28} color={colors.neutral400} />
                <Text style={styles.mapPlaceholderText}>{t("no_task_coords")}</Text>
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
                      title={t("open_chat")}
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
            {applyPreview && !applyPreview.has_applied && (
              <Text style={styles.previewHint}>
                {applyPreview.is_free
                  ? t("response_preview_free").replace(
                      "{n}",
                      String(applyPreview.free_remaining_before ?? 0)
                    )
                  : t("response_preview_paid").replace(
                      "{fee}",
                      formatResponseFeeMdl(applyPreview.response_fee_mdl)
                    )}
              </Text>
            )}
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
            <PrimaryButton title={t("open_chat")} onPress={openExistingChat} />
          )}
          {!hasApplied && !showApply && (
            <PrimaryButton title={t("message_client")} onPress={openApplyForm} />
          )}
          {hasApplied && !chatId && !showApply && (
            <PrimaryButton
              title={specInfo?.application_status === "accepted" ? t("chat_creating") : t("application_sent")}
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
  budgetCard: {
    borderRadius: 24,
    backgroundColor: "#D9F36B",
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 16,
  },
  budgetLabel: { fontSize: 13, fontWeight: "700", color: colors.neutral700, marginBottom: 6 },
  budgetValue: { fontSize: 28, lineHeight: 34, fontWeight: "800", color: colors.black },
  metaCard: { backgroundColor: colors.lavender50, borderWidth: 0, gap: 8, marginBottom: 16 },
  detailsCard: { backgroundColor: colors.white, marginBottom: 16 },
  detailsList: { gap: 10 },
  detailRow: {
    borderRadius: 16,
    backgroundColor: colors.lavender50,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  detailLabel: { fontSize: 12, fontWeight: "700", color: colors.neutral500, marginBottom: 4 },
  detailValue: { fontSize: 15, lineHeight: 21, color: colors.black },
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
  previewHint: { fontSize: 13, color: colors.neutral600, marginBottom: 4 },
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
