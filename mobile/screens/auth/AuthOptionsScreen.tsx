import React from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors } from "../../src/theme";
import type { AuthStackParamList } from "../../src/navigation/types";

type Nav = NativeStackNavigationProp<AuthStackParamList, "AuthOptions">;

const logo = require("../../assets/treabo-logo-official.png");
const collage = require("../../assets/auth-work-collage.png");

export default function AuthOptionsScreen() {
  const navigation = useNavigation<Nav>();
  const unavailable = (provider: string) => Alert.alert(provider, "Подключение этого способа входа будет добавлено отдельно.");

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom", "left", "right"]}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.topbar}>
          <TouchableOpacity accessibilityLabel="Назад" onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="chevron-back" size={32} color="#101828" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("PhoneEntry", { role: "customer" })}>
            <Text style={styles.skip}>Пропустить</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.brand}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
          <Text style={styles.tagline}>Реальные работы. Ближе, чем кажется.</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.social, styles.vk]} onPress={() => unavailable("ВКонтакте")} activeOpacity={0.86}>
            <Text style={styles.vkMark}>VK</Text>
            <Text style={styles.socialLightText}>Продолжить с VK</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.social, styles.telegram]} onPress={() => unavailable("Telegram")} activeOpacity={0.86}>
            <Ionicons name="paper-plane" size={26} color={colors.white} />
            <Text style={styles.socialLightText}>Продолжить с Telegram</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.social, styles.google]} onPress={() => unavailable("Google")} activeOpacity={0.86}>
            <Text style={styles.googleMark}>G</Text>
            <Text style={styles.socialDarkText}>Продолжить с Google</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>или</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity style={styles.phone} onPress={() => navigation.navigate("Login")} activeOpacity={0.84}>
            <Ionicons name="call" size={24} color="#303744" />
            <Text style={styles.phoneText}>Войти по телефону</Text>
            <Ionicons name="chevron-forward" size={25} color="#18212F" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("PhoneEntry", { role: "customer" })}>
            <Text style={styles.register}>Создать аккаунт по телефону</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.legal}>
          Продолжая, вы принимаете{"\n"}
          <Text style={styles.legalLink}>Условия использования</Text> и <Text style={styles.legalLink}>Политику конфиденциальности</Text>
        </Text>

        <View style={styles.showcase}>
          <Text style={styles.handwriting}>Ты можешь{"\n"}больше</Text>
          <Image source={collage} style={styles.collage} resizeMode="contain" />
          <Text style={styles.showcaseText}>Тысячи мастеров рядом с вами{"\n"}и реальные примеры их работ</Text>
          <View style={styles.dots}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  content: { flexGrow: 1, paddingBottom: 18 },
  topbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 6 },
  skip: { color: colors.neutral500, fontSize: 15, textDecorationLine: "underline" },
  brand: { alignItems: "center", marginTop: 12 },
  logo: { width: 230, height: 74 },
  tagline: { color: colors.navInactive, fontSize: 15, marginTop: -5 },
  actions: { paddingHorizontal: 32, gap: 10, marginTop: 28 },
  social: { minHeight: 56, borderRadius: 19, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", gap: 16 },
  vk: { backgroundColor: "#2787F5" },
  telegram: { backgroundColor: "#35A9E8" },
  google: { backgroundColor: colors.white, shadowColor: colors.black, shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  vkMark: { color: colors.white, fontSize: 19, fontWeight: "900", width: 30 },
  googleMark: { color: "#4285F4", fontSize: 25, fontWeight: "900", width: 30 },
  socialLightText: { flex: 1, color: colors.white, fontSize: 16, textAlign: "center", marginRight: 30 },
  socialDarkText: { flex: 1, color: colors.black, fontSize: 16, textAlign: "center", marginRight: 30 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 14, marginVertical: 8 },
  divider: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.neutral300 },
  dividerText: { color: colors.neutral500, fontSize: 15 },
  phone: { minHeight: 56, borderRadius: 19, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#F4F5F7" },
  phoneText: { flex: 1, color: "#303744", fontSize: 16 },
  register: { textAlign: "center", color: colors.black, fontSize: 14, fontWeight: "700", marginTop: 2 },
  legal: { color: colors.navInactive, fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 22, paddingHorizontal: 20 },
  legalLink: { textDecorationLine: "underline" },
  showcase: { minHeight: 365, marginTop: 14, paddingTop: 18, overflow: "hidden" },
  handwriting: { position: "absolute", right: 34, top: 0, zIndex: 2, color: colors.black, fontSize: 20, lineHeight: 22, fontStyle: "italic", transform: [{ rotate: "-6deg" }] },
  collage: { width: "112%", height: 230, marginLeft: "-6%", marginTop: 10 },
  showcaseText: { color: colors.black, fontSize: 16, lineHeight: 22, textAlign: "center", marginTop: -2 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 14, marginTop: 24 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.neutral300 },
  dotActive: { width: 22, backgroundColor: colors.accent },
});
