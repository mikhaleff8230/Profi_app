import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { NavigationContainer, DefaultTheme, type Theme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import { colors } from "../theme";
import AuthScreen from "../../screens/AuthScreen";
import LoginStubScreen from "../../screens/LoginStubScreen";
import RegisterStubScreen from "../../screens/RegisterStubScreen";
import HomeScreen from "../../screens/HomeScreen";
import OrdersScreen from "../../screens/OrdersScreen";
import ChatsScreen from "../../screens/ChatsScreen";
import ProfileScreen from "../../screens/ProfileScreen";
import MapScreen from "../../screens/MapScreen";
import TasksListScreen from "../../screens/TasksListScreen";
import TaskDetailScreen from "../../screens/TaskDetailScreen";
import CreateTaskScreen from "../../screens/CreateTaskScreen";
import ChatDetailScreen from "../../screens/ChatDetailScreen";
import SpecialistProfileScreen from "../../screens/SpecialistProfileScreen";
import type { AuthStackParamList, MainTabParamList, RootStackParamList } from "./types";

const AuthStackNav = createNativeStackNavigator<AuthStackParamList>();
const AppStackNav = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const navTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.white,
    card: colors.white,
    primary: colors.black,
    text: colors.black,
    border: colors.neutral100,
  },
};

function MainTabs() {
  const { t } = useLang();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.black,
        tabBarInactiveTintColor: colors.neutral400,
        tabBarStyle: {
          borderTopColor: colors.neutral100,
          backgroundColor: colors.white,
          paddingTop: 4,
          height: 58,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
        tabBarIcon: ({ color, size }) => {
          const map: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
            Home: "home-outline",
            Orders: "clipboard-outline",
            Chats: "chatbubble-ellipses-outline",
            Profile: "person-outline",
          };
          const name = map[route.name as keyof MainTabParamList];
          return <Ionicons name={name} size={size ?? 22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t("tab_home"), tabBarLabel: t("tab_home") }} />
      <Tab.Screen name="Orders" component={OrdersScreen} options={{ title: t("tab_orders"), tabBarLabel: t("tab_orders") }} />
      <Tab.Screen name="Chats" component={ChatsScreen} options={{ title: t("tab_chats"), tabBarLabel: t("tab_chats") }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: t("tab_profile"), tabBarLabel: t("tab_profile") }} />
    </Tab.Navigator>
  );
}

function LoggedInStack() {
  return (
    <AppStackNav.Navigator screenOptions={{ headerShown: false }}>
      <AppStackNav.Screen name="MainTabs" component={MainTabs} />
      <AppStackNav.Screen name="Map" component={MapScreen} />
      <AppStackNav.Screen name="TasksList" component={TasksListScreen} />
      <AppStackNav.Screen name="TaskDetail" component={TaskDetailScreen} />
      <AppStackNav.Screen name="CreateTask" component={CreateTaskScreen} />
      <AppStackNav.Screen name="ChatDetail" component={ChatDetailScreen} />
      <AppStackNav.Screen name="SpecialistProfile" component={SpecialistProfileScreen} />
    </AppStackNav.Navigator>
  );
}

export function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.black} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      {user ? (
        <LoggedInStack />
      ) : (
        <AuthStackNav.Navigator screenOptions={{ headerShown: false }} initialRouteName="AuthMain">
          <AuthStackNav.Screen name="AuthMain" component={AuthScreen} />
          <AuthStackNav.Screen name="Login" component={LoginStubScreen} />
          <AuthStackNav.Screen name="Register" component={RegisterStubScreen} />
        </AuthStackNav.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.shell },
});
