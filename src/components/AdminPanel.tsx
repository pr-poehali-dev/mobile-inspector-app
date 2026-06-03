import { useState } from "react";
import Icon from "@/components/ui/icon";
import ModuleHeader from "@/components/ModuleHeader";
import { useApp, UserRole } from "@/context/AppContext";

interface Props { onBack: () => void; }

type Tab = "stats" | "users" | "roles" | "categories";

const ROLE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  admin: { label: "Администратор", color: "#ef4444", icon: "ShieldCheck" },
  content_maker: { label: "Контентмейкер", color: "#ec4899", icon: "Video" },
  editor: { label: "Редактор", color: "#f59e0b", icon: "Newspaper" },
  documentor: { label: "Документовед", color: "#10b981", icon: "FolderOpen" },
  user: { label: "Пользователь", color: "#3b82f6", icon: "User" },
};

const SECTIONS = [
  { key: "video", label: "Видео", icon: "Play", color: "#ef4444" },
  { key: "news", label: "Новости", icon: "Newspaper", color: "#f59e0b" },
  { key: "documents", label: "Документы", icon: "FolderOpen", color: "#10b981" },
  { key: "checklists", label: "Чек-листы", icon: "CheckSquare", color: "#06b6d4" },
  { key: "learning", label: "Обучение", icon: "GraduationCap", color: "#3b82f6" },
];

const GRANTABLE: UserRole[] = ["content_maker", "editor", "documentor", "admin"];

export default function AdminPanel({ onBack }: Props) {
  const { users, toggleBlock, toggleForumBan, grantRole, revokeRole, roleRequests, resolveRoleRequest, categories, addCategory, removeCategory, activeUsers, totalVisits } = useApp();
  const [tab, setTab] = useState<Tab>("stats");
  const [userSearch, setUserSearch] = useState("");
  const [catSection, setCatSection] = useState("video");
  const [newCat, setNewCat] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2000); };

  const pendingReqs = roleRequests.filter(r => r.status === "pending");
  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.phone.includes(userSearch));

  return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl text-sm font-medium text-white animate-fade-up" style={{ background: 'rgba(239,68,68,0.92)', backdropFilter: 'blur(12px)', animationFillMode: 'forwards' }}>{toast}</div>
      )}
      <ModuleHeader title="Админ-панель" onBack={onBack} icon="ShieldCheck" iconColor="#ef4444" subtitle="Управление платформой" />

      {/* Tabs */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {([
            { k: "stats", label: "Статистика", icon: "BarChart3" },
            { k: "users", label: "Пользователи", icon: "Users" },
            { k: "roles", label: "Роли и заявки", icon: "UserCog", badge: pendingReqs.length },
            { k: "categories", label: "Категории", icon: "Tags" },
          ] as const).map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} className="relative flex-shrink-0 px-3.5 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5"
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
              ].map((s, i) => (
                <div key={s.label} className="glass rounded-2xl p-4 animate-fade-up opacity-0" style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'forwards' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: `${s.color}20` }}>
                    <Icon name={s.icon} size={18} color={s.color} />
                  </div>
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
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: info.color }} />
                    </div>
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
                    <Icon name="MessageSquareOff" size={12} fallback="Ban" />{u.bannedFromForum ? "Бан форума" : "Бан форума"}
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
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{r.userName}</p>
                          <p className="text-xs text-white/40">Запрос: {ROLE_LABELS[r.role].label} · {r.date}</p>
                        </div>
                        <Icon name={ROLE_LABELS[r.role].icon} size={18} color={ROLE_LABELS[r.role].color} />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { resolveRoleRequest(r.id, true); showToast("Роль выдана"); }} className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5" style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#10b981' }}>
                          <Icon name="Check" size={12} />Выдать роль
                        </button>
                        <button onClick={() => { resolveRoleRequest(r.id, false); showToast("Отклонено"); }} className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                          <Icon name="X" size={12} />Отклонить
                        </button>
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
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #1b6fff, #7c3aed)' }}>{u.avatar}</div>
                      <p className="text-sm font-semibold text-white flex-1">{u.name}</p>
                    </div>
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

        {/* ── CATEGORIES ── */}
        {tab === "categories" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {SECTIONS.map(s => (
                <button key={s.key} onClick={() => setCatSection(s.key)} className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all"
                  style={{ background: catSection === s.key ? `${s.color}22` : 'rgba(255,255,255,0.06)', border: `1px solid ${catSection === s.key ? s.color : 'rgba(255,255,255,0.1)'}`, color: catSection === s.key ? s.color : 'rgba(255,255,255,0.5)' }}>
                  <Icon name={s.icon} size={13} color={catSection === s.key ? s.color : 'rgba(255,255,255,0.5)'} />{s.label}
                </button>
              ))}
            </div>
            <div className="glass rounded-2xl p-4">
              <div className="flex gap-2 mb-4">
                <input className="input-field text-sm py-2.5 flex-1" placeholder="Новая категория..." value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && newCat.trim()) { addCategory(catSection, newCat.trim()); setNewCat(""); showToast("Категория добавлена"); } }} />
                <button onClick={() => { if (newCat.trim()) { addCategory(catSection, newCat.trim()); setNewCat(""); showToast("Категория добавлена"); } }} className="px-4 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <Icon name="Plus" size={18} color="#ef4444" />
                </button>
              </div>
              <div className="space-y-2">
                {(categories[catSection] || []).map(cat => (
                  <div key={cat} className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <Icon name="Tag" size={13} color="rgba(255,255,255,0.4)" />
                    <span className="text-sm text-white/70 flex-1">{cat}</span>
                    <button onClick={() => { removeCategory(catSection, cat); showToast("Удалено"); }} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                      <Icon name="Trash2" size={14} color="rgba(239,68,68,0.7)" />
                    </button>
                  </div>
                ))}
                {(categories[catSection] || []).length === 0 && <p className="text-center text-white/30 text-sm py-4">Нет категорий</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}