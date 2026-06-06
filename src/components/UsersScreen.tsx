import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useApp, AppUser } from "@/context/AppContext";
import { AppScreen } from "@/pages/Index";

interface Props { onBack: () => void; onNavigate: (s: AppScreen) => void; }

const ROLE_BADGE: Record<string, { label: string; color: string; icon: string }> = {
  admin: { label: "Админ", color: "#ef4444", icon: "ShieldCheck" },
  content_maker: { label: "Контентмейкер", color: "#ec4899", icon: "Video" },
  editor: { label: "Редактор", color: "#f59e0b", icon: "Newspaper" },
  documentor: { label: "Документовед", color: "#10b981", icon: "FolderOpen" },
  executor: { label: "Исполнитель", color: "#8b5cf6", icon: "Briefcase" },
  school: { label: "Школа", color: "#6366f1", icon: "School" },
  user: { label: "Пользователь", color: "#3b82f6", icon: "User" },
};

// Какая роль даёт доступ к какому разделу контента
const CONTENT_BLOCKS: { key: string; label: string; icon: string; color: string; screen: AppScreen; role?: string }[] = [
  { key: "video", label: "Видео", icon: "Play", color: "#ef4444", screen: "video", role: "content_maker" },
  { key: "news", label: "Новости", icon: "Newspaper", color: "#f59e0b", screen: "news", role: "editor" },
  { key: "documents", label: "Документы", icon: "FolderOpen", color: "#10b981", screen: "documents", role: "documentor" },
  { key: "rfp", label: "Предложения", icon: "FileSearch", color: "#8b5cf6", screen: "rfp" },
  { key: "learning", label: "Курсы", icon: "GraduationCap", color: "#3b82f6", screen: "learning" },
];

interface ChatMsg { from: "me" | "them"; text: string; time: string; }

