import React from "react";
import { Image, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fileUrl } from "../src/api";
import { colors } from "../src/theme";
import type { Place } from "../src/types/place";

const fallback = require("../assets/intro-interior.png");

type Props = { place: Place; onPress: () => void; onFavorite?: () => void; variant?: "tile" | "row" };

function imageSource(place: Place) {
  const uri = fileUrl(place.cover?.thumbnail || place.cover?.url);
  return uri ? { uri } : fallback;
}

function Author({ place }: { place: Place }) {
  const avatar = fileUrl(place.author?.avatar);
  return (
    <View style={styles.authorRow}>
      {avatar ? <Image source={{ uri: avatar }} style={styles.avatar} /> : <View style={[styles.avatar, styles.avatarFallback]}><Text style={styles.avatarLetter}>{place.author?.name?.charAt(0) || "T"}</Text></View>}
      <View style={styles.authorCopy}>
        <Text numberOfLines={1} style={styles.authorName}>{place.author?.name || "Мастер"}</Text>
        <View style={styles.rating}><Ionicons name="star" size={16} color="#FFC400" /><Text style={styles.ratingText}>{Number(place.author?.rating || 0).toFixed(1)}</Text></View>
      </View>
    </View>
  );
}

export function PlaceCard({ place, onPress, onFavorite, variant = "tile" }: Props) {
  if (variant === "row") {
    return (
      <TouchableOpacity style={styles.rowCard} onPress={onPress} activeOpacity={0.88}>
        <ImageBackground source={imageSource(place)} style={styles.rowImage} imageStyle={styles.rowImageRadius}>
          <View style={styles.photoBadge}><Ionicons name="images-outline" size={14} color={colors.white} /><Text style={styles.photoBadgeText}>{place.gallery?.length || 1} фото</Text></View>
        </ImageBackground>
        <View style={styles.rowBody}>
          <Text numberOfLines={2} style={styles.rowTitle}>{place.title}</Text>
          <View style={styles.metaLine}><Ionicons name="location-outline" size={15} color={colors.navInactive} /><Text numberOfLines={1} style={styles.metaText}>{place.city || "Город не указан"}</Text></View>
          <Text numberOfLines={2} style={styles.description}>{place.description || place.category?.name || "Реальная работа мастера"}</Text>
          <Author place={place} />
        </View>
        <View style={styles.rowAside}><Text numberOfLines={2} style={styles.price}>{place.price_label || "Цена по запросу"}</Text><Ionicons name="chevron-forward" size={22} color={colors.black} /></View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.tile} onPress={onPress} activeOpacity={0.9}>
      <ImageBackground source={imageSource(place)} style={styles.tileImage} imageStyle={styles.tileRadius}>
        <View style={styles.scrim} />
        <View style={styles.distance}><Ionicons name="location" size={14} color={colors.white} /><Text style={styles.distanceText}>{place.distance != null ? `${place.distance < 1 ? Math.round(place.distance * 1000) + " м" : place.distance + " км"}` : place.city || "Рядом"}</Text></View>
        <TouchableOpacity style={styles.heart} onPress={onFavorite} disabled={!onFavorite}><Ionicons name={place.is_favorite ? "heart" : "heart-outline"} size={26} color={place.is_favorite ? "#FF4050" : colors.white} /></TouchableOpacity>
        <View style={styles.tileBottom}>
          <Text numberOfLines={2} style={styles.tileTitle}>{place.title}</Text>
          <Text numberOfLines={1} style={styles.tilePrice}>{place.price_label || "Цена по запросу"}</Text>
          <Author place={place} />
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, minWidth: 0, borderRadius: 20, overflow: "hidden", backgroundColor: colors.neutral100 },
  tileImage: { height: 292, justifyContent: "space-between" },
  tileRadius: { borderRadius: 20 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,.14)" },
  distance: { alignSelf: "flex-start", margin: 10, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(25,22,20,.62)", borderRadius: 18, paddingHorizontal: 9, paddingVertical: 7 },
  distanceText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  heart: { position: "absolute", right: 9, top: 9, width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(20,18,16,.5)" },
  tileBottom: { padding: 12, paddingTop: 44, backgroundColor: "rgba(0,0,0,.38)" },
  tileTitle: { color: colors.white, fontSize: 18, lineHeight: 21, fontWeight: "900" },
  tilePrice: { color: colors.white, fontSize: 17, lineHeight: 22, fontWeight: "900", marginTop: 3 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 9 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#E9ECF1" },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarLetter: { color: colors.black, fontSize: 14, fontWeight: "900" },
  authorCopy: { flex: 1, minWidth: 0 },
  authorName: { color: colors.white, fontSize: 13, fontWeight: "700" },
  rating: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { color: colors.white, fontSize: 12 },
  rowCard: { flexDirection: "row", minHeight: 150, borderRadius: 20, padding: 9, backgroundColor: colors.white, shadowColor: "#162033", shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  rowImage: { width: 118, minHeight: 132, justifyContent: "flex-end", overflow: "hidden" },
  rowImageRadius: { borderRadius: 15 },
  photoBadge: { alignSelf: "flex-start", margin: 8, flexDirection: "row", gap: 4, alignItems: "center", backgroundColor: "rgba(0,0,0,.64)", borderRadius: 12, paddingHorizontal: 7, paddingVertical: 5 },
  photoBadgeText: { color: colors.white, fontSize: 11, fontWeight: "700" },
  rowBody: { flex: 1, paddingHorizontal: 12, minWidth: 0 },
  rowTitle: { color: colors.black, fontSize: 16, lineHeight: 19, fontWeight: "900" },
  metaLine: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 },
  metaText: { flex: 1, color: colors.navInactive, fontSize: 12 },
  description: { color: colors.neutral600, fontSize: 12, lineHeight: 16, marginTop: 7 },
  rowBodyAuthor: {},
  rowAside: { width: 87, justifyContent: "space-between", alignItems: "flex-end", paddingVertical: 2 },
  price: { color: colors.black, fontSize: 15, lineHeight: 18, textAlign: "right", fontWeight: "900" },
});
