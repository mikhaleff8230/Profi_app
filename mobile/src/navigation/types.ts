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
  TaskDetail: { taskId: string };
  CreateTask: undefined;
  ChatDetail: { chatId: string };
  SpecialistProfile: { specialistId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Orders: undefined;
  Chats: undefined;
  Profile: undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
  PhoneEntry: { role: "customer" | "specialist" };
  Login: undefined;
};
