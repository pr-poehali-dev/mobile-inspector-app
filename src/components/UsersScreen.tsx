import { useState } from "react";
import Icon from "@/components/ui/icon";
import ModuleHeader from "@/components/ModuleHeader";
import { useApp, AppUser } from "@/context/AppContext";

interface Props { onBack: () => void; }

const ROLE_BADGE: Record<string, { label: string; color: string; icon: string }> = {
  admin: { label: "Админ", color: "#ef4444", icon: "ShieldCheck" },
  content_maker: { label: "Контентмейкер", color: "#ec4899", icon: "Video" },
  editor: { label: "Редактор", color: "#f59e0b", icon: "Newspaper" },
  documentor: { label: "Документовед", color: "#10b981", icon: "FolderOpen" },
  user: { label: "Пользователь", color: "#3b82f6", icon: "User" },
};

interface ChatMsg { from: "me" | "them"; text: string; time: string; }

export default function UsersScreen({ onBack }: Props) {
  const { users, currentUser, toggleSubscription } = useApp();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "subs" | "followers">("all");
  const [chatUser, setChatUser] = useState<AppUser | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chats, setChats] = useState<Record<number, ChatMsg[]>>({
    2: [{ from: "them", text: "Здравствуйте! Видели моё новое видео по охране труда?", time: "10:24" }],
  });

  const others = users.filter(u => u.id !== currentUser.id);
  let list = others;
  if (filter === "subs") list = others.filter(u => currentUser.subscriptions.includes(u.id));
  if (filter === "followers") list = others.filter(u => currentUser.subscribers.includes(u.id));
  if (search.trim()) {
    const q = search.toLowerCase();
    list = list.filter(u => u.name.toLowerCase().includes(q) || u.location.toLowerCase().includes(q) || (u.bio || "").toLowerCase().includes(q));
  }

  const sendMsg = () => {
    if (!chatInput.trim() || !chatUser) return;
    const msg: ChatMsg = { from: "me", text: chatInput, time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) };
    setChats(prev => ({ ...prev, [chatUser.id]: [...(prev[chatUser.id] || []), msg] }));
    setChatInput("");
    setTimeout(() => {
      setChats(prev => ({ ...prev, [chatUser.id]: [...(prev[chatUser.id] || []), { from: "them", text: "Спасибо за сообщение! Отвечу чуть позже.", time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) }] }));
    }, 1200);
  };

  // ── CHAT ──
  if (chatUser) {
    const msgs = chats[chatUser.id] || [];
    return (
      <div className="min-h-screen relative z-10 animate-fade-in flex flex-col">
        <div className="glass border-b border-white/10 px-4 py-3 sticky top-0 z-20">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <button onClick={() => setChatUser(null)} className="p-2 rounded-xl hover:bg-white/10 transition-colors"><Icon name="ArrowLeft" size={20} color="white" /></button>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #1b6fff, #7c3aed)' }}>{chatUser.avatar}</div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{chatUser.name}</p>
              <p className="text-xs text-white/40 flex items-center gap-1"><span className="dot-online" />в сети</p>
            </div>
          </div>
        </div>
        <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 space-y-3 overflow-y-auto">
          {msgs.length === 0 && <p className="text-center text-white/30 text-sm py-8">Нет сообщений. Напишите первым!</p>}
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[75%] px-4 py-2.5 rounded-2xl" style={{ background: m.from === "me" ? 'linear-gradient(135deg, #1b6fff, #0040cc)' : 'rgba(255,255,255,0.06)', border: m.from === "me" ? 'none' : '1px solid rgba(255,255,255,0.1)' }}>
                <p className="text-sm text-white">{m.text}</p>
                <p className="text-xs text-white/40 mt-1 text-right">{m.time}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="max-w-2xl mx-auto w-full px-4 py-3 flex gap-2">
          <input className="input-field flex-1 text-sm py-3" placeholder="Сообщение..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMsg()} />
          <button onClick={sendMsg} disabled={!chatInput.trim()} className="p-3 rounded-xl flex-shrink-0 disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #1b6fff, #0040cc)' }}>
            <Icon name="Send" size={18} color="white" />
          </button>
        </div>
      </div>
    );
  }

  // ── LIST ──
  return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      <div className="glass border-b border-white/10 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/10 transition-colors"><Icon name="ArrowLeft" size={20} color="white" /></button>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(27,111,255,0.2)', border: '1px solid rgba(27,111,255,0.3)' }}><Icon name="Users" size={16} color="#4d8fff" /></div>
            <h1 className="text-base font-bold text-white flex-1">Пользователи</h1>
          </div>
          <div className="relative">
            <Icon name="Search" size={15} color="rgba(255,255,255,0.3)" className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input className="input-field pl-9 pr-9 py-2.5 text-sm" placeholder="Поиск по имени, городу..." value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><Icon name="X" size={15} color="rgba(255,255,255,0.4)" /></button>}
          </div>
          <div className="flex gap-2">
            {([
              { k: "all", label: "Все" },
              { k: "subs", label: `Подписки (${currentUser.subscriptions.length})` },
              { k: "followers", label: `Подписчики (${currentUser.subscribers.length})` },
            ] as const).map(f => (
              <button key={f.k} onClick={() => setFilter(f.k)} className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
                style={{ background: filter === f.k ? 'linear-gradient(135deg, #1b6fff, #0040cc)' : 'rgba(255,255,255,0.06)', border: `1px solid ${filter === f.k ? 'rgba(27,111,255,0.5)' : 'rgba(255,255,255,0.1)'}`, color: filter === f.k ? 'white' : 'rgba(255,255,255,0.5)' }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-2">
        {list.map((u, i) => {
          const isSub = currentUser.subscriptions.includes(u.id);
          const mainRole = u.roles.find(r => r !== "user") || "user";
          const badge = ROLE_BADGE[mainRole];
          return (
            <div key={u.id} className="glass rounded-2xl p-4 animate-fade-up opacity-0" style={{ animationDelay: `${i * 0.04}s`, animationFillMode: 'forwards' }}>
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #1b6fff, #7c3aed)' }}>{u.avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white">{u.name}</p>
                    <span className="text-xs px-1.5 py-0.5 rounded-md flex items-center gap-1" style={{ background: `${badge.color}18`, color: badge.color }}>
                      <Icon name={badge.icon} size={9} color={badge.color} />{badge.label}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 flex items-center gap-1 mt-0.5"><Icon name="MapPin" size={10} />{u.location}</p>
                  {u.bio && <p className="text-xs text-white/50 mt-1 line-clamp-2">{u.bio}</p>}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-white/40">
                    <span>{u.subscribers.length} подписчиков</span>
                    <span>{u.subscriptions.length} подписок</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => toggleSubscription(u.id)} className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  style={{ background: isSub ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #1b6fff, #0040cc)', border: isSub ? '1px solid rgba(255,255,255,0.15)' : 'none', color: isSub ? 'rgba(255,255,255,0.6)' : 'white' }}>
                  <Icon name={isSub ? "Check" : "UserPlus"} size={13} color={isSub ? 'rgba(255,255,255,0.6)' : 'white'} />{isSub ? "Вы подписаны" : "Подписаться"}
                </button>
                <button onClick={() => setChatUser(u)} className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}>
                  <Icon name="MessageCircle" size={13} color="rgba(255,255,255,0.7)" />Написать
                </button>
              </div>
            </div>
          );
        })}
        {list.length === 0 && (
          <div className="text-center py-14">
            <Icon name="UserX" size={32} color="rgba(255,255,255,0.2)" className="mx-auto mb-3" />
            <p className="text-white/30 text-sm">Никого не найдено</p>
          </div>
        )}
      </div>
    </div>
  );
}
