export type RootStackParamList = {
  MainTabs: undefined;
  AiCreateRequest: undefined;
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
  TaskFilter:
    | {
        category?: string;
        category_id?: string;
        q?: string;
        city?: string;
        budget_min?: string;
        budget_max?: string;
      }
    | undefined;
  TaskDetail: { taskId: string };
  TaskApply: { taskId: string; title?: string };
  CreateTask: undefined;
  ChatDetail: { chatId: string };
  SpecialistProfile: { specialistId: string; chatId?: string };
  PhoneChange: undefined;
  IdentityVerification: undefined;
  MyReviews: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Create: undefined;
  Chats: undefined;
  Profile: undefined;
};

export type TasksStackParamList = {
  TasksHome: undefined;
  Map: RootStackParamList["Map"];
  TasksList: RootStackParamList["TasksList"];
  TaskSearch: undefined;
  TaskFilter: RootStackParamList["TaskFilter"];
};

export type AuthStackParamList = {
  Welcome: undefined;
  PhoneEntry: { role?: "customer" | "specialist" };
  Login: undefined;
};
