import React from "react";
import {
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors } from "../../src/theme";
import type { AuthStackParamList } from "../../src/navigation/types";

type Nav = NativeStackNavigationProp<AuthStackParamList, "Welcome">;

const background = require("../../assets/intro-interior.png");
const lightLogo = require("../../assets/treabo-logo-light.png");

const benefits = [
  { icon: "images-outline" as const, text: "Смотрите\nреальные работы" },
  { icon: "hammer-outline" as const, text: "Находите\nпроверенных мастеров" },
  { icon: "person-outline" as const, text: "Создавайте\nсвои проекты" },
];

export default function WelcomeAuthScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <ImageBackground source={background} style={styles.root} resizeMode="cover">
      <StatusBar style="light" />
      <View style={styles.overlay} />
      <SafeAreaView style={styles.safe} edges={["top", "bottom", "left", "right"]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} bounces={false}>
          <View style={styles.eyebrowWrap}>
            <Text style={styles.eyebrow}>РЕАЛЬНЫЕ{"\n"}ЛЮДИ{"\n"}РЕАЛЬНЫЕ{"\n"}РАБОТЫ</Text>
            <View style={styles.eyebrowLine} />
          </View>

          <View style={styles.brand}>
            <Image source={lightLogo} style={styles.logo} resizeMode="contain" />
            <Text style={styles.tagline}>Реальные работы.{"\n"}Ближе, чем кажется.</Text>
          </View>

          <View style={styles.bottom}>
            <View style={styles.benefits}>
              {benefits.map((benefit) => (
                <View key={benefit.icon} style={styles.benefit}>
                  <Ionicons name={benefit.icon} size={34} color={colors.white} />
                  <Text style={styles.benefitText}>{benefit.text}</Text>
                </View>
              ))}
            </View>

            <View style={styles.dots}>
              <View style={[styles.dot, styles.dotActive]} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>

            <TouchableOpacity style={styles.primary} activeOpacity={0.88} onPress={() => navigation.navigate("AuthOptions")}>
              <Text style={styles.primaryText}>Начать</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondary} activeOpacity={0.8} onPress={() => navigation.navigate("Login")}>
              <Text style={styles.secondaryText}>Войти</Text>
            </TouchableOpacity>

            <Text style={styles.legal}>
              Продолжая, вы принимаете{"\n"}
              <Text style={styles.legalLink}>Условия использования</Text> и <Text style={styles.legalLink}>Политику конфиденциальности</Text>
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#17110C" },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10, 7, 4, 0.35)" },
  safe: { flex: 1 },
  content: {
    flexGrow: 1,
    minHeight: 780,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 14,
    justifyContent: "space-between",
  },
  eyebrowWrap: { alignSelf: "flex-end", marginRight: 4 },
  eyebrow: { color: "rgba(255,255,255,0.72)", fontSize: 13, lineHeight: 19, letterSpacing: 2.1 },
  eyebrowLine: { width: 34, height: 1, backgroundColor: "rgba(255,255,255,0.72)", marginTop: 16 },
  brand: { alignItems: "center", marginTop: 22 },
  logo: { width: 258, height: 86 },
  tagline: { color: colors.white, fontSize: 20, lineHeight: 28, textAlign: "center", marginTop: 2 },
  bottom: { marginTop: 110 },
  benefits: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  benefit: { width: "31%", alignItems: "center" },
  benefitText: { color: colors.white, textAlign: "center", fontSize: 13, lineHeight: 18, marginTop: 7 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 15, marginTop: 30, marginBottom: 28 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.35)" },
  dotActive: { backgroundColor: colors.accent },
  primary: { minHeight: 62, borderRadius: 31, alignItems: "center", justifyContent: "center", backgroundColor: colors.accent },
  primaryText: { color: colors.black, fontSize: 20, fontWeight: "900" },
  secondary: {
    minHeight: 58,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  secondaryText: { color: colors.white, fontSize: 18, fontWeight: "600" },
  legal: { color: "rgba(255,255,255,0.58)", fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 19 },
  legalLink: { textDecorationLine: "underline" },
});
