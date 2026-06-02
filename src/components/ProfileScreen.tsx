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
  const roleInfo = ROLE_LABELS[user.role] || ROLE_LABELS.user;

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
              <button key={item.label} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors text-left">
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
            <button className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors text-left">
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
