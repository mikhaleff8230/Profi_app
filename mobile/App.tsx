import "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LangProvider } from "./src/context/LangContext";
import { AuthProvider } from "./src/context/AuthContext";
import { DatabaseProvider } from "./src/providers/DatabaseProvider";
import { KeyboardRoot } from "./src/components/KeyboardRoot";
import { AppErrorBoundary } from "./src/components/AppErrorBoundary";
import { RootNavigator } from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <AppErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <KeyboardRoot>
            <DatabaseProvider>
              <LangProvider>
                <AuthProvider>
                  <RootNavigator />
                  <StatusBar style="dark" />
                </AuthProvider>
              </LangProvider>
            </DatabaseProvider>
          </KeyboardRoot>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AppErrorBoundary>
  );
}
