import { useState, useRef } from "react";
import Icon from "@/components/ui/icon";
import ModuleHeader from "@/components/ModuleHeader";
import { useApp, UserRole, PaymentService } from "@/context/AppContext";
import { useSharedState } from "@/hooks/useSharedState";

interface Props { onBack: () => void; }

type Tab = "stats" | "users" | "roles" | "granted" | "categories" | "support" | "requisites" | "content" | "manager_appeals" | "accounting" | "payouts";

// Повторяем тип обращения (из SalesModule)
interface ManagerAppeal {
  id: number;
  userId: number;
  userName: string;
  amount: number;
  requisites: string;
  date: string;
  status: "Новое" | "В обработке" | "Выплачено";
}

const ROLE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  admin: { label: "Администратор", color: "#ef4444", icon: "ShieldCheck" },
  content_maker: { label: "Контентмейкер", color: "#ec4899", icon: "Video" },
  editor: { label: "Редактор", color: "#f59e0b", icon: "Newspaper" },
  documentor: { label: "Документовед", color: "#10b981", icon: "FolderOpen" },
  executor: { label: "Исполнитель", color: "#8b5cf6", icon: "Briefcase" },
  school: { label: "Школа", color: "#6366f1", icon: "School" },
  user: { label: "Пользователь", color: "#3b82f6", icon: "User" },
};

const SECTIONS = [
  { key: "video", label: "Видео", icon: "Play", color: "#ef4444" },
  { key: "news", label: "Новости", icon: "Newspaper", color: "#f59e0b" },
  { key: "documents", label: "Категории документов", icon: "FolderOpen", color: "#10b981" },
  { key: "doc_types", label: "Типы документов", icon: "Tag", color: "#06b6d4" },
  { key: "checklists", label: "Чек-листы", icon: "CheckSquare", color: "#8b5cf6" },
  { key: "learning", label: "Обучение", icon: "GraduationCap", color: "#3b82f6" },
];

const GRANTABLE: UserRole[] = ["content_maker", "editor", "documentor", "executor", "school", "admin"];

// Demo content registry for moderation tab
const DEMO_CONTENT = [
  { kind: "video" as const, id: 1, title: "Введение в систему промышленной безопасности", author: "Иван Смирнов", authorId: 1, icon: "Play", color: "#ef4444" },
  { kind: "video" as const, id: 3, title: "Пожарная безопасность: эвакуация", author: "Пётр Волков", authorId: 3, icon: "Play", color: "#ef4444" },
  { kind: "news" as const, id: 1, title: "Плановое техобслуживание серверов", author: "Мария Иванова", authorId: 4, icon: "Newspaper", color: "#f59e0b" },
  { kind: "document" as const, id: 3, title: "Шаблон приказа о назначении", author: "Мария Иванова", authorId: 4, icon: "FolderOpen", color: "#10b981" },
  { kind: "rfp" as const, id: 1, title: "Поставка офисной мебели 2026", author: "Иван Петров", authorId: 1, icon: "FileSearch", color: "#8b5cf6" },
  { kind: "comment" as const, id: 101, title: "«Очень полезное видео, спасибо!»", author: "Сергей К.", authorId: 5, icon: "MessageCircle", color: "#06b6d4" },
];

