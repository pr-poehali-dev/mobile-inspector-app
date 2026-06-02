import { useState } from "react";
import { User, AppScreen } from "@/pages/Index";
import Icon from "@/components/ui/icon";

interface Props {
  user: User;
  onNavigate: (screen: AppScreen) => void;
}

const MODULES = [
  {
    id: "video" as AppScreen,
    title: "Видеоматериалы",
    desc: "Обучающие и корпоративные видео",
    icon: "Play",
    color: "#ef4444",
    gradient: "from-red-600/20 to-red-900/10",
    count: "24 видео",
  },
  {
    id: "news" as AppScreen,
    title: "Новостная лента",
    desc: "Объявления, события, релизы",
    icon: "Newspaper",
    color: "#f59e0b",
    gradient: "from-amber-600/20 to-amber-900/10",
    count: "12 новостей",
  },
  {
    id: "documents" as AppScreen,
    title: "Документооборот",
    desc: "Договоры, акты, приказы, инструкции",
    icon: "FolderOpen",
    color: "#10b981",
    gradient: "from-emerald-600/20 to-emerald-900/10",
    count: "87 файлов",
  },
  {
    id: "rfp" as AppScreen,
    title: "Запрос предложений",
    desc: "RFP: создание и сравнение",
    icon: "FileSearch",
    color: "#8b5cf6",
    gradient: "from-violet-600/20 to-violet-900/10",
    count: "3 активных",
  },
  {
    id: "checklists" as AppScreen,
    title: "Чек-листы",
    desc: "Шаблоны и пользовательские списки",
    icon: "CheckSquare",
    color: "#06b6d4",
    gradient: "from-cyan-600/20 to-cyan-900/10",
    count: "8 шаблонов",
  },
  {
    id: "forum" as AppScreen,
    title: "Форум",
    desc: "Обсуждения по разделам",
    icon: "MessageSquare",
    color: "#f97316",
    gradient: "from-orange-600/20 to-orange-900/10",
    count: "145 тем",
  },
  {
    id: "learning" as AppScreen,
    title: "Обучение",
    desc: "Курсы, тесты, сертификаты",
    icon: "GraduationCap",
    color: "#3b82f6",
    gradient: "from-blue-600/20 to-blue-900/10",
    count: "6 курсов",
  },
  {
    id: "support" as AppScreen,
    title: "Тех. поддержка",
    desc: "Создание и отслеживание тикетов",
    icon: "LifeBuoy",
    color: "#ec4899",
    gradient: "from-pink-600/20 to-pink-900/10",
    count: "2 открытых",
  },
  {
    id: "ai" as AppScreen,
    title: "ИИ Ассистент",
    desc: "Умный помощник по базе знаний",
    icon: "Bot",
    color: "#a78bfa",
    gradient: "from-purple-600/20 to-purple-900/10",
    count: "Всегда онлайн",
  },
];

export default function Dashboard({ user, onNavigate }: Props) {
  const [pinned] = useState<string[]>(["video", "news", "ai"]);

  const pinnedMods = MODULES.filter(m => pinned.includes(m.id));
  const otherMods = MODULES.filter(m => !pinned.includes(m.id));

  return (
    <div className="min-h-screen relative z-10 pb-8">
      {/* Header */}
      <div className="glass border-b border-white/10 px-4 py-4 sticky top-0 z-20">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center glow-sm" style={{ background: 'linear-gradient(135deg, #1b6fff, #0040cc)' }}>
              <Icon name="Shield" size={18} color="white" />
            </div>
            <div>
              <div className="text-xs text-white/50 leading-none mb-0.5" style={{ fontFamily: 'Montserrat, sans-serif' }}>МОБИЛЬНЫЙ ИНСПЕКТОР</div>
              <div className="text-sm font-semibold text-white leading-none">Добро пожаловать, {user.name.split(" ")[0]}!</div>
            </div>
          </div>
          <button onClick={() => onNavigate("profile")} className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors">
            <Icon name="User" size={18} color="white" />
            <span className="absolute top-1 right-1 dot-online" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-6">
        {/* Welcome banner */}
        <div className="animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
          <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(27,111,255,0.25) 0%, rgba(124,58,237,0.15) 100%)', border: '1px solid rgba(27,111,255,0.3)' }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #7c3aed, transparent)', transform: 'translate(30%, -30%)' }} />
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wider font-semibold mb-1">Корпоративная платформа</p>
                <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>Рабочий стол</h2>
                <p className="text-white/60 text-sm mt-1">
                  {new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
                </p>
              </div>
              <div className="flex items-center gap-1.5 glass px-3 py-1.5 rounded-xl">
                <span className="dot-online" />
                <span className="text-xs text-white/70 font-medium">Онлайн</span>
              </div>
            </div>
            <div className="flex gap-4 mt-4 relative z-10">
              <div className="text-center">
                <div className="text-lg font-bold text-white">3</div>
                <div className="text-white/50 text-xs">Задачи</div>
              </div>
              <div className="w-px bg-white/10" />
              <div className="text-center">
                <div className="text-lg font-bold text-white">7</div>
                <div className="text-white/50 text-xs">Новостей</div>
              </div>
              <div className="w-px bg-white/10" />
              <div className="text-center">
                <div className="text-lg font-bold text-white">2</div>
                <div className="text-white/50 text-xs">Тикета</div>
              </div>
            </div>
          </div>
        </div>

        {/* Pinned */}
        <div className="animate-fade-up opacity-0 delay-100" style={{ animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-2 mb-3">
            <Icon name="Pin" size={14} color="rgba(255,255,255,0.4)" />
            <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Закреплённые</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {pinnedMods.map((mod, i) => (
              <button
                key={mod.id}
                onClick={() => onNavigate(mod.id)}
                className={`card-module text-left animate-fade-up opacity-0`}
                style={{ animationDelay: `${0.1 + i * 0.05}s`, animationFillMode: 'forwards' }}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-gradient-to-br ${mod.gradient}`} style={{ border: `1px solid ${mod.color}30` }}>
                  <Icon name={mod.icon} size={20} color={mod.color} />
                </div>
                <div className="text-xs font-semibold text-white leading-tight">{mod.title}</div>
                <div className="text-xs text-white/40 mt-1">{mod.count}</div>
              </button>
            ))}
          </div>
        </div>

        {/* All modules */}
        <div className="animate-fade-up opacity-0 delay-200" style={{ animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-2 mb-3">
            <Icon name="Grid3X3" size={14} color="rgba(255,255,255,0.4)" />
            <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Все модули</span>
          </div>
          <div className="space-y-2">
            {otherMods.map((mod, i) => (
              <button
                key={mod.id}
                onClick={() => onNavigate(mod.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl text-left animate-fade-up opacity-0 transition-all hover:border-white/20`}
                style={{
                  animationDelay: `${0.2 + i * 0.04}s`,
                  animationFillMode: 'forwards',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${mod.gradient}`} style={{ border: `1px solid ${mod.color}30` }}>
                  <Icon name={mod.icon} size={22} color={mod.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white">{mod.title}</div>
                  <div className="text-xs text-white/40 truncate">{mod.desc}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-white/30">{mod.count}</span>
                  <Icon name="ChevronRight" size={16} color="rgba(255,255,255,0.25)" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
