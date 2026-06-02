import { useState } from "react";
import { User } from "@/pages/Index";
import Icon from "@/components/ui/icon";
import ModuleHeader from "@/components/ModuleHeader";

interface Props {
  user: User;
  onBack: () => void;
  onLogout: () => void;
}

const LEGAL_DOCS = [
  { id: "terms", label: "Пользовательское соглашение", icon: "FileText" },
  { id: "privacy", label: "Политика конфиденциальности", icon: "ShieldCheck" },
  { id: "pd", label: "Согласие на обработку ПД (152-ФЗ)", icon: "UserCheck" },
];

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin: { label: "Администратор", color: "#ef4444" },
  user: { label: "Пользователь", color: "#3b82f6" },
  videoblogger: { label: "Видео-блогер", color: "#f59e0b" },
  guest: { label: "Гость", color: "#64748b" },
};

export default function ProfileScreen({ user, onBack, onLogout }: Props) {
  const [openDoc, setOpenDoc] = useState<string | null>(null);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [settingsModal, setSettingsModal] = useState<string | null>(null);
  const [changePhoneStep, setChangePhoneStep] = useState<"idle" | "phone" | "code">("idle");
  const [newPhone, setNewPhone] = useState("");
  const [notifSettings, setNotifSettings] = useState({ push: true, email: true, sms: false });
  const roleInfo = ROLE_LABELS[user.role] || ROLE_LABELS.user;

  // Модал смены номера
  if (changePhoneStep !== "idle") {
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        <ModuleHeader title="Изменить номер" onBack={() => setChangePhoneStep("idle")} />
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-8 space-y-4">
          {changePhoneStep === "phone" && (
            <div className="glass-strong rounded-2xl p-5 space-y-4 animate-scale-in">
              <p className="text-white/60 text-sm">Введите новый номер телефона. Мы отправим код подтверждения.</p>
              <input className="input-field" type="tel" placeholder="+7 (___) ___-__-__" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
              <button className="btn-primary flex items-center justify-center gap-2" onClick={() => setChangePhoneStep("code")} disabled={newPhone.length < 5}>
                <Icon name="Send" size={18} />Получить код
              </button>
            </div>
          )}
          {changePhoneStep === "code" && (
            <div className="glass-strong rounded-2xl p-5 space-y-4 animate-scale-in">
              <p className="text-white/60 text-sm">Код отправлен на <span className="text-white font-medium">{newPhone}</span></p>
              <p className="text-xs text-blue-400">Для демо: введите любые 4 цифры</p>
              <div className="flex gap-3 justify-center">
                {[0,1,2,3].map(i => (
                  <input key={i} className="otp-input" type="text" inputMode="numeric" maxLength={1} />
                ))}
              </div>
              <button className="btn-primary flex items-center justify-center gap-2" onClick={() => setChangePhoneStep("idle")}>
                <Icon name="Check" size={18} />Подтвердить
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Модал настроек
  if (settingsModal) {
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        <ModuleHeader title={settingsModal} onBack={() => setSettingsModal(null)} />
        <div className="max-w-2xl mx-auto px-4 pt-5 pb-8 space-y-3">
          {settingsModal === "Уведомления" && (
            <div className="glass rounded-2xl overflow-hidden divide-y divide-white/5 animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
              {[
                { key: "push", label: "Push-уведомления", desc: "Уведомления в приложении" },
                { key: "email", label: "Email-уведомления", desc: "На почту при важных событиях" },
                { key: "sms", label: "SMS-уведомления", desc: "Только критические оповещения" },
              ].map(item => (
                <div key={item.key} className="flex items-center gap-3 px-4 py-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{item.label}</p>
                    <p className="text-xs text-white/40">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => setNotifSettings(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                    className="w-12 h-6 rounded-full transition-all relative flex-shrink-0"
                    style={{ background: notifSettings[item.key as keyof typeof notifSettings] ? 'linear-gradient(135deg, #1b6fff, #0040cc)' : 'rgba(255,255,255,0.1)' }}
                  >
                    <span className="absolute top-0.5 rounded-full w-5 h-5 bg-white shadow transition-all" style={{ left: notifSettings[item.key as keyof typeof notifSettings] ? '26px' : '2px' }} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {settingsModal === "Внешний вид" && (
            <div className="space-y-3 animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
              {[
                { label: "Тёмная тема", desc: "Текущая тема оформления", active: true },
                { label: "Светлая тема", desc: "Скоро будет доступна", active: false },
                { label: "Системная", desc: "Следует настройкам устройства", active: false },
              ].map(t => (
                <button key={t.label} className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all" style={{ background: t.active ? 'rgba(27,111,255,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${t.active ? 'rgba(27,111,255,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
                  <div className={`w-5 h-5 rounded-full flex-shrink-0 border-2 flex items-center justify-center ${t.active ? "border-blue-500" : "border-white/30"}`}>
                    {t.active && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{t.label}</p>
                    <p className="text-xs text-white/40">{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {settingsModal === "Язык: Русский" && (
            <div className="space-y-3 animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
              {[
                { label: "Русский", code: "RU", active: true },
                { label: "English", code: "EN", active: false },
              ].map(l => (
                <button key={l.code} className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all" style={{ background: l.active ? 'rgba(27,111,255,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${l.active ? 'rgba(27,111,255,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
                  <div className={`w-5 h-5 rounded-full flex-shrink-0 border-2 flex items-center justify-center ${l.active ? "border-blue-500" : "border-white/30"}`}>
                    {l.active && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                  </div>
                  <span className="text-sm font-medium text-white">{l.label}</span>
                  {l.active && <span className="ml-auto tag text-xs">Текущий</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (openDoc) {
    const doc = LEGAL_DOCS.find(d => d.id === openDoc);
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        <ModuleHeader title={doc?.label || ""} onBack={() => setOpenDoc(null)} />
        <div className="max-w-2xl mx-auto px-4 pt-5 pb-8">
          <div className="glass rounded-2xl p-5">
            <p className="text-sm text-white/60 leading-relaxed">
              Документ является юридически значимым и соответствует требованиям законодательства Российской Федерации, в том числе Федерального закона № 152-ФЗ «О персональных данных», Гражданскому кодексу РФ и иным применимым нормативно-правовым актам.
              {"\n\n"}
              Полный текст документа доступен по запросу в службу поддержки или по адресу: privacy@mobile-inspector.ru
              {"\n\n"}
              ООО «Мобильный Инспектор»{"\n"}
              ИНН: ХXXXXXXXXX{"\n"}
              Юридический адрес: г. Москва{"\n"}
              Дата последнего обновления: 01.06.2026
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      <ModuleHeader title="Профиль" onBack={onBack} />
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-8 space-y-4">
        {/* User card */}
        <div className="animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
          <div className="glass-strong rounded-2xl p-5 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 glow" style={{ background: 'linear-gradient(135deg, #1b6fff, #7c3aed)' }}>
              <span className="text-2xl font-bold text-white">{user.name.charAt(0)}</span>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-white">{user.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-medium px-2 py-0.5 rounded-lg" style={{ background: `${roleInfo.color}20`, color: roleInfo.color, border: `1px solid ${roleInfo.color}40` }}>{roleInfo.label}</span>
                <span className="dot-online" />
              </div>
              <p className="text-xs text-white/40 mt-1.5">{user.phone.replace(/(\d)(\d{3})(\d{3})(\d{2})(\d{2})/, "+7 ($2) $3-$4-$5")}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 animate-fade-up opacity-0 delay-100" style={{ animationFillMode: 'forwards' }}>
          {[
            { label: "Курсов", value: "2/4", icon: "GraduationCap", color: "#3b82f6" },
            { label: "Тикетов", value: "3", icon: "LifeBuoy", color: "#ec4899" },
            { label: "Документов", value: "12", icon: "FileText", color: "#10b981" },
          ].map(stat => (
            <div key={stat.label} className="glass rounded-2xl p-3 text-center">
              <Icon name={stat.icon} size={20} color={stat.color} className="mx-auto mb-1" />
              <div className="text-lg font-bold text-white">{stat.value}</div>
              <div className="text-xs text-white/40">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Settings */}
        <div className="animate-fade-up opacity-0 delay-200" style={{ animationFillMode: 'forwards' }}>
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 px-1">Настройки</p>
          <div className="glass rounded-2xl overflow-hidden divide-y divide-white/5">
            {[
              { icon: "Bell", label: "Уведомления", color: "#f59e0b" },
              { icon: "Palette", label: "Внешний вид", color: "#8b5cf6" },
              { icon: "Globe", label: "Язык: Русский", color: "#06b6d4" },
            ].map(item => (
              <button key={item.label} onClick={() => setSettingsModal(item.label)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors text-left">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${item.color}15` }}>
                  <Icon name={item.icon} size={16} color={item.color} />
                </div>
                <span className="text-sm text-white/80 flex-1">{item.label}</span>
                <Icon name="ChevronRight" size={16} color="rgba(255,255,255,0.2)" />
              </button>
            ))}
          </div>
        </div>

        {/* Security & Docs */}
        <div className="animate-fade-up opacity-0 delay-300" style={{ animationFillMode: 'forwards' }}>
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 px-1">Безопасность</p>
          <div className="glass rounded-2xl overflow-hidden divide-y divide-white/5">
            <button onClick={() => setChangePhoneStep("phone")} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors text-left">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(27,111,255,0.15)' }}>
                <Icon name="Lock" size={16} color="#1b6fff" />
              </div>
              <span className="text-sm text-white/80 flex-1">Изменить номер телефона</span>
              <Icon name="ChevronRight" size={16} color="rgba(255,255,255,0.2)" />
            </button>
            <div className="px-4 py-3">
              <p className="text-xs text-white/40 mb-2">Юридические документы</p>
              {LEGAL_DOCS.map(doc => (
                <button key={doc.id} onClick={() => setOpenDoc(doc.id)} className="w-full flex items-center gap-2 py-2 hover:bg-white/5 rounded-lg px-1 transition-colors text-left">
                  <Icon name={doc.icon} size={14} color="#4d8fff" />
                  <span className="text-sm text-blue-400 hover:text-blue-300 transition-colors">{doc.label}</span>
                  <Icon name="ExternalLink" size={12} color="rgba(77,143,255,0.6)" className="ml-auto" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Logout */}
        {!logoutConfirm ? (
          <button onClick={() => setLogoutConfirm(true)} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-semibold text-red-400 transition-all hover:bg-red-500/10 animate-fade-up opacity-0 delay-400" style={{ animationFillMode: 'forwards', border: '1px solid rgba(239,68,68,0.2)' }}>
            <Icon name="LogOut" size={16} color="#f87171" />Выйти из аккаунта
          </button>
        ) : (
          <div className="glass rounded-2xl p-4 animate-scale-in" style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
            <p className="text-sm text-white font-medium mb-3 text-center">Вы уверены, что хотите выйти?</p>
            <div className="flex gap-3">
              <button onClick={() => setLogoutConfirm(false)} className="btn-ghost flex-1 text-sm">Отмена</button>
              <button onClick={onLogout} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>Выйти</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}