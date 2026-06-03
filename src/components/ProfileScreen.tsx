import { useState, useRef } from "react";
import Icon from "@/components/ui/icon";
import ModuleHeader from "@/components/ModuleHeader";
import { useApp, I18N } from "@/context/AppContext";
import { AppScreen } from "@/pages/Index";

interface Props {
  onBack: () => void;
  onLogout: () => void;
  onNavigate: (s: AppScreen) => void;
}

const LEGAL_DOCS = [
  { id: "terms", label: "Пользовательское соглашение", icon: "FileText" },
  { id: "privacy", label: "Политика конфиденциальности", icon: "ShieldCheck" },
  { id: "pd", label: "Согласие на обработку ПД (152-ФЗ)", icon: "UserCheck" },
];

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin: { label: "Администратор", color: "#ef4444" },
  user: { label: "Пользователь", color: "#3b82f6" },
  content_maker: { label: "Контентмейкер", color: "#ec4899" },
  editor: { label: "Редактор", color: "#f59e0b" },
  documentor: { label: "Документовед", color: "#10b981" },
  guest: { label: "Гость", color: "#64748b" },
};

const THEMES = [
  { id: "dark" as const, label: "Тёмная тема", desc: "Классическое оформление", swatch: "linear-gradient(135deg, #0a0f1e, #1b6fff)" },
  { id: "light" as const, label: "Светлая тема", desc: "Светлый интерфейс", swatch: "linear-gradient(135deg, #f1f5f9, #cbd5e1)" },
  { id: "brand" as const, label: "Фирменная", desc: "Красная на чёрном", swatch: "linear-gradient(135deg, #0d0000, #ef4444)" },
];

