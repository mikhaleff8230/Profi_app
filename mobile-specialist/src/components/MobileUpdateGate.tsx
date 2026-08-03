import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { apiFetch } from "../api";
import { colors, radii } from "../theme";

type MobileVersionResponse = {
  latest_version?: string | null;
  latest_build?: number | string | null;
  min_supported_build?: number | string | null;
  force_update?: boolean | number | null;
  android_url?: string | null;
  ios_url?: string | null;
  release_notes?: string | null;
  is_active?: boolean | number | null;
};

type UpdateState = {
  latestVersion: string;
  latestBuild: number;
  required: boolean;
  url: string;
  releaseNotes?: string | null;
};

const DISMISSED_KEY_PREFIX = "treabo_update_dismissed_build:";

function currentBuildNumber(): number {
  const platformBuild =
    Platform.OS === "android"
      ? Constants.platform?.android?.versionCode
      : Number(Constants.platform?.ios?.buildNumber);
  const configBuild =
    Platform.OS === "android"
      ? Constants.expoConfig?.android?.versionCode
      : Number(Constants.expoConfig?.ios?.buildNumber);

  const build = Number(platformBuild || configBuild || 1);
  return Number.isFinite(build) && build > 0 ? build : 1;
}

function resolveUpdate(data: MobileVersionResponse): UpdateState | null {
  if (data.is_active === false || data.is_active === 0) return null;

  const latestBuild = Number(data.latest_build || 0);
  const minSupportedBuild = Number(data.min_supported_build || latestBuild || 0);
  const url = Platform.OS === "ios" ? data.ios_url : data.android_url;
  if (!latestBuild || !url) return null;

  const currentBuild = currentBuildNumber();
  const required = Boolean(data.force_update) || currentBuild < minSupportedBuild;
  if (currentBuild >= latestBuild) return null;

  return {
    latestVersion: data.latest_version || `build ${latestBuild}`,
    latestBuild,
    required,
    url,
    releaseNotes: data.release_notes,
  };
}

export function MobileUpdateGate() {
  const [update, setUpdate] = useState<UpdateState | null>(null);
  const checkingRef = useRef(false);

  const checkForUpdate = useCallback(async () => {
    if (checkingRef.current || Platform.OS === "web") return;
    checkingRef.current = true;
    try {
      const data = (await apiFetch("/mobile-version", { auth: false })) as MobileVersionResponse;
      const nextUpdate = resolveUpdate(data);
      if (!nextUpdate) {
        setUpdate(null);
        return;
      }

      if (!nextUpdate.required) {
        const dismissed = await AsyncStorage.getItem(`${DISMISSED_KEY_PREFIX}${nextUpdate.latestBuild}`);
        if (dismissed) return;
      }

      setUpdate(nextUpdate);
    } catch {
      // The version check must never block app startup when API is unavailable.
    } finally {
      checkingRef.current = false;
    }
  }, []);

  useEffect(() => {
    void checkForUpdate();
  }, [checkForUpdate]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void checkForUpdate();
    });
    return () => subscription.remove();
  }, [checkForUpdate]);

  const notes = useMemo(() => update?.releaseNotes?.trim(), [update?.releaseNotes]);

  if (!update) return null;

  async function openUpdate() {
    if (!update?.url) return;
    await Linking.openURL(update.url);
  }

  async function dismiss() {
    if (!update || update.required) return;
    await AsyncStorage.setItem(`${DISMISSED_KEY_PREFIX}${update.latestBuild}`, "1");
    setUpdate(null);
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={update.required ? undefined : dismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Доступно обновление</Text>
          <Text style={styles.text}>
            Установите Treabo {update.latestVersion}, чтобы получить свежие функции и исправления.
          </Text>
          {notes ? <Text style={styles.notes}>{notes}</Text> : null}
          <Pressable style={styles.primaryButton} onPress={openUpdate}>
            <Text style={styles.primaryText}>Обновить приложение</Text>
          </Pressable>
          {!update.required ? (
            <Pressable style={styles.secondaryButton} onPress={dismiss}>
              <Text style={styles.secondaryText}>Позже</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    padding: 22,
  },
  title: {
    color: colors.black,
    fontSize: 22,
    fontWeight: "800",
  },
  text: {
    marginTop: 10,
    color: colors.neutral700,
    fontSize: 15,
    lineHeight: 21,
  },
  notes: {
    marginTop: 12,
    color: colors.neutral600,
    fontSize: 13,
    lineHeight: 19,
  },
  primaryButton: {
    marginTop: 20,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.sm,
    backgroundColor: colors.black,
  },
  primaryText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    color: colors.neutral600,
    fontSize: 14,
    fontWeight: "700",
  },
});
