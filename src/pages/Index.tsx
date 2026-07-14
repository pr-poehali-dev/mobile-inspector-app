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
import { AppProvider, AppUser, ADMIN_PHONE } from "@/context/AppContext";

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
  email: string;
  phone?: string; // используется только для служебного входа админа
  name: string;
  role: "user" | "admin" | "content_maker" | "editor" | "documentor" | "guest";
  avatar?: string;
  contentMakerRequestPending?: boolean;
  editorRequestPending?: boolean;
}

// Стабильный числовой id по email — идентичность пользователя сохраняется между входами
function idFromEmail(email: string): number {
  const norm = (email || "").trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < norm.length; i++) hash = (hash * 31 + norm.charCodeAt(i)) % 1000000007;
  // Сдвигаем диапазон, чтобы не пересекаться с демо-пользователями (id 1..50)
  return 1000 + (hash % 9_000_000);
}

function makeAppUser(u: User): AppUser {
  const isAdmin = u.phone === ADMIN_PHONE || u.role === "admin";
  return {
    id: isAdmin ? 1 : idFromEmail(u.email),
    phone: u.phone || "",
    name: u.name,
    email: u.email,
    location: "Москва",
    avatar: u.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
    roles: isAdmin ? ["admin"] : [u.role],
    blocked: false,
    bannedFromForum: false,
    subscribers: [],
    subscriptions: [],
    bio: "",
    createdAt: new Date().toLocaleDateString("ru-RU"),
  };
}

function AppShell({ user, onLogout }: { user: User; onLogout: () => void }) {
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
      {screen === "profile" && <ProfileScreen onBack={() => navigate("dashboard")} onLogout={onLogout} onNavigate={navigate} />}
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

  // При обновлении страницы сессия восстанавливается из localStorage
  useEffect(() => {
    const saved = loadSession();
    if (saved && !user) setUser(saved);
  }, []);

  const handleLogin = (u: User) => { saveSession(u); setUser(u); };
  const handleLogout = () => { clearSession(); setUser(null); };

  if (!user) return <AuthScreen onLogin={handleLogin} />;

  return (
    <AppProvider initialUser={makeAppUser(user)}>
      <AppShell user={user} onLogout={handleLogout} />
    </AppProvider>
  );
}