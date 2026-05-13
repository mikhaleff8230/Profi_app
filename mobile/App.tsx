import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { API_BASE, apiFetch, getToken, setToken } from "./src/api";

type Step = "loading" | "email" | "otp" | "home";
type Role = "customer" | "specialist";

export default function App() {
  const [step, setStep] = useState<Step>("loading");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("customer");
  const [otp, setOtp] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [user, setUser] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const bootstrap = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        setStep("email");
        return;
      }
      const me = await apiFetch("/auth/me", { method: "GET" });
      setUser(me);
      setStep("home");
    } catch {
      await setToken(null);
      setStep("email");
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const onRegister = async () => {
    const em = email.trim().toLowerCase();
    if (!em) {
      Alert.alert("Ошибка", "Введите email");
      return;
    }
    setBusy(true);
    try {
      const body: Record<string, string> = { email: em, role };
      const nm = name.trim();
      if (nm) body.name = nm;
      await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify(body),
        auth: false,
      });
      setPendingEmail(em);
      setOtp("");
      setStep("otp");
      Alert.alert("Код отправлен", "Проверьте почту (или лог сервера, если SMTP не настроен).");
    } catch (e: any) {
      Alert.alert("Ошибка", e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const onLoginEmail = async () => {
    const em = email.trim().toLowerCase();
    if (!em) {
      Alert.alert("Ошибка", "Введите email");
      return;
    }
    setBusy(true);
    try {
      const d = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: em }),
        auth: false,
      });
      if (d.token) {
        await setToken(d.token);
        setUser(d.user);
        setStep("home");
      } else if (d.status === "otp_sent") {
        setPendingEmail(em);
        setOtp("");
        setStep("otp");
        Alert.alert("Код отправлен", "Подтвердите email кодом из письма.");
      } else {
        Alert.alert("Ошибка", "Неожиданный ответ сервера");
      }
    } catch (e: any) {
      Alert.alert("Ошибка", e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const onVerify = async () => {
    const code = otp.trim();
    if (code.length < 4) {
      Alert.alert("Ошибка", "Введите код из письма");
      return;
    }
    setBusy(true);
    try {
      const d = await apiFetch("/auth/verify", {
        method: "POST",
        body: JSON.stringify({ email: pendingEmail, otp_code: code }),
        auth: false,
      });
      await setToken(d.token);
      setUser(d.user);
      setStep("home");
    } catch (e: any) {
      Alert.alert("Ошибка", e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const onLogout = async () => {
    await setToken(null);
    setUser(null);
    setOtp("");
    setStep("email");
  };

  if (step === "loading") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.muted}>Загрузка…</Text>
        <StatusBar style="dark" />
      </View>
    );
  }

  if (step === "home" && user) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <Text style={styles.title}>Вы вошли</Text>
        <Text style={styles.line}>Email: {user.email || "—"}</Text>
        <Text style={styles.line}>Имя: {user.name}</Text>
        <Text style={styles.line}>Роль: {user.role}</Text>
        <Text style={styles.line}>Подтверждён: {user.is_verified ? "да" : "нет"}</Text>
        <TouchableOpacity style={styles.btnDark} onPress={onLogout}>
          <Text style={styles.btnDarkText}>Выйти</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>API: {API_BASE}</Text>
      </View>
    );
  }

  if (step === "otp") {
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <StatusBar style="dark" />
          <Text style={styles.title}>Код из письма</Text>
          <Text style={styles.muted}>{pendingEmail}</Text>
          <TextInput
            style={styles.input}
            placeholder="6 цифр"
            keyboardType="number-pad"
            maxLength={8}
            value={otp}
            onChangeText={setOtp}
          />
          <TouchableOpacity style={styles.btnDark} onPress={onVerify} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnDarkText}>Подтвердить</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setStep("email")}>
            <Text style={styles.link}>Назад</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <StatusBar style="dark" />
        <Text style={styles.title}>Proffi</Text>
        <Text style={styles.muted}>Вход по email (OTP при первом входе)</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput style={styles.input} placeholder="Имя (необязательно)" value={name} onChangeText={setName} />
        <Text style={styles.label}>Роль</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.chip, role === "customer" && styles.chipOn]}
            onPress={() => setRole("customer")}
          >
            <Text style={role === "customer" ? styles.chipOnText : styles.chipOffText}>Заказчик</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, role === "specialist" && styles.chipOn]}
            onPress={() => setRole("specialist")}
          >
            <Text style={role === "specialist" ? styles.chipOnText : styles.chipOffText}>Специалист</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.btnDark} onPress={onRegister} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnDarkText}>Зарегистрироваться</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnLight} onPress={onLoginEmail} disabled={busy}>
          <Text style={styles.btnLightText}>Войти по email</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>Укажите EXPO_PUBLIC_API_URL в .env (HTTPS прод или LAN IP:порт для dev).</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f5f3ff" },
  scroll: { padding: 24, paddingTop: 56 },
  container: { flex: 1, backgroundColor: "#f5f3ff", padding: 24, paddingTop: 56 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f3ff" },
  title: { fontSize: 26, fontWeight: "800", marginBottom: 8, color: "#111" },
  muted: { color: "#666", marginBottom: 20 },
  label: { fontWeight: "600", marginBottom: 8, color: "#333" },
  line: { fontSize: 16, marginBottom: 8, color: "#222" },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    fontSize: 16,
  },
  row: { flexDirection: "row", gap: 10, marginBottom: 16 },
  chip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#fff",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  chipOn: { backgroundColor: "#111", borderColor: "#111" },
  chipOnText: { color: "#fff", fontWeight: "700" },
  chipOffText: { color: "#555", fontWeight: "600" },
  btnDark: {
    backgroundColor: "#111",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  btnDarkText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  btnLight: {
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  btnLightText: { color: "#111", fontWeight: "700", fontSize: 16 },
  link: { color: "#333", textAlign: "center", marginTop: 16, textDecorationLine: "underline" },
  hint: { marginTop: 24, fontSize: 12, color: "#888", lineHeight: 18 },
});
