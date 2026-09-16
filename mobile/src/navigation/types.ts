import type { NavigatorScreenParams } from "@react-navigation/native";

export type TaskRouteParams =
  | {
      category?: string;
      category_id?: string;
      q?: string;
      city?: string;
      budget_min?: string;
      budget_max?: string;
    }
  | undefined;

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;

  // Canonical TREABO routes.
  AIRequest: undefined;
  CreatePlace: undefined;
  PlaceDetail: { placeId: string };
  Search: undefined;
  Applications: { taskId: string };
  ChatList: undefined;
  Chat: { chatId: string };
  PublicProfile: { specialistId: string; chatId?: string };
  Favorites: undefined;
  Balance: undefined;
  Settings: undefined;

  // Compatibility routes used by existing screens and external links.
  AiCreateRequest: undefined;
  PaymentReturn: { result?: string } | undefined;
  Map: TaskRouteParams;
  TasksList: TaskRouteParams;
  TaskSearch: undefined;
  TaskFilter: TaskRouteParams;
  TaskDetail: { taskId: string };
  TaskApply: { taskId: string; title?: string };
  CreateTask: undefined;
  ChatDetail: { chatId: string };
  CustomerProfile: {
    chatId?: string;
    customerId?: string;
    customerName?: string;
    customerAvatar?: unknown;
    taskTitle?: string;
  };
  SpecialistProfile: { specialistId: string; chatId?: string };
  Wallet: undefined;
  PhoneChange: undefined;
  IdentityVerification: undefined;
  MyReviews: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Map: undefined;
  CreateAction: undefined;
  Requests: undefined;
  Profile: undefined;
};

export type MapStackParamList = {
  Map: TaskRouteParams;
  TasksList: TaskRouteParams;
  TaskSearch: undefined;
  TaskFilter: TaskRouteParams;
};

export type RequestsStackParamList = {
  MyRequests: undefined;
  TasksList: TaskRouteParams;
  Map: TaskRouteParams;
  TaskSearch: undefined;
  TaskFilter: TaskRouteParams;
};

export type TasksStackParamList = {
  TasksHome: undefined;
  Map: TaskRouteParams;
  TasksList: TaskRouteParams;
  TaskSearch: undefined;
  TaskFilter: TaskRouteParams;
};

export type AuthStackParamList = {
  Welcome: undefined;
  PhoneEntry: { role?: "customer" | "specialist" };
  Login: undefined;
};
