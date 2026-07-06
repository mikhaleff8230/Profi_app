import React, { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { apiFetch, fileUrl } from "../src/api";

type Props = {
  size?: "splash" | "auth";
};

const localLogo = require("../assets/treabo-logo.png");

export function TreaboLogo({ size = "auth" }: Props) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const isSplash = size === "splash";
  const imageStyle = [styles.logoImage, isSplash && styles.logoImageSplash];

  useEffect(() => {
    apiFetch("/site-settings", { method: "GET", auth: false })
      .then((data) => {
        const raw = typeof data?.logo_url === "string" ? data.logo_url : null;
        setLogoUrl(raw ? fileUrl(raw) : null);
      })
      .catch(() => setLogoUrl(null));
  }, []);

  if (logoUrl) {
    return (
      <View style={styles.wrap} accessibilityRole="image" accessibilityLabel="Treabo">
        <Image source={{ uri: logoUrl }} style={imageStyle} resizeMode="contain" />
      </View>
    );
  }

  return (
    <View style={styles.wrap} accessibilityRole="image" accessibilityLabel="Treabo">
      <Image source={localLogo} style={imageStyle} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  logoImage: { width: 220, height: 74 },
  logoImageSplash: { width: 280, height: 96 },
});
