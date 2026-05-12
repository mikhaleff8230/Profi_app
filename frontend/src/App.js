import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/auth";
import { LangProvider } from "@/i18n";
import { AppShell, BottomTabs } from "@/components/Layout";
import Onboarding from "@/pages/Onboarding";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Home from "@/pages/Home";
import TasksList from "@/pages/TasksList";
import CreateTask from "@/pages/CreateTask";
import TaskDetail from "@/pages/TaskDetail";
import Orders from "@/pages/Orders";
import Chats from "@/pages/Chats";
import ChatDetail from "@/pages/ChatDetail";
import Profile from "@/pages/Profile";
import SpecialistProfile from "@/pages/SpecialistProfile";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="text-center py-10 text-neutral-400">Загрузка...</p>;
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="text-center py-10 text-neutral-400">Загрузка...</p>;
  if (user) return <Navigate to={user.role === "customer" ? "/home" : "/orders"} replace />;
  return children;
}

function AppRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<PublicOnly><Onboarding /></PublicOnly>} />
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><TasksList /></ProtectedRoute>} />
        <Route path="/tasks/:id" element={<ProtectedRoute><TaskDetail /></ProtectedRoute>} />
        <Route path="/create-task" element={<ProtectedRoute><CreateTask /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
        <Route path="/chats" element={<ProtectedRoute><Chats /></ProtectedRoute>} />
        <Route path="/chat/:id" element={<ProtectedRoute><ChatDetail /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/specialists/:id" element={<ProtectedRoute><SpecialistProfile /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomTabs />
    </AppShell>
  );
}

function App() {
  return (
    <LangProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-center" richColors />
        </BrowserRouter>
      </AuthProvider>
    </LangProvider>
  );
}

export default App;