export default function UsersScreen({ onBack, onNavigate }: Props) {
  const { users, currentUser, toggleSubscription } = useApp();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "subs" | "followers">("all");
  const [chatUser, setChatUser] = useState<AppUser | null>(null);
  const [profileUser, setProfileUser] = useState<AppUser | null>(null);
  const [showInbox, setShowInbox] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chats, setChats] = useState<Record<number, ChatMsg[]>>({
    2: [{ from: "them", text: "Здравствуйте! Видели моё новое видео по охране труда?", time: "10:24" }],
    3: [{ from: "them", text: "Добрый день! Подскажите по инструктажу.", time: "Вчера" }],
    4: [{ from: "them", text: "Спасибо за подписку на блог!", time: "2 дня назад" }],
  });

  const others = users.filter(u => u.id !== currentUser.id);
  let list = others;
  if (filter === "subs") list = others.filter(u => currentUser.subscriptions.includes(u.id));
  if (filter === "followers") list = others.filter(u => currentUser.subscribers.includes(u.id));
  if (search.trim()) {
    const q = search.toLowerCase();
    list = list.filter(u => u.name.toLowerCase().includes(q) || u.location.toLowerCase().includes(q) || (u.bio || "").toLowerCase().includes(q));
  }

  // Письма, где есть входящее (от собеседника)
  const inboxUsers = Object.entries(chats)
    .filter(([, msgs]) => msgs.some(m => m.from === "them"))
    .map(([id]) => users.find(u => u.id === Number(id)))
    .filter((u): u is AppUser => !!u && u.id !== currentUser.id);

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
            <button onClick={() => { setProfileUser(chatUser); setChatUser(null); }} className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #1b6fff, #7c3aed)' }}>{chatUser.avatar}</button>
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

  // ── PUBLIC PROFILE ──
  if (profileUser) {
    const u = users.find(x => x.id === profileUser.id) || profileUser;
    const isSub = currentUser.subscriptions.includes(u.id);
    const approvedRoles = u.roles.filter(r => r !== "user");
    const rating = (4 + ((u.id * 13) % 10) / 10).toFixed(1); // стабильный псевдо-рейтинг 4.0–4.9
    const hasDesktop = approvedRoles.length > 0;

    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        <div className="glass border-b border-white/10 px-4 py-3 sticky top-0 z-20">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <button onClick={() => setProfileUser(null)} className="p-2 rounded-xl hover:bg-white/10 transition-colors"><Icon name="ArrowLeft" size={20} color="white" /></button>
            <h1 className="text-base font-bold text-white flex-1">Профиль пользователя</h1>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
          {/* Profile card */}
          <div className="glass-strong rounded-2xl p-5 animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl font-bold text-white overflow-hidden" style={{ background: u.avatarUrl ? 'transparent' : 'linear-gradient(135deg, #1b6fff, #7c3aed)' }}>
                {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" /> : u.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white">{u.name}</h2>
                <p className="text-xs text-white/40 flex items-center gap-1 mt-0.5"><Icon name="MapPin" size={11} />{u.location}</p>
                <div className="flex items-center gap-1 mt-1.5">
                  <Icon name="Star" size={14} color="#facc15" />
                  <span className="text-sm font-semibold text-yellow-400">{rating}</span>
                  <span className="text-xs text-white/30 ml-1">рейтинг</span>
                </div>
              </div>
            </div>
            {u.bio && <p className="text-sm text-white/60 mt-3">{u.bio}</p>}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 animate-fade-up opacity-0 delay-100" style={{ animationFillMode: 'forwards' }}>
            <div className="glass rounded-2xl p-3 text-center"><Icon name="Users" size={16} color="#ec4899" className="mx-auto mb-1" /><div className="text-lg font-bold text-white">{u.subscribers.length}</div><div className="text-xs text-white/40">Подписчиков</div></div>
            <div className="glass rounded-2xl p-3 text-center"><Icon name="UserPlus" size={16} color="#8b5cf6" className="mx-auto mb-1" /><div className="text-lg font-bold text-white">{u.subscriptions.length}</div><div className="text-xs text-white/40">Подписок</div></div>
            <div className="glass rounded-2xl p-3 text-center"><Icon name="Star" size={16} color="#facc15" className="mx-auto mb-1" /><div className="text-lg font-bold text-white">{rating}</div><div className="text-xs text-white/40">Рейтинг</div></div>
          </div>

          {/* Approved roles */}
          {approvedRoles.length > 0 && (
            <div className="animate-fade-up opacity-0 delay-150" style={{ animationFillMode: 'forwards' }}>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 px-1">Роли, одобренные администрацией</p>
              <div className="flex flex-wrap gap-2">
                {approvedRoles.map(r => (
                  <span key={r} className="text-sm px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-medium" style={{ background: `${ROLE_BADGE[r].color}18`, color: ROLE_BADGE[r].color, border: `1px solid ${ROLE_BADGE[r].color}33` }}>
                    <Icon name={ROLE_BADGE[r].icon} size={13} color={ROLE_BADGE[r].color} />{ROLE_BADGE[r].label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Desktop / workspace */}
          {hasDesktop && (
            <div className="rounded-2xl overflow-hidden animate-fade-up opacity-0 delay-200" style={{ animationFillMode: 'forwards' }}>
              <div className="h-20 relative" style={{ background: 'linear-gradient(135deg, #1b6fff, #7c3aed)' }}>
                <div className="absolute inset-0 flex items-center px-5 gap-2">
                  <Icon name="LayoutDashboard" size={20} color="white" />
                  <span className="text-sm font-semibold text-white">Рабочий стол {u.name.split(" ")[0]}</span>
                </div>
              </div>
            </div>
          )}

          {/* Content blocks */}
          <div className="animate-fade-up opacity-0 delay-300" style={{ animationFillMode: 'forwards' }}>
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 px-1">Контент пользователя</p>
            <div className="grid grid-cols-2 gap-2">
              {CONTENT_BLOCKS.map(b => {
                const hasAccess = !b.role || u.roles.includes(b.role as never);
                return (
                  <button
                    key={b.key}
                    onClick={() => { if (hasAccess) onNavigate(b.screen); }}
                    disabled={!hasAccess}
                    className="flex items-center gap-2.5 p-3.5 rounded-2xl text-left transition-all"
                    style={{ background: hasAccess ? `${b.color}12` : 'rgba(255,255,255,0.03)', border: `1px solid ${hasAccess ? `${b.color}30` : 'rgba(255,255,255,0.06)'}`, opacity: hasAccess ? 1 : 0.5 }}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: hasAccess ? `${b.color}20` : 'rgba(255,255,255,0.05)' }}>
                      <Icon name={b.icon} size={18} color={hasAccess ? b.color : 'rgba(255,255,255,0.3)'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{b.label}</p>
                      <p className="text-xs" style={{ color: hasAccess ? `${b.color}cc` : 'rgba(255,255,255,0.3)' }}>{hasAccess ? "Открыть" : "Нет доступа"}</p>
                    </div>
                    {hasAccess && <Icon name="ChevronRight" size={14} color={`${b.color}99`} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 animate-fade-up opacity-0 delay-300" style={{ animationFillMode: 'forwards' }}>
            <button onClick={() => toggleSubscription(u.id)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all"
              style={{ background: isSub ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #1b6fff, #0040cc)', border: isSub ? '1px solid rgba(255,255,255,0.15)' : 'none', color: isSub ? 'rgba(255,255,255,0.6)' : 'white' }}>
              <Icon name={isSub ? "Check" : "UserPlus"} size={15} color={isSub ? 'rgba(255,255,255,0.6)' : 'white'} />{isSub ? "Вы подписаны" : "Подписаться"}
            </button>
            <button onClick={() => { setChatUser(u); setProfileUser(null); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}>
              <Icon name="MessageCircle" size={15} color="rgba(255,255,255,0.7)" />Написать
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── INBOX (Мои письма) ──
  if (showInbox) {
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        <div className="glass border-b border-white/10 px-4 py-3 sticky top-0 z-20">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <button onClick={() => setShowInbox(false)} className="p-2 rounded-xl hover:bg-white/10 transition-colors"><Icon name="ArrowLeft" size={20} color="white" /></button>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(27,111,255,0.2)', border: '1px solid rgba(27,111,255,0.3)' }}><Icon name="Mail" size={16} color="#4d8fff" /></div>
            <h1 className="text-base font-bold text-white flex-1">Мои письма</h1>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-2">
          {inboxUsers.length > 0 ? inboxUsers.map((u, i) => {
            const msgs = chats[u.id] || [];
            const last = msgs[msgs.length - 1];
            return (
              <button key={u.id} onClick={() => { setChatUser(u); setShowInbox(false); }} className="w-full text-left glass rounded-2xl p-4 hover:border-white/20 transition-all animate-fade-up opacity-0" style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'forwards' }}>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #1b6fff, #7c3aed)' }}>{u.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">{u.name}</p>
                      <span className="text-xs text-white/30">{last?.time}</span>
                    </div>
                    <p className="text-xs text-white/50 truncate mt-0.5">{last?.text}</p>
                  </div>
                  <Icon name="ChevronRight" size={16} color="rgba(255,255,255,0.2)" />
                </div>
              </button>
            );
          }) : (
            <div className="text-center py-14">
              <Icon name="MailX" size={32} color="rgba(255,255,255,0.2)" className="mx-auto mb-3" />
              <p className="text-white/30 text-sm">У вас пока нет писем</p>
            </div>
          )}
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
            <button onClick={() => setShowInbox(true)} className="relative p-2 rounded-xl hover:bg-white/10 transition-colors">
              <Icon name="Mail" size={18} color="white" />
              {inboxUsers.length > 0 && <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold" style={{ background: '#1b6fff', fontSize: '9px' }}>{inboxUsers.length}</span>}
            </button>
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
              <button onClick={() => setProfileUser(u)} className="w-full text-left">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white overflow-hidden" style={{ background: u.avatarUrl ? 'transparent' : 'linear-gradient(135deg, #1b6fff, #7c3aed)' }}>
                    {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" /> : u.avatar}
                  </div>
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
                  <Icon name="ChevronRight" size={16} color="rgba(255,255,255,0.2)" className="self-center" />
                </div>
              </button>
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