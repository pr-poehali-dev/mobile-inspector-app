import { useState } from "react";
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
  phone: string;
  name: string;
  role: "user" | "admin" | "content_maker" | "editor" | "documentor" | "guest";
  avatar?: string;
  contentMakerRequestPending?: boolean;
  editorRequestPending?: boolean;
}

function makeAppUser(u: User): AppUser {
  const isAdmin = u.phone === ADMIN_PHONE || u.role === "admin";
  return {
    id: 1,
    phone: u.phone,
    name: u.name,
    email: "ivan@mail.ru",
    location: "Москва",
    avatar: u.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
    roles: isAdmin ? ["admin"] : [u.role],
    blocked: false,
    bannedFromForum: false,
    subscribers: [2, 3],
    subscriptions: [4],
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

export default function Index() {
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (u: User) => setUser(u);
  const handleLogout = () => setUser(null);

  if (!user) return <AuthScreen onLogin={handleLogin} />;

  return (
    <AppProvider initialUser={makeAppUser(user)}>
      <AppShell user={user} onLogout={handleLogout} />
    </AppProvider>
  );
}