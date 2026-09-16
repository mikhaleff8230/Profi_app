import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { TreaboLogo } from "../../components/TreaboLogo";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { NavigationContainer, DefaultTheme, useNavigation, type Theme } from "@react-navigation/native";
import { createNativeStackNavigator, type NativeStackNavigationProp } from "@react-navigation/native-stack";
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
import MapScreen from "../../screens/MapScreen";
import TasksListScreen from "../../screens/TasksListScreen";
import TaskSearchScreen from "../../screens/TaskSearchScreen";
import TaskFilterScreen from "../../screens/TaskFilterScreen";
import ProfileScreen from "../../screens/ProfileScreen";
import ChatsScreen from "../../screens/ChatsScreen";
import AiCreateRequestScreen from "../../screens/AiCreateRequestScreen";
import TaskDetailScreen from "../../screens/TaskDetailScreen";
import TaskApplyScreen from "../../screens/TaskApplyScreen";
import CreateTaskScreen from "../../screens/CreateTaskScreen";
import ChatDetailScreen from "../../screens/ChatDetailScreen";
import SpecialistProfileScreen from "../../screens/SpecialistProfileScreen";
import WalletScreen from "../../screens/WalletScreen";
import PhoneChangeScreen from "../../screens/PhoneChangeScreen";
import IdentityVerificationScreen from "../../screens/IdentityVerificationScreen";
import MyReviewsScreen from "../../screens/MyReviewsScreen";
import type {
  AuthStackParamList,
  MainTabParamList,
  MapStackParamList,
  RequestsStackParamList,
  RootStackParamList,
} from "./types";
import { getTabBarStyle } from "./tabBar";
import { CreateActionSheet } from "./CreateActionSheet";

// TREABO unified navigation shell.

const AuthStackNav = createNativeStackNavigator<AuthStackParamList>();
const AppStackNav = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const MapStackNav = createNativeStackNavigator<MapStackParamList>();
const RequestsStackNav = createNativeStackNavigator<RequestsStackParamList>();

const navTheme: Theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.white, card: colors.white, primary: colors.black, text: colors.black, border: colors.neutral100 },
};

function EmptyActionRoute() {
  return <View style={styles.emptyActionRoute} />;
}

function MapTab() {
  return (
    <MapStackNav.Navigator initialRouteName="Map" screenOptions={{ headerShown: false }}>
      <MapStackNav.Screen name="Map" component={MapScreen} />
      <MapStackNav.Screen name="TasksList" component={TasksListScreen} />
      <MapStackNav.Screen name="TaskSearch" component={TaskSearchScreen} />
      <MapStackNav.Screen name="TaskFilter" component={TaskFilterScreen} />
    </MapStackNav.Navigator>
  );
}

function RequestsTab() {
  const { user } = useAuth();
  const initialRouteName = user?.role === "specialist" ? "TasksList" : "MyRequests";

  return (
    <RequestsStackNav.Navigator
      key={user?.role ?? "guest"}
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >
      <RequestsStackNav.Screen name="MyRequests" component={HomeScreen} />
      <RequestsStackNav.Screen name="TasksList" component={TasksListScreen} />
      <RequestsStackNav.Screen name="Map" component={MapScreen} />
      <RequestsStackNav.Screen name="TaskSearch" component={TaskSearchScreen} />
      <RequestsStackNav.Screen name="TaskFilter" component={TaskFilterScreen} />
    </RequestsStackNav.Navigator>
  );
}

function MainTabs() {
  const { t } = useLang();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, "MainTabs">>();
  const insets = useSafeAreaInsets();
  const [createOpen, setCreateOpen] = useState(false);
  const unreadChats = useChatStore((state) =>
    state.chats.reduce((sum, chat) => sum + Number(chat.unread_count || 0), 0),
  );

  return (
    <>
      <Tab.Navigator
        safeAreaInsets={{ top: 0, right: 0, bottom: insets.bottom, left: 0 }}
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarActiveTintColor: colors.black,
          tabBarInactiveTintColor: colors.navInactive,
          tabBarStyle: getTabBarStyle(insets),
          tabBarItemStyle: styles.tabItem,
          tabBarLabelStyle: styles.tabLabel,
          tabBarIcon: ({ color, focused }) => {
            if (route.name === "CreateAction") return null;

            const iconNames: Record<Exclude<keyof MainTabParamList, "CreateAction">, keyof typeof Ionicons.glyphMap> = {
              Home: "home-outline",
              Map: "location-outline",
              Requests: "chatbox-outline",
              Profile: "person-outline",
            };
            const iconName = iconNames[route.name as Exclude<keyof MainTabParamList, "CreateAction">];

            return (
              <View style={styles.iconFrame}>
                {route.name === "Home" && focused ? <View style={styles.homeAccent} /> : null}
                <Ionicons name={iconName} size={27} color={color} />
                {route.name === "Requests" && unreadChats > 0 ? <View style={styles.activityDot} /> : null}
              </View>
            );
          },
        })}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: t("tab_home"), tabBarLabel: t("tab_home") }}
        />
        <Tab.Screen
          name="Map"
          component={MapTab}
          options={{ title: t("tab_map"), tabBarLabel: t("tab_map") }}
        />
        <Tab.Screen
          name="CreateAction"
          component={EmptyActionRoute}
          options={{
            title: t("tab_add"),
            tabBarLabel: () => null,
            tabBarButton: (props) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("tab_add")}
                accessibilityState={props.accessibilityState}
                onPress={props.onPress as () => void}
                style={({ pressed }) => [styles.createTab, pressed && styles.createTabPressed]}
              >
                <View style={styles.createCircle}>
                  <Ionicons name="add" size={42} color={colors.black} />
                </View>
                <Text style={styles.createLabel}>{t("tab_add")}</Text>
              </Pressable>
            ),
          }}
          listeners={{
            tabPress: (event) => {
              event.preventDefault();
              setCreateOpen(true);
            },
          }}
        />
        <Tab.Screen
          name="Requests"
          component={RequestsTab}
          options={{ title: t("tab_requests"), tabBarLabel: t("tab_requests") }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ title: t("tab_profile"), tabBarLabel: t("tab_profile") }}
        />
      </Tab.Navigator>

      <CreateActionSheet
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onFindMaster={() => {
          setCreateOpen(false);
          requestAnimationFrame(() => navigation.navigate("AIRequest"));
        }}
      />
    </>
  );
}

function LoggedInStack() {
  return (
    <AppStackNav.Navigator screenOptions={{ headerShown: false }}>
      <AppStackNav.Screen name="MainTabs" component={MainTabs} />

      <AppStackNav.Screen name="AIRequest" component={AiCreateRequestScreen} />
      <AppStackNav.Screen name="Search" component={TaskSearchScreen} />
      <AppStackNav.Screen name="Applications" component={TaskDetailScreen} />
      <AppStackNav.Screen name="ChatList" component={ChatsScreen} />
      <AppStackNav.Screen name="Chat" component={ChatDetailScreen} />
      <AppStackNav.Screen name="PublicProfile" component={SpecialistProfileScreen} />
      <AppStackNav.Screen name="Balance" component={WalletScreen} />
      <AppStackNav.Screen name="Settings" component={ProfileScreen} />

      <AppStackNav.Screen name="AiCreateRequest" component={AiCreateRequestScreen} />
      <AppStackNav.Screen name="PaymentReturn" component={WalletScreen} />
      <AppStackNav.Screen name="Map" component={MapScreen} />
      <AppStackNav.Screen name="TasksList" component={TasksListScreen} />
      <AppStackNav.Screen name="TaskSearch" component={TaskSearchScreen} />
      <AppStackNav.Screen name="TaskFilter" component={TaskFilterScreen} />
      <AppStackNav.Screen name="TaskDetail" component={TaskDetailScreen} />
      <AppStackNav.Screen name="TaskApply" component={TaskApplyScreen} />
      <AppStackNav.Screen name="CreateTask" component={CreateTaskScreen} />
      <AppStackNav.Screen name="ChatDetail" component={ChatDetailScreen} />
      <AppStackNav.Screen name="SpecialistProfile" component={SpecialistProfileScreen} />
      <AppStackNav.Screen name="Wallet" component={WalletScreen} />
      <AppStackNav.Screen name="PhoneChange" component={PhoneChangeScreen} />
      <AppStackNav.Screen name="IdentityVerification" component={IdentityVerificationScreen} />
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
    <NavigationContainer
      theme={navTheme}
      linking={{
        prefixes: ["treabo-client://", "treabo://"],
        config: {
          screens: {
            MainTabs: "home",
            Map: "map",
            Chat: "chat/:chatId",
            TaskDetail: "task/:taskId",
            Applications: "task/:taskId/applications",
            PublicProfile: "specialist/:specialistId",
          },
        },
      }}
    >
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
  emptyActionRoute: { flex: 1, backgroundColor: colors.white },
  tabItem: { paddingTop: 2 },
  tabLabel: { fontSize: 11, lineHeight: 15, fontWeight: "600", marginTop: 0 },
  iconFrame: { width: 34, height: 31, alignItems: "center", justifyContent: "center" },
  homeAccent: {
    position: "absolute",
    width: 24,
    height: 22,
    borderRadius: 7,
    backgroundColor: colors.accent,
  },
  activityDot: {
    position: "absolute",
    top: 0,
    right: 1,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  createTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    minWidth: 74,
  },
  createTabPressed: { opacity: 0.78 },
  createCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    marginTop: -25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    borderWidth: 4,
    borderColor: colors.white,
    shadowColor: colors.black,
    shadowOpacity: 0.14,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  createLabel: {
    color: colors.navInactive,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600",
    marginTop: -1,
  },
});