export default function ProfileScreen({ onBack, onLogout, onNavigate }: Props) {
  const { currentUser, updateCurrentUser, myStats, theme, setTheme, lang, setLang, isAdmin } = useApp();
  const t = I18N[lang];
  const [openDoc, setOpenDoc] = useState<string | null>(null);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [settingsModal, setSettingsModal] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: currentUser.name, email: currentUser.email, location: currentUser.location });
  const [changePhoneStep, setChangePhoneStep] = useState<"idle" | "phone" | "code">("idle");
  const [newPhone, setNewPhone] = useState("");
  const [notifSettings, setNotifSettings] = useState({ push: true, email: true, sms: false });
  const fileRef = useRef<HTMLInputElement>(null);

  const mainRole = currentUser.roles.find(r => r !== "user") || currentUser.roles[0] || "user";
  const roleInfo = ROLE_LABELS[mainRole] || ROLE_LABELS.user;

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateCurrentUser({ avatarUrl: reader.result as string });
    reader.readAsDataURL(file);
  };

  const saveProfile = () => {
    updateCurrentUser({ name: form.name, email: form.email, location: form.location, avatar: form.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() });
    setEditing(false);
  };

  // ── DOC VIEW ──
  if (openDoc) {
    const doc = LEGAL_DOCS.find(d => d.id === openDoc);
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        <ModuleHeader title={doc?.label || ""} onBack={() => setOpenDoc(null)} />
        <div className="max-w-2xl mx-auto px-4 pt-5 pb-8">
          <div className="glass rounded-2xl p-5">
            <p className="text-sm text-white/60 leading-relaxed whitespace-pre-line">
              Документ соответствует требованиям законодательства РФ, в т.ч. Федерального закона № 152-ФЗ «О персональных данных».{"\n\n"}Полный текст доступен по запросу: privacy@mobile-inspector.ru{"\n\n"}ООО «Мобильный Инспектор», г. Москва{"\n"}Дата обновления: 01.06.2026
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── CHANGE PHONE ──
  if (changePhoneStep !== "idle") {
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        <ModuleHeader title="Изменить номер" onBack={() => setChangePhoneStep("idle")} />
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-8 space-y-4">
          {changePhoneStep === "phone" ? (
            <div className="glass-strong rounded-2xl p-5 space-y-4 animate-scale-in">
              <p className="text-white/60 text-sm">Введите новый номер. Отправим код подтверждения.</p>
              <input className="input-field" type="tel" placeholder="+7 (___) ___-__-__" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
              <button className="btn-primary flex items-center justify-center gap-2" onClick={() => setChangePhoneStep("code")} disabled={newPhone.length < 5}>
                <Icon name="Send" size={18} />Получить код
              </button>
            </div>
          ) : (
            <div className="glass-strong rounded-2xl p-5 space-y-4 animate-scale-in">
              <p className="text-white/60 text-sm">Код отправлен на <span className="text-white font-medium">{newPhone}</span></p>
              <p className="text-xs text-blue-400">Для демо: введите любые 4 цифры</p>
              <div className="flex gap-3 justify-center">{[0, 1, 2, 3].map(i => <input key={i} className="otp-input" type="text" inputMode="numeric" maxLength={1} />)}</div>
              <button className="btn-primary flex items-center justify-center gap-2" onClick={() => { updateCurrentUser({ phone: newPhone.replace(/\D/g, "") }); setChangePhoneStep("idle"); }}>
                <Icon name="Check" size={18} />Подтвердить
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── SETTINGS MODALS ──
  if (settingsModal) {
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        <ModuleHeader title={settingsModal} onBack={() => setSettingsModal(null)} />
        <div className="max-w-2xl mx-auto px-4 pt-5 pb-8 space-y-3">
          {settingsModal === t.notifications && (
            <div className="glass rounded-2xl overflow-hidden divide-y divide-white/5">
              {[{ key: "push", label: "Push-уведомления", desc: "В приложении" }, { key: "email", label: "Email-уведомления", desc: "На почту" }, { key: "sms", label: "SMS-уведомления", desc: "Критические" }].map(item => (
                <div key={item.key} className="flex items-center gap-3 px-4 py-4">
                  <div className="flex-1"><p className="text-sm font-medium text-white">{item.label}</p><p className="text-xs text-white/40">{item.desc}</p></div>
                  <button onClick={() => setNotifSettings(p => ({ ...p, [item.key]: !p[item.key as keyof typeof p] }))} className="w-12 h-6 rounded-full transition-all relative flex-shrink-0" style={{ background: notifSettings[item.key as keyof typeof notifSettings] ? 'linear-gradient(135deg, #1b6fff, #0040cc)' : 'rgba(255,255,255,0.1)' }}>
                    <span className="absolute top-0.5 rounded-full w-5 h-5 bg-white shadow transition-all" style={{ left: notifSettings[item.key as keyof typeof notifSettings] ? '26px' : '2px' }} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {settingsModal === t.appearance && (
            <div className="space-y-3">
              {THEMES.map(th => (
                <button key={th.id} onClick={() => setTheme(th.id)} className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all" style={{ background: theme === th.id ? 'rgba(27,111,255,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${theme === th.id ? 'rgba(27,111,255,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
                  <div className="w-10 h-10 rounded-xl flex-shrink-0" style={{ background: th.swatch, border: '1px solid rgba(255,255,255,0.2)' }} />
                  <div className="flex-1"><p className="text-sm font-medium text-white">{th.label}</p><p className="text-xs text-white/40">{th.desc}</p></div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${theme === th.id ? "border-blue-500" : "border-white/30"}`}>
                    {theme === th.id && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                  </div>
                </button>
              ))}
            </div>
          )}
          {settingsModal === t.language && (
            <div className="space-y-3">
              {[{ code: "ru" as const, label: "Русский" }, { code: "en" as const, label: "English" }].map(l => (
                <button key={l.code} onClick={() => setLang(l.code)} className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all" style={{ background: lang === l.code ? 'rgba(27,111,255,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${lang === l.code ? 'rgba(27,111,255,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${lang === l.code ? "border-blue-500" : "border-white/30"}`}>
                    {lang === l.code && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                  </div>
                  <span className="text-sm font-medium text-white flex-1">{l.label}</span>
                  {lang === l.code && <span className="tag text-xs">{lang === "ru" ? "Текущий" : "Current"}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── MAIN ──
  return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      <ModuleHeader title={t.profile} onBack={onBack} />
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-8 space-y-4">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

        {/* User card */}
        <div className="glass-strong rounded-2xl p-5 animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
          {!editing ? (
            <div className="flex items-center gap-4">
              <button onClick={() => fileRef.current?.click()} className="relative w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 glow overflow-hidden" style={{ background: currentUser.avatarUrl ? 'transparent' : 'linear-gradient(135deg, #1b6fff, #7c3aed)' }}>
                {currentUser.avatarUrl ? <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-2xl font-bold text-white">{currentUser.avatar}</span>}
                <span className="absolute bottom-0 right-0 w-5 h-5 rounded-tl-lg flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}><Icon name="Camera" size={11} color="white" /></span>
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white truncate">{currentUser.name}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {currentUser.roles.map(r => (
                    <span key={r} className="text-xs font-medium px-2 py-0.5 rounded-lg" style={{ background: `${ROLE_LABELS[r]?.color || '#64748b'}20`, color: ROLE_LABELS[r]?.color || '#64748b', border: `1px solid ${ROLE_LABELS[r]?.color || '#64748b'}40` }}>{ROLE_LABELS[r]?.label || r}</span>
                  ))}
                </div>
                <p className="text-xs text-white/40 mt-1.5 flex items-center gap-1"><Icon name="Mail" size={11} />{currentUser.email}</p>
                <p className="text-xs text-white/40 mt-0.5 flex items-center gap-1"><Icon name="MapPin" size={11} />{currentUser.location}</p>
              </div>
              <button onClick={() => { setForm({ name: currentUser.name, email: currentUser.email, location: currentUser.location }); setEditing(true); }} className="p-2 rounded-xl hover:bg-white/10 transition-colors self-start">
                <Icon name="Pencil" size={16} color="rgba(255,255,255,0.5)" />
              </button>
            </div>
          ) : (
            <div className="space-y-3 animate-scale-in">
              <div className="flex items-center gap-3 mb-1">
                <button onClick={() => fileRef.current?.click()} className="relative w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: currentUser.avatarUrl ? 'transparent' : 'linear-gradient(135deg, #1b6fff, #7c3aed)' }}>
                  {currentUser.avatarUrl ? <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-xl font-bold text-white">{currentUser.avatar}</span>}
                </button>
                <div className="flex gap-2">
                  <button onClick={() => fileRef.current?.click()} className="text-xs px-3 py-1.5 rounded-lg text-blue-400" style={{ background: 'rgba(27,111,255,0.12)', border: '1px solid rgba(27,111,255,0.3)' }}>Сменить фото</button>
                  {currentUser.avatarUrl && <button onClick={() => updateCurrentUser({ avatarUrl: undefined })} className="text-xs px-3 py-1.5 rounded-lg text-red-400" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>Удалить</button>}
                </div>
              </div>
              <input className="input-field text-sm" placeholder="Имя" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <input className="input-field text-sm" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              <input className="input-field text-sm" placeholder="Местоположение" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="btn-ghost flex-1 text-sm">Отмена</button>
                <button onClick={saveProfile} className="btn-primary flex-1 text-sm flex items-center justify-center gap-1.5" disabled={!form.name.trim()}><Icon name="Check" size={15} />Сохранить</button>
              </div>
            </div>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 animate-fade-up opacity-0 delay-100" style={{ animationFillMode: 'forwards' }}>
          {[
            { label: t.videos, value: myStats.videos, icon: "Play", color: "#ef4444" },
            { label: t.news, value: myStats.news, icon: "Newspaper", color: "#f59e0b" },
            { label: t.documents, value: myStats.documents, icon: "FileText", color: "#10b981" },
            { label: t.courses, value: myStats.courses, icon: "GraduationCap", color: "#3b82f6" },
            { label: t.subscribers, value: currentUser.subscribers.length, icon: "Users", color: "#ec4899" },
            { label: t.subscriptions, value: currentUser.subscriptions.length, icon: "UserPlus", color: "#8b5cf6" },
          ].map(s => (
            <div key={s.label} className="glass rounded-2xl p-3 text-center">
              <Icon name={s.icon} size={18} color={s.color} className="mx-auto mb-1" />
              <div className="text-lg font-bold text-white">{s.value}</div>
              <div className="text-xs text-white/40">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Admin & Users quick access */}
        <div className="grid grid-cols-2 gap-2 animate-fade-up opacity-0 delay-150" style={{ animationFillMode: 'forwards' }}>
          <button onClick={() => onNavigate("users")} className="flex items-center gap-2 p-3.5 rounded-2xl text-left" style={{ background: 'rgba(27,111,255,0.1)', border: '1px solid rgba(27,111,255,0.25)' }}>
            <Icon name="Users" size={18} color="#4d8fff" />
            <span className="text-sm font-medium text-white">Пользователи</span>
          </button>
          {isAdmin && (
            <button onClick={() => onNavigate("admin")} className="flex items-center gap-2 p-3.5 rounded-2xl text-left" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <Icon name="ShieldCheck" size={18} color="#ef4444" />
              <span className="text-sm font-medium text-white">{t.admin}</span>
            </button>
          )}
        </div>

        {/* Settings */}
        <div className="animate-fade-up opacity-0 delay-200" style={{ animationFillMode: 'forwards' }}>
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 px-1">{t.settings}</p>
          <div className="glass rounded-2xl overflow-hidden divide-y divide-white/5">
            {[
              { icon: "Bell", label: t.notifications, color: "#f59e0b" },
              { icon: "Palette", label: t.appearance, color: "#8b5cf6" },
              { icon: "Globe", label: t.language, color: "#06b6d4" },
            ].map(item => (
              <button key={item.label} onClick={() => setSettingsModal(item.label)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors text-left">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${item.color}15` }}><Icon name={item.icon} size={16} color={item.color} /></div>
                <span className="text-sm text-white/80 flex-1">{item.label}{item.label === t.language ? `: ${lang === "ru" ? "Русский" : "English"}` : ""}</span>
                <Icon name="ChevronRight" size={16} color="rgba(255,255,255,0.2)" />
              </button>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="animate-fade-up opacity-0 delay-300" style={{ animationFillMode: 'forwards' }}>
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 px-1">{t.security}</p>
          <div className="glass rounded-2xl overflow-hidden divide-y divide-white/5">
            <button onClick={() => setChangePhoneStep("phone")} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors text-left">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(27,111,255,0.15)' }}><Icon name="Lock" size={16} color="#1b6fff" /></div>
              <span className="text-sm text-white/80 flex-1">Изменить номер телефона</span>
              <Icon name="ChevronRight" size={16} color="rgba(255,255,255,0.2)" />
            </button>
            <div className="px-4 py-3">
              <p className="text-xs text-white/40 mb-2">Юридические документы</p>
              {LEGAL_DOCS.map(doc => (
                <button key={doc.id} onClick={() => setOpenDoc(doc.id)} className="w-full flex items-center gap-2 py-2 hover:bg-white/5 rounded-lg px-1 transition-colors text-left">
                  <Icon name={doc.icon} size={14} color="#4d8fff" />
                  <span className="text-sm text-blue-400">{doc.label}</span>
                  <Icon name="ExternalLink" size={12} color="rgba(77,143,255,0.6)" className="ml-auto" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Logout */}
        {!logoutConfirm ? (
          <button onClick={() => setLogoutConfirm(true)} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-semibold text-red-400 transition-all hover:bg-red-500/10" style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
            <Icon name="LogOut" size={16} color="#f87171" />{t.logout}
          </button>
        ) : (
          <div className="glass rounded-2xl p-4 animate-scale-in" style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
            <p className="text-sm text-white font-medium mb-3 text-center">Выйти из аккаунта?</p>
            <div className="flex gap-3">
              <button onClick={() => setLogoutConfirm(false)} className="btn-ghost flex-1 text-sm">Отмена</button>
              <button onClick={onLogout} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>Выйти</button>
            </div>
          </div>
        )}

        {/* Delete profile */}
        {!deleteConfirm ? (
          <button onClick={() => setDeleteConfirm(true)} className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium text-white/40 transition-all hover:text-red-400">
            <Icon name="Trash2" size={15} />Удалить профиль
          </button>
        ) : (
          <div className="glass rounded-2xl p-4 animate-scale-in" style={{ border: '1px solid rgba(239,68,68,0.4)' }}>
            <div className="flex items-center gap-2 mb-2"><Icon name="AlertTriangle" size={16} color="#ef4444" /><p className="text-sm text-red-400 font-semibold">Удаление профиля</p></div>
            <p className="text-xs text-white/50 mb-3">Все ваши данные будут безвозвратно удалены. Это действие нельзя отменить.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(false)} className="btn-ghost flex-1 text-sm">Отмена</button>
              <button onClick={onLogout} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #991b1b, #7f1d1d)' }}>Удалить навсегда</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
