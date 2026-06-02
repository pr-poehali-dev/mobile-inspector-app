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
import ProfileScreen from "@/components/ProfileScreen";

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
  | "profile";

export interface User {
  phone: string;
  name: string;
  role: "user" | "admin" | "videoblogger" | "guest";
}

export default function Index() {
  const [screen, setScreen] = useState<AppScreen>("auth");
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (u: User) => {
    setUser(u);
    setScreen("dashboard");
  };

  const handleLogout = () => {
    setUser(null);
    setScreen("auth");
  };

  const navigate = (s: AppScreen) => setScreen(s);

  if (screen === "auth") return <AuthScreen onLogin={handleLogin} />;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="bg-orb w-96 h-96 opacity-20" style={{ background: 'radial-gradient(circle, #1b6fff, transparent)', top: '-100px', left: '-100px' }} />
      <div className="bg-orb w-80 h-80 opacity-15" style={{ background: 'radial-gradient(circle, #7c3aed, transparent)', bottom: '10%', right: '-80px' }} />
      <div className="bg-orb w-64 h-64 opacity-10" style={{ background: 'radial-gradient(circle, #0ea5e9, transparent)', top: '50%', left: '40%' }} />

      {screen === "dashboard" && <Dashboard user={user!} onNavigate={navigate} />}
      {screen === "video" && <VideoModule onBack={() => navigate("dashboard")} user={user!} />}
      {screen === "news" && <NewsModule onBack={() => navigate("dashboard")} />}
      {screen === "documents" && <DocumentsModule onBack={() => navigate("dashboard")} />}
      {screen === "rfp" && <RFPModule onBack={() => navigate("dashboard")} />}
      {screen === "checklists" && <ChecklistModule onBack={() => navigate("dashboard")} />}
      {screen === "forum" && <ForumModule onBack={() => navigate("dashboard")} />}
      {screen === "learning" && <LearningModule onBack={() => navigate("dashboard")} />}
      {screen === "support" && <SupportModule onBack={() => navigate("dashboard")} />}
      {screen === "ai" && <AIModule onBack={() => navigate("dashboard")} />}
      {screen === "profile" && <ProfileScreen user={user!} onBack={() => navigate("dashboard")} onLogout={handleLogout} />}
    </div>
  );
}
