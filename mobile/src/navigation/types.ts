export type RootStackParamList = {
  MainTabs: undefined;
  Map:
    | {
        category?: string;
        category_id?: string;
        q?: string;
        city?: string;
        budget_min?: string;
        budget_max?: string;
      }
    | undefined;
  TasksList:
    | {
        category?: string;
        category_id?: string;
        q?: string;
        city?: string;
        budget_min?: string;
        budget_max?: string;
      }
    | undefined;
  TaskSearch: undefined;
  TaskFilter: undefined;
  TaskDetail: { taskId: string };
  TaskApply: { taskId: string; title?: string };
  CreateTask: undefined;
  ChatDetail: { chatId: string };
  SpecialistProfile: { specialistId: string };
  PhoneChange: undefined;
  IdentityVerification: undefined;
  MyReviews: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Wallet: undefined;
  Chats: undefined;
  Profile: undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
  PhoneEntry: { role?: "customer" | "specialist" };
  Login: undefined;
};