export default function AdminPanel({ onBack }: Props) {
  const {
    users, toggleBlock, toggleForumBan, grantRole, revokeRole, roleRequests, resolveRoleRequest,
    roleGrants, categories, addCategory, removeCategory, activeUsers, totalVisits,
    paymentServices, addPaymentService, updatePaymentService, removePaymentService,
    supportMessages, replySupportMessage, blockContent, unblockContent, isContentBlocked,
  } = useApp();

  // Обращения от менеджеров (тот же ключ что в SalesModule)
  const [managerAppeals, setManagerAppeals] = useSharedState<ManagerAppeal[]>("manager_appeals", []);
  const newAppealsCount = managerAppeals.filter(a => a.status === "Новое").length;

  const [tab, setTab] = useState<Tab>("stats");
  const [userSearch, setUserSearch] = useState("");
  const [contentSearch, setContentSearch] = useState("");
  const [catSection, setCatSection] = useState("video");
  const [newCat, setNewCat] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [openSupportId, setOpenSupportId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [editService, setEditService] = useState<PaymentService | null>(null);
  const [serviceForm, setServiceForm] = useState<Omit<PaymentService, "id">>({ name: "", requisites: "", qrUrl: "", instruction: "", price: 0, enabled: true });
  const qrRef = useRef<HTMLInputElement>(null);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2000); };

  const pendingReqs = roleRequests.filter(r => r.status === "pending");
  const newSupport = supportMessages.filter(m => m.status === "new").length;
  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.phone.includes(userSearch));
  const grantedUsers = users.filter(u => u.roles.some(r => r !== "user" && r !== "admin"));

  const userName = (id: number) => users.find(u => u.id === id)?.name || `ID ${id}`;
  const userPhone = (id: number) => users.find(u => u.id === id)?.phone || "—";

  const handleQr = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setServiceForm(s => ({ ...s, qrUrl: reader.result as string }));
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  const saveService = () => {
    if (!serviceForm.name.trim()) return;
    if (editService) { updatePaymentService(editService.id, serviceForm); showToast("Услуга обновлена"); }
    else { addPaymentService(serviceForm); showToast("Услуга добавлена"); }
    setEditService(null);
    setServiceForm({ name: "", requisites: "", qrUrl: "", instruction: "", price: 0, enabled: true });
  };

  const TABS = [
    { k: "stats", label: "Статистика", icon: "BarChart3" },
    { k: "users", label: "Пользователи", icon: "Users" },
    { k: "roles", label: "Роли и заявки", icon: "UserCog", badge: pendingReqs.length },
    { k: "granted", label: "С ролями", icon: "BadgeCheck" },
    { k: "support", label: "Обращения", icon: "Mail", badge: newSupport },
    { k: "requisites", label: "Реквизиты", icon: "CreditCard" },
    { k: "content", label: "Контент", icon: "ShieldAlert" },
    { k: "categories", label: "Категории", icon: "Tags" },
    { k: "manager_appeals", label: "От менеджеров", icon: "MessageCircle", badge: newAppealsCount },
    { k: "accounting", label: "Бухгалтерия", icon: "BookOpen" },
    { k: "payouts", label: "Выплаты", icon: "Banknote" },
  ] as const;

  return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl text-sm font-medium text-white animate-fade-up" style={{ background: 'rgba(239,68,68,0.92)', backdropFilter: 'blur(12px)', animationFillMode: 'forwards' }}>{toast}</div>}
      <ModuleHeader title="Админ-панель" onBack={onBack} icon="ShieldCheck" iconColor="#ef4444" subtitle="Управление платформой" />

      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button key={t.k} onClick={() => { setTab(t.k); setOpenSupportId(null); setEditService(null); }} className="relative flex-shrink-0 px-3.5 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5"
              style={{ background: tab === t.k ? 'linear-gradient(135deg,#ef4444,#b91c1c)' : 'rgba(255,255,255,0.06)', border: `1px solid ${tab === t.k ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`, color: tab === t.k ? 'white' : 'rgba(255,255,255,0.5)' }}>
              <Icon name={t.icon} size={15} color={tab === t.k ? 'white' : 'rgba(255,255,255,0.5)'} />{t.label}
              {"badge" in t && t.badge ? <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold" style={{ background: '#f59e0b', fontSize: '9px' }}>{t.badge}</span> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8">
        {/* ── STATS ── */}
        {tab === "stats" && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Всего пользователей", value: users.length, icon: "Users", color: "#3b82f6" },
                { label: "Активных", value: activeUsers, icon: "UserCheck", color: "#10b981" },
                { label: "Заблокировано", value: users.filter(u => u.blocked).length, icon: "UserX", color: "#ef4444" },
                { label: "Посещений", value: totalVisits.toLocaleString("ru-RU"), icon: "Eye", color: "#f59e0b" },
                { label: "Новых обращений", value: newSupport, icon: "Mail", color: "#ec4899" },
                { label: "Заявок на роли", value: pendingReqs.length, icon: "UserCog", color: "#8b5cf6" },
              ].map((s, i) => (
                <div key={s.label} className="glass rounded-2xl p-4 animate-fade-up opacity-0" style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'forwards' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: `${s.color}20` }}><Icon name={s.icon} size={18} color={s.color} /></div>
                  <div className="text-2xl font-bold text-white">{s.value}</div>
                  <div className="text-xs text-white/40 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="glass rounded-2xl p-4">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Распределение ролей</p>
              {GRANTABLE.concat(["user"]).map(role => {
                const count = users.filter(u => u.roles.includes(role)).length;
                const info = ROLE_LABELS[role];
                const pct = users.length ? Math.round((count / users.length) * 100) : 0;
                return (
                  <div key={role} className="mb-3 last:mb-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-2 text-sm text-white/70"><Icon name={info.icon} size={13} color={info.color} />{info.label}</span>
                      <span className="text-sm font-semibold" style={{ color: info.color }}>{count}</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: info.color }} /></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {tab === "users" && (
          <div className="space-y-3 animate-fade-in">
            <div className="relative">
              <Icon name="Search" size={15} color="rgba(255,255,255,0.3)" className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input className="input-field pl-9 text-sm py-2.5" placeholder="Поиск по имени или номеру..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
            </div>
            {filteredUsers.map((u, i) => (
              <div key={u.id} className="glass rounded-2xl p-4 animate-fade-up opacity-0" style={{ animationDelay: `${i * 0.04}s`, animationFillMode: 'forwards' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white" style={{ background: u.blocked ? 'rgba(100,116,139,0.5)' : 'linear-gradient(135deg, #1b6fff, #7c3aed)' }}>{u.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white truncate">{u.name}</p>
                      {u.blocked && <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>Заблокирован</span>}
                    </div>
                    <p className="text-xs text-white/40">{u.phone} · {u.location}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {u.roles.map(r => (
                    <span key={r} className="text-xs px-2 py-0.5 rounded-lg flex items-center gap-1" style={{ background: `${ROLE_LABELS[r].color}18`, color: ROLE_LABELS[r].color, border: `1px solid ${ROLE_LABELS[r].color}33` }}>
                      <Icon name={ROLE_LABELS[r].icon} size={10} color={ROLE_LABELS[r].color} />{ROLE_LABELS[r].label}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { toggleBlock(u.id); showToast(u.blocked ? "Разблокирован" : "Заблокирован"); }} className="py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5" style={{ background: u.blocked ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)', border: `1px solid ${u.blocked ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, color: u.blocked ? '#10b981' : '#ef4444' }}>
                    <Icon name={u.blocked ? "Unlock" : "Lock"} size={12} />{u.blocked ? "Разблокировать" : "Заблокировать"}
                  </button>
                  <button onClick={() => { toggleForumBan(u.id); showToast(u.bannedFromForum ? "Доступ к форуму открыт" : "Бан на форуме"); }} className="py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5" style={{ background: u.bannedFromForum ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${u.bannedFromForum ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.1)'}`, color: u.bannedFromForum ? '#f59e0b' : 'rgba(255,255,255,0.6)' }}>
                    <Icon name="Ban" size={12} />Бан форума
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ROLES ── */}
        {tab === "roles" && (
          <div className="space-y-4 animate-fade-in">
            {pendingReqs.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Заявки на роли ({pendingReqs.length})</p>
                <div className="space-y-2">
                  {pendingReqs.map(r => (
                    <div key={r.id} className="glass rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{r.userName}</p>
                          <p className="text-xs text-white/40">Запрос: {ROLE_LABELS[r.role].label} · {r.date}</p>
                        </div>
                        <Icon name={ROLE_LABELS[r.role].icon} size={18} color={ROLE_LABELS[r.role].color} />
                      </div>
                      <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl" style={{ background: 'rgba(27,111,255,0.1)' }}>
                        <Icon name="Phone" size={13} color="#4d8fff" />
                        <span className="text-xs text-white/60">Телефон для связи:</span>
                        <a href={`tel:+${r.phone}`} className="text-xs font-semibold text-blue-400">+{r.phone}</a>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { resolveRoleRequest(r.id, true); showToast("Роль выдана"); }} className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5" style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#10b981' }}><Icon name="Check" size={12} />Выдать роль</button>
                        <button onClick={() => { resolveRoleRequest(r.id, false); showToast("Отклонено"); }} className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}><Icon name="X" size={12} />Отклонить</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Управление ролями</p>
              <div className="space-y-2">
                {users.map(u => (
                  <div key={u.id} className="glass rounded-2xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #1b6fff, #7c3aed)' }}>{u.avatar}</div>
                      <div className="flex-1"><p className="text-sm font-semibold text-white">{u.name}</p></div>
                    </div>
                    <div className="flex items-center gap-2 mb-3 text-xs text-white/50"><Icon name="Phone" size={12} color="rgba(255,255,255,0.4)" />Телефон: <span className="text-white/70">+{u.phone}</span></div>
                    <div className="flex flex-wrap gap-1.5">
                      {GRANTABLE.map(role => {
                        const has = u.roles.includes(role);
                        return (
                          <button key={role} onClick={() => { if (has) { revokeRole(u.id, role); } else { grantRole(u.id, role); } showToast(has ? "Роль снята" : "Роль выдана"); }}
                            className="text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                            style={{ background: has ? `${ROLE_LABELS[role].color}22` : 'rgba(255,255,255,0.05)', border: `1px solid ${has ? ROLE_LABELS[role].color : 'rgba(255,255,255,0.12)'}`, color: has ? ROLE_LABELS[role].color : 'rgba(255,255,255,0.5)' }}>
                            <Icon name={has ? "Check" : "Plus"} size={10} color={has ? ROLE_LABELS[role].color : 'rgba(255,255,255,0.5)'} />{ROLE_LABELS[role].label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── GRANTED (users with roles + expiry) ── */}
        {tab === "granted" && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider px-1">Пользователи с активными ролями</p>
            {grantedUsers.map(u => {
              const grants = roleGrants.filter(g => g.userId === u.id);
              const paidRoles = u.roles.filter(r => r !== "user" && r !== "admin");
              return (
                <div key={u.id} className="glass rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>{u.avatar}</div>
                    <div className="flex-1"><p className="text-sm font-semibold text-white">{u.name}</p><p className="text-xs text-white/40">+{u.phone}</p></div>
                  </div>
                  <div className="space-y-2">
                    {paidRoles.map(role => {
                      const grant = grants.find(g => g.role === role);
                      return (
                        <div key={role} className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: `${ROLE_LABELS[role].color}10`, border: `1px solid ${ROLE_LABELS[role].color}25` }}>
                          <Icon name={ROLE_LABELS[role].icon} size={14} color={ROLE_LABELS[role].color} />
                          <span className="text-sm font-medium" style={{ color: ROLE_LABELS[role].color }}>{ROLE_LABELS[role].label}</span>
                          <span className="ml-auto text-xs text-white/50 flex items-center gap-1"><Icon name="Clock" size={11} />до {grant?.validUntil || "—"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {grantedUsers.length === 0 && <div className="text-center py-12 text-white/30 text-sm">Нет пользователей с выданными ролями</div>}
          </div>
        )}

        {/* ── SUPPORT / ОБРАЩЕНИЯ ── */}
        {tab === "support" && (
          <div className="space-y-3 animate-fade-in">
            {openSupportId !== null ? (() => {
              const msg = supportMessages.find(m => m.id === openSupportId)!;
              return (
                <div>
                  <button onClick={() => setOpenSupportId(null)} className="flex items-center gap-1 text-white/50 text-sm mb-3 hover:text-white/80"><Icon name="ArrowLeft" size={16} />К списку</button>
                  <div className="glass rounded-2xl p-4 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-white">{msg.subject}</p>
                      <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: msg.status === "new" ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', color: msg.status === "new" ? '#f59e0b' : '#10b981' }}>{msg.status === "new" ? "Новое" : "Отвечено"}</span>
                    </div>
                    <p className="text-xs text-white/40 mb-1 flex items-center gap-2"><Icon name="User" size={11} />{msg.userName} · <a href={`tel:+${msg.phone}`} className="text-blue-400">+{msg.phone}</a> · {msg.date}</p>
                    <p className="text-sm text-white/70 mt-2">{msg.text}</p>
                  </div>
                  {msg.replies.map((r, i) => (
                    <div key={i} className="rounded-2xl p-3 mb-2" style={{ background: 'rgba(27,111,255,0.1)', border: '1px solid rgba(27,111,255,0.25)' }}>
                      <p className="text-xs font-semibold text-blue-400 mb-1">Ответ поддержки · {r.date}</p>
                      <p className="text-sm text-white/70">{r.text}</p>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-3">
                    <input className="input-field text-sm py-2.5 flex-1" placeholder="Написать ответ..." value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && replyText.trim()) { replySupportMessage(msg.id, replyText); setReplyText(""); showToast("Ответ отправлен"); } }} />
                    <button onClick={() => { if (replyText.trim()) { replySupportMessage(msg.id, replyText); setReplyText(""); showToast("Ответ отправлен"); } }} className="p-2.5 rounded-xl flex-shrink-0" style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }}><Icon name="Send" size={18} color="white" /></button>
                  </div>
                </div>
              );
            })() : (
              <>
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider px-1">Обращения в техподдержку ({supportMessages.length})</p>
                {supportMessages.map(m => (
                  <button key={m.id} onClick={() => setOpenSupportId(m.id)} className="w-full text-left glass rounded-2xl p-4 hover:border-white/20 transition-all">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-white">{m.subject}</p>
                      <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: m.status === "new" ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', color: m.status === "new" ? '#f59e0b' : '#10b981' }}>{m.status === "new" ? "Новое" : "Отвечено"}</span>
                    </div>
                    <p className="text-xs text-white/40 mb-1">{m.userName} · +{m.phone} · {m.date}</p>
                    <p className="text-xs text-white/50 line-clamp-1">{m.text}</p>
                  </button>
                ))}
                {supportMessages.length === 0 && <div className="text-center py-12 text-white/30 text-sm">Нет обращений</div>}
              </>
            )}
          </div>
        )}

        {/* ── REQUISITES ── */}
        {tab === "requisites" && (
          <div className="space-y-4 animate-fade-in">
            {editService !== null ? (
              <div className="glass-strong rounded-2xl p-5 space-y-4 animate-scale-in">
                <h3 className="text-base font-bold text-white">{editService.id ? "Редактировать услугу" : "Новая услуга"}</h3>
                <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Название услуги</label><input className="input-field text-sm" placeholder="Роль «Контентмейкер»" value={serviceForm.name} onChange={e => setServiceForm(s => ({ ...s, name: e.target.value }))} /></div>
                <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Цена, ₽</label><input className="input-field text-sm" type="number" value={serviceForm.price || ""} onChange={e => setServiceForm(s => ({ ...s, price: Number(e.target.value) }))} /></div>
                <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Реквизиты (счёт / БИК / текст)</label><textarea className="input-field text-sm resize-none" rows={4} value={serviceForm.requisites} onChange={e => setServiceForm(s => ({ ...s, requisites: e.target.value }))} /></div>
                <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Инструкция по оплате</label><textarea className="input-field text-sm resize-none" rows={3} value={serviceForm.instruction} onChange={e => setServiceForm(s => ({ ...s, instruction: e.target.value }))} /></div>
                <div>
                  <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">QR-код для оплаты</label>
                  <input ref={qrRef} type="file" accept="image/*" className="hidden" onChange={handleQr} />
                  <button onClick={() => qrRef.current?.click()} className="w-full flex flex-col items-center gap-2 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '2px dashed rgba(255,255,255,0.15)' }}>
                    {serviceForm.qrUrl ? <img src={serviceForm.qrUrl} alt="QR" className="w-24 h-24 object-contain rounded-lg" /> : <Icon name="QrCode" size={28} color="rgba(255,255,255,0.3)" />}
                    <span className="text-xs text-white/40">{serviceForm.qrUrl ? "Заменить QR-код" : "Загрузить QR-код"}</span>
                  </button>
                </div>
                <button onClick={() => setServiceForm(s => ({ ...s, enabled: !s.enabled }))} className="w-full flex items-center gap-3 p-3 rounded-xl" style={{ background: serviceForm.enabled ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)', border: serviceForm.enabled ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.1)' }}>
                  <div className="w-10 h-5 rounded-full relative" style={{ background: serviceForm.enabled ? '#10b981' : 'rgba(255,255,255,0.15)' }}><span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: serviceForm.enabled ? '22px' : '2px' }} /></div>
                  <span className="text-sm text-white">{serviceForm.enabled ? "Способ оплаты включён" : "Способ оплаты выключен"}</span>
                </button>
                <div className="flex gap-2">
                  <button onClick={() => { setEditService(null); setServiceForm({ name: "", requisites: "", qrUrl: "", instruction: "", price: 0, enabled: true }); }} className="btn-ghost flex-1 text-sm">Отмена</button>
                  <button onClick={saveService} className="btn-primary flex-1 text-sm" disabled={!serviceForm.name.trim()}>Сохранить</button>
                </div>
              </div>
            ) : (
              <>
                <button onClick={() => { setEditService({ id: 0, name: "", requisites: "", qrUrl: "", instruction: "", price: 0, enabled: true }); setServiceForm({ name: "", requisites: "", qrUrl: "", instruction: "", price: 0, enabled: true }); }} className="btn-primary flex items-center justify-center gap-2"><Icon name="Plus" size={18} />Добавить услугу</button>
                {paymentServices.map(s => (
                  <div key={s.id} className="glass rounded-2xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{s.name}</p>
                        <p className="text-lg font-bold text-green-400 mt-0.5">{s.price.toLocaleString("ru-RU")} ₽</p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-lg font-medium" style={{ background: s.enabled ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: s.enabled ? '#10b981' : '#ef4444' }}>{s.enabled ? "Включено" : "Выключено"}</span>
                    </div>
                    <p className="text-xs text-white/50 whitespace-pre-line mb-2 line-clamp-3">{s.requisites}</p>
                    {s.qrUrl && <img src={s.qrUrl} alt="QR" className="w-16 h-16 object-contain rounded-lg mb-2" />}
                    <div className="flex gap-2">
                      <button onClick={() => { updatePaymentService(s.id, { enabled: !s.enabled }); showToast(s.enabled ? "Выключено" : "Включено"); }} className="flex-1 py-2 rounded-xl text-xs font-medium" style={{ background: s.enabled ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.15)', color: s.enabled ? '#f59e0b' : '#10b981' }}>{s.enabled ? "Выключить" : "Включить"}</button>
                      <button onClick={() => { setEditService(s); setServiceForm({ name: s.name, requisites: s.requisites, qrUrl: s.qrUrl, instruction: s.instruction, price: s.price, enabled: s.enabled }); }} className="flex-1 py-2 rounded-xl text-xs font-medium" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}>Изменить</button>
                      <button onClick={() => { removePaymentService(s.id); showToast("Удалено"); }} className="px-3 py-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)' }}><Icon name="Trash2" size={14} color="#ef4444" /></button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── CONTENT MODERATION ── */}
        {tab === "content" && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider px-1">Модерация контента</p>
            <div className="flex items-start gap-2 p-3 rounded-xl mb-1" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <Icon name="Info" size={14} color="#ef4444" className="flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-300/80">При блокировке контент скрывается от всех пользователей, а автору приходит уведомление о нарушении правил.</p>
            </div>
            <div className="relative">
              <Icon name="Search" size={15} color="rgba(255,255,255,0.3)" className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input className="input-field pl-9 text-sm py-2.5" placeholder="Поиск по названию или автору..." value={contentSearch} onChange={e => setContentSearch(e.target.value)} />
            </div>
            {DEMO_CONTENT.filter(c => c.title.toLowerCase().includes(contentSearch.toLowerCase()) || c.author.toLowerCase().includes(contentSearch.toLowerCase())).map(c => {
              const blocked = isContentBlocked(c.kind, c.id);
              return (
                <div key={`${c.kind}-${c.id}`} className="glass rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${c.color}15` }}><Icon name={c.icon} size={18} color={c.color} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{c.title}</p>
                        {blocked && <span className="text-xs px-1.5 py-0.5 rounded-md flex-shrink-0" style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>Скрыто</span>}
                      </div>
                      <p className="text-xs text-white/40">Автор: {c.author}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {blocked ? (
                      <button onClick={() => { unblockContent(c.kind, c.id); showToast("Контент восстановлен"); }} className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' }}><Icon name="Eye" size={12} />Разблокировать</button>
                    ) : (
                      <button onClick={() => { blockContent(c.kind, c.id, c.authorId); showToast("Контент заблокирован, автор уведомлён"); }} className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}><Icon name="EyeOff" size={12} />Заблокировать</button>
                    )}
                    <button onClick={() => { blockContent(c.kind, c.id, c.authorId); showToast("Контент удалён, автор уведомлён"); }} className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}><Icon name="Trash2" size={12} />Удалить</button>
                  </div>
                </div>
              );
            })}
            {DEMO_CONTENT.filter(c => c.title.toLowerCase().includes(contentSearch.toLowerCase()) || c.author.toLowerCase().includes(contentSearch.toLowerCase())).length === 0 && <div className="text-center py-12 text-white/30 text-sm">Ничего не найдено</div>}
          </div>
        )}

        {/* ── CATEGORIES ── */}
        {tab === "categories" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {SECTIONS.map(s => (
                <button key={s.key} onClick={() => setCatSection(s.key)} className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all" style={{ background: catSection === s.key ? `${s.color}22` : 'rgba(255,255,255,0.06)', border: `1px solid ${catSection === s.key ? s.color : 'rgba(255,255,255,0.1)'}`, color: catSection === s.key ? s.color : 'rgba(255,255,255,0.5)' }}>
                  <Icon name={s.icon} size={13} color={catSection === s.key ? s.color : 'rgba(255,255,255,0.5)'} />{s.label}
                </button>
              ))}
            </div>
            <div className="glass rounded-2xl p-4">
              <div className="flex gap-2 mb-4">
                <input className="input-field text-sm py-2.5 flex-1" placeholder="Новая категория..." value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && newCat.trim()) { addCategory(catSection, newCat.trim()); setNewCat(""); showToast("Категория добавлена"); } }} />
                <button onClick={() => { if (newCat.trim()) { addCategory(catSection, newCat.trim()); setNewCat(""); showToast("Категория добавлена"); } }} className="px-4 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)' }}><Icon name="Plus" size={18} color="#ef4444" /></button>
              </div>
              <div className="space-y-2">
                {(categories[catSection] || []).map(cat => (
                  <div key={cat} className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <Icon name="Tag" size={13} color="rgba(255,255,255,0.4)" />
                    <span className="text-sm text-white/70 flex-1">{cat}</span>
                    <button onClick={() => { removeCategory(catSection, cat); showToast("Удалено"); }} className="p-1 rounded-lg hover:bg-white/10 transition-colors"><Icon name="Trash2" size={14} color="rgba(239,68,68,0.7)" /></button>
                  </div>
                ))}
                {(categories[catSection] || []).length === 0 && <p className="text-center text-white/30 text-sm py-4">Нет категорий</p>}
              </div>
            </div>
          </div>
        )}

        {/* ── ОБРАЩЕНИЯ ОТ МЕНЕДЖЕРОВ ── */}
        {tab === "manager_appeals" && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider px-1">Обращения от менеджеров по продажам</p>
            {managerAppeals.length === 0 && <div className="text-center py-14"><Icon name="MessageCircle" size={32} color="rgba(255,255,255,0.2)" className="mx-auto mb-3" /><p className="text-white/30 text-sm">Нет обращений</p></div>}
            {managerAppeals.map(a => (
              <div key={a.id} className="glass rounded-2xl p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{a.userName}</p>
                    <p className="text-xs text-white/40">{a.date}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-lg flex-shrink-0" style={{ background: a.status === "Выплачено" ? 'rgba(16,185,129,0.15)' : a.status === "В обработке" ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)', color: a.status === "Выплачено" ? '#10b981' : a.status === "В обработке" ? '#f59e0b' : '#ef4444' }}>{a.status}</span>
                </div>
                {a.amount > 0 && <p className="text-sm font-bold text-green-400">{a.amount.toLocaleString("ru-RU")} ₽</p>}
                <p className="text-xs text-white/60 whitespace-pre-wrap">{a.requisites}</p>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setManagerAppeals(prev => prev.map(x => x.id === a.id ? { ...x, status: "В обработке" } : x))} className="flex-1 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>В обработке</button>
                  <button onClick={() => setManagerAppeals(prev => prev.map(x => x.id === a.id ? { ...x, status: "Выплачено" } : x))} className="flex-1 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>Выплачено</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── БУХГАЛТЕРИЯ ── */}
        {tab === "accounting" && (
          <div className="space-y-4 animate-fade-in">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider px-1">Бухгалтерия платформы</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Пользователей всего", value: users.length, icon: "Users", color: "#3b82f6" },
                { label: "Активных подписок", value: users.filter(u => u.roles.some(r => r !== "user")).length, icon: "TrendingUp", color: "#22c55e" },
                { label: "Заявок на роли", value: roleRequests.filter(r => r.status === "pending").length, icon: "Clock", color: "#f59e0b" },
                { label: "Выплачено менеджерам", value: `${managerAppeals.filter(a => a.status === "Выплачено").reduce((s, a) => s + a.amount, 0).toLocaleString("ru-RU")} ₽`, icon: "Banknote", color: "#10b981" },
              ].map(s => (
                <div key={s.label} className="glass rounded-2xl p-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: `${s.color}20` }}><Icon name={s.icon} size={18} color={s.color} /></div>
                  <div className="text-2xl font-bold text-white">{s.value}</div>
                  <div className="text-xs text-white/40 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="glass rounded-2xl p-4">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Реквизиты за оплату ролей</p>
              {paymentServices.map(s => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <span className="text-sm text-white/70">{s.name}</span>
                  <span className="text-sm font-semibold text-green-400">{s.price.toLocaleString("ru-RU")} ₽</span>
                </div>
              ))}
              {paymentServices.length === 0 && <p className="text-center text-white/30 text-sm py-2">Нет данных</p>}
            </div>
            <div className="glass rounded-2xl p-4">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Выплаты менеджерам — статистика</p>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-sm text-white/60">Обращений на вывод</span>
                <span className="text-sm font-semibold text-white">{managerAppeals.filter(a => a.amount > 0).length}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-sm text-white/60">В обработке</span>
                <span className="text-sm font-semibold text-yellow-400">{managerAppeals.filter(a => a.status === "В обработке").reduce((s, a) => s + a.amount, 0).toLocaleString("ru-RU")} ₽</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-white/60">Выплачено</span>
                <span className="text-sm font-semibold text-green-400">{managerAppeals.filter(a => a.status === "Выплачено").reduce((s, a) => s + a.amount, 0).toLocaleString("ru-RU")} ₽</span>
              </div>
            </div>
          </div>
        )}

        {/* ── ВЫПЛАТЫ МЕНЕДЖЕРАМ ── */}
        {tab === "payouts" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Реестр выплат менеджерам</p>
              <button onClick={() => {
                const rows = managerAppeals.filter(a => a.amount > 0).map(a =>
                  `${a.date}\t${a.userName}\t${a.amount} ₽\t${a.requisites}\t${a.status}`
                ).join("\n");
                const header = "Дата\tМенеджер\tСумма\tРеквизиты\tСтатус\n";
                const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = `Выплаты_${new Date().toLocaleDateString("ru-RU")}.csv`; a.click();
                URL.revokeObjectURL(url);
              }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' }}>
                <Icon name="Download" size={14} color="#10b981" />Скачать CSV
              </button>
            </div>
            {managerAppeals.filter(a => a.amount > 0).length === 0 && <div className="text-center py-14"><Icon name="Banknote" size={32} color="rgba(255,255,255,0.2)" className="mx-auto mb-3" /><p className="text-white/30 text-sm">Запросов на вывод ещё не было</p></div>}
            {managerAppeals.filter(a => a.amount > 0).map(a => (
              <div key={a.id} className="glass rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{a.userName}</p>
                    <p className="text-xs text-white/40">{a.date}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-base font-bold text-green-400">{a.amount.toLocaleString("ru-RU")} ₽</p>
                    <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: a.status === "Выплачено" ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: a.status === "Выплачено" ? '#10b981' : '#f59e0b' }}>{a.status}</span>
                  </div>
                </div>
                <div className="rounded-xl p-3 text-xs text-white/60 whitespace-pre-wrap" style={{ background: 'rgba(255,255,255,0.04)' }}>{a.requisites}</div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}