import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { TreaboLogo } from "../../components/TreaboLogo";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { NavigationContainer, DefaultTheme, type Theme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import { colors } from "../theme";
import { useChatStore } from "../store/chatStore";
import WelcomeAuthScreen from "../../screens/auth/WelcomeAuthScreen";
import PhoneAuthScreen from "../../screens/auth/PhoneAuthScreen";
import LoginStubScreen from "../../screens/LoginStubScreen";
import HomeScreen from "../../screens/HomeScreen";
import ChatsScreen from "../../screens/ChatsScreen";
import ProfileScreen from "../../screens/ProfileScreen";
import AiCreateRequestScreen from "../../screens/AiCreateRequestScreen";
import TaskDetailScreen from "../../screens/TaskDetailScreen";
import ChatDetailScreen from "../../screens/ChatDetailScreen";
import SpecialistProfileScreen from "../../screens/SpecialistProfileScreen";
import PhoneChangeScreen from "../../screens/PhoneChangeScreen";
import MyReviewsScreen from "../../screens/MyReviewsScreen";
import type { AuthStackParamList, MainTabParamList, RootStackParamList } from "./types";
import { getTabBarStyle } from "./tabBar";

const AuthStackNav = createNativeStackNavigator<AuthStackParamList>();
const AppStackNav = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const navTheme: Theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.white, card: colors.white, primary: colors.black, text: colors.black, border: colors.neutral100 },
};

function CreatePlaceholder() {
  return <View style={{ flex: 1, backgroundColor: colors.white }} />;
}

function MainTabs() {
  const { t } = useLang();
  const insets = useSafeAreaInsets();
  const unreadChats = useChatStore((s) => s.chats.reduce((sum, chat) => sum + Number(chat.unread_count || 0), 0));

  return (
    <Tab.Navigator
      safeAreaInsets={{ top: 0, right: 0, bottom: insets.bottom, left: 0 }}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.black,
        tabBarInactiveTintColor: colors.neutral400,
        tabBarStyle: getTabBarStyle(insets),
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
            Home: "home-outline",
            Spacer: "ellipse-outline",
            Create: "add",
            Chats: "chatbubble-ellipses-outline",
            Profile: "person-outline",
          };
          if (route.name === "Create") {
            return <View style={styles.createButton}><Ionicons name="add" size={32} color={colors.white} /></View>;
          }
          return <Ionicons name={icons[route.name]} size={size ?? 22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t("tab_home"), tabBarLabel: t("tab_home") }} />
      <Tab.Screen name="Spacer" component={CreatePlaceholder} options={{ tabBarButton: () => <View />, tabBarLabel: () => null }} />
      <Tab.Screen
        name="Create"
        component={CreatePlaceholder}
        options={{ title: "Создать", tabBarLabel: "Создать" }}
        listeners={({ navigation }) => ({ tabPress: (event) => { event.preventDefault(); navigation.getParent()?.navigate("AiCreateRequest"); } })}
      />
      <Tab.Screen name="Chats" component={ChatsScreen} options={{ title: t("tab_chats"), tabBarLabel: t("tab_chats"), tabBarBadge: unreadChats > 0 ? (unreadChats > 99 ? "99+" : unreadChats) : undefined }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: t("tab_profile"), tabBarLabel: t("tab_profile") }} />
    </Tab.Navigator>
  );
}

function LoggedInStack() {
  return (
    <AppStackNav.Navigator screenOptions={{ headerShown: false }}>
      <AppStackNav.Screen name="MainTabs" component={MainTabs} />
      <AppStackNav.Screen name="AiCreateRequest" component={AiCreateRequestScreen} />
      <AppStackNav.Screen name="TaskDetail" component={TaskDetailScreen} />
      <AppStackNav.Screen name="ChatDetail" component={ChatDetailScreen} />
      <AppStackNav.Screen name="SpecialistProfile" component={SpecialistProfileScreen} />
      <AppStackNav.Screen name="PhoneChange" component={PhoneChangeScreen} />
      <AppStackNav.Screen name="MyReviews" component={MyReviewsScreen} />
    </AppStackNav.Navigator>
  );
}

export function RootNavigator() {
  const { user, loading } = useAuth();
  const [introVisible, setIntroVisible] = useState(true);
  const splashOpacity = useRef(new Animated.Value(0)).current;
  const splashScale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(splashOpacity, { toValue: 1, duration: 520, useNativeDriver: true }),
      Animated.spring(splashScale, { toValue: 1, tension: 42, friction: 8, useNativeDriver: true }),
    ]).start();
    const timer = setTimeout(() => setIntroVisible(false), 1200);
    return () => clearTimeout(timer);
  }, [splashOpacity, splashScale]);

  if (loading || introVisible) {
    return <SafeAreaView style={styles.splash} edges={["top", "bottom", "left", "right"]}><Animated.View style={{ opacity: splashOpacity, transform: [{ scale: splashScale }] }}><TreaboLogo size="splash" /></Animated.View></SafeAreaView>;
  }

  return (
    <NavigationContainer theme={navTheme} linking={{ prefixes: ["treabo://"], config: { screens: { ChatDetail: "chat/:chatId" } } }}>
      {user ? <LoggedInStack /> : (
        <AuthStackNav.Navigator screenOptions={{ headerShown: false }} initialRouteName="Welcome">
          <AuthStackNav.Screen name="Welcome" component={WelcomeAuthScreen} />
          <AuthStackNav.Screen name="PhoneEntry" component={PhoneAuthScreen} />
          <AuthStackNav.Screen name="Login" component={LoginStubScreen} />
        </AuthStackNav.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.white },
  createButton: {
    width: 60, height: 60, borderRadius: 30, marginTop: -25, backgroundColor: colors.black,
    alignItems: "center", justifyContent: "center", borderWidth: 5, borderColor: "#F8F8FB",
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
});
