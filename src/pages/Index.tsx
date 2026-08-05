import { useState, useEffect } from "react";
import AuthScreen from "@/components/AuthScreen";
import Dashboard from "@/components/Dashboard";
import VideoModule from "@/components/modules/VideoModule";
import NewsModule from "@/components/modules/NewsModule";
import DocumentsModule from "@/components/modules/DocumentsModule";
import RFPModule from "@/components/modules/RFPModule";
import ChecklistModule from "@/components/modules/ChecklistModule";
import ForumModule from "@/components/modules/ForumModule";
import LearningModule from "@/components/modules/LearningModule";
import SupportModule from "@/components/modules/SupportModule";
import AIModule from "@/components/modules/AIModule";
import SalesModule from "@/components/modules/SalesModule";
import ServicesModule from "@/components/modules/ServicesModule";
import ProfileScreen from "@/components/ProfileScreen";
import AdminPanel from "@/components/AdminPanel";
import UsersScreen from "@/components/UsersScreen";
import { AppProvider, AppUser } from "@/context/AppContext";
import func2url from "../../backend/func2url.json";

const AUTH_API = (func2url as Record<string, string>)["auth"];

export type AppScreen =
  | "auth"
  | "dashboard"
  | "video"
  | "news"
  | "documents"
  | "rfp"
  | "checklists"
  | "forum"
  | "learning"
  | "support"
  | "ai"
  | "sales"
  | "services"
  | "profile"
  | "admin"
  | "users";

export interface User {
  id: number; // реальный id из БД (mi_users.id) — приходит только с сервера
  token: string; // серверный токен сессии
  email: string;
  phone?: string;
  name: string;
  roles: string[]; // полный список ролей с сервера, включая admin если применимо
  login?: string;
  location?: string;
  bio?: string;
  refCode?: string;
}

// id и roles всегда приходят с сервера (после проверки в БД) — клиент им только доверяет для отображения
function makeAppUser(u: User): AppUser {
  return {
    id: u.id,
    phone: u.phone || "",
    name: u.name,
    email: u.email,
    location: u.location || "Москва",
    avatar: u.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
    roles: (u.roles && u.roles.length ? u.roles : ["user"]) as AppUser["roles"],
    blocked: false,
    bannedFromForum: false,
    subscribers: [],
    subscriptions: [],
    bio: u.bio || "",
    createdAt: new Date().toLocaleDateString("ru-RU"),
  };
}

function AppShell({ user, onLogout, onLogoutAll }: { user: User; onLogout: () => void; onLogoutAll: () => void }) {
  const [screen, setScreen] = useState<AppScreen>("dashboard");
  const navigate = (s: AppScreen) => setScreen(s);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="bg-orb w-96 h-96 opacity-20" style={{ background: 'radial-gradient(circle, #1b6fff, transparent)', top: '-100px', left: '-100px' }} />
      <div className="bg-orb w-80 h-80 opacity-15" style={{ background: 'radial-gradient(circle, #7c3aed, transparent)', bottom: '10%', right: '-80px' }} />
      <div className="bg-orb w-64 h-64 opacity-10" style={{ background: 'radial-gradient(circle, #0ea5e9, transparent)', top: '50%', left: '40%' }} />

      {screen === "dashboard" && <Dashboard user={user} onNavigate={navigate} />}
      {screen === "video" && <VideoModule onBack={() => navigate("dashboard")} />}
      {screen === "news" && <NewsModule onBack={() => navigate("dashboard")} />}
      {screen === "documents" && <DocumentsModule onBack={() => navigate("dashboard")} />}
      {screen === "rfp" && <RFPModule onBack={() => navigate("dashboard")} />}
      {screen === "checklists" && <ChecklistModule onBack={() => navigate("dashboard")} />}
      {screen === "forum" && <ForumModule onBack={() => navigate("dashboard")} />}
      {screen === "learning" && <LearningModule onBack={() => navigate("dashboard")} />}
      {screen === "support" && <SupportModule onBack={() => navigate("dashboard")} />}
      {screen === "ai" && <AIModule onBack={() => navigate("dashboard")} />}
      {screen === "sales" && <SalesModule onBack={() => navigate("dashboard")} />}
      {screen === "services" && <ServicesModule onBack={() => navigate("dashboard")} />}
      {screen === "profile" && <ProfileScreen onBack={() => navigate("dashboard")} onLogout={onLogout} onLogoutAll={onLogoutAll} onNavigate={navigate} sessionToken={user.token} />}
      {screen === "admin" && <AdminPanel onBack={() => navigate("dashboard")} />}
      {screen === "users" && <UsersScreen onBack={() => navigate("dashboard")} onNavigate={navigate} />}
    </div>
  );
}

const SESSION_KEY = "mi_session_v1";

function loadSession(): User | null {
  try { const raw = localStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function saveSession(u: User) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(u)); } catch { /* ignore */ }
}
function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

export default function Index() {
  const [user, setUser] = useState<User | null>(() => loadSession());
  const [checkingSession, setCheckingSession] = useState(true);

  // При загрузке приложения проверяем токен на сервере — если сессия отозвана
  // (logout на другом устройстве, блокировка), выкидываем на экран входа.
  useEffect(() => {
    const saved = loadSession();
    if (!saved || !saved.token) { setCheckingSession(false); return; }
    fetch(`${AUTH_API}?action=session&token=${encodeURIComponent(saved.token)}`)
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          const refreshed: User = { ...saved, id: data.user.id, name: data.user.name, roles: data.user.roles, email: data.user.email, phone: data.user.phone, location: data.user.location, bio: data.user.bio, refCode: data.user.refCode };
          saveSession(refreshed);
          setUser(refreshed);
        } else {
          clearSession();
          setUser(null);
        }
      })
      .catch(() => { /* при отсутствии сети остаёмся с локально сохранённой сессией */ })
      .finally(() => setCheckingSession(false));
  }, []);

  const handleLogin = (u: User) => { saveSession(u); setUser(u); };
  const handleLogout = () => {
    if (user?.token) {
      fetch(AUTH_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout", token: user.token }) }).catch(() => { /* ignore */ });
    }
    clearSession();
    setUser(null);
  };
  const handleLogoutAll = () => {
    if (user?.token) {
      fetch(AUTH_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logoutAll", token: user.token }) }).catch(() => { /* ignore */ });
    }
    clearSession();
    setUser(null);
  };

  if (checkingSession) return null;
  if (!user) return <AuthScreen onLogin={handleLogin} />;

  return (
    <AppProvider initialUser={makeAppUser(user)}>
      <AppShell user={user} onLogout={handleLogout} onLogoutAll={handleLogoutAll} />
    </AppProvider>
  );
}
