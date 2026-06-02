import { useState } from "react";
import Icon from "@/components/ui/icon";
import ModuleHeader from "@/components/ModuleHeader";

interface Props { onBack: () => void; }

const NEWS = [
  { id: 1, title: "Плановое техобслуживание серверов 10 июня", text: "В период с 02:00 до 05:00 10 июня будет проводиться плановое обслуживание серверной инфраструктуры. Сервисы будут временно недоступны.", date: "02.06.2026", author: "Администратор", category: "Объявления", important: true },
  { id: 2, title: "Запускаем новый модуль «ИИ Ассистент»", text: "С сегодняшнего дня доступен умный помощник на основе корпоративной базы знаний. Он ответит на вопросы по документам, чек-листам и новостям.", date: "01.06.2026", author: "Отдел разработки", category: "Релизы", important: false },
  { id: 3, title: "Поздравляем с Днём защиты детей!", text: "Уважаемые коллеги, поздравляем всех с Международным днём защиты детей! Желаем здоровья, счастья и благополучия вашим семьям.", date: "01.06.2026", author: "HR-отдел", category: "Поздравления", important: false },
  { id: 4, title: "Конференция по безопасности труда — 15 июня", text: "Приглашаем всех сотрудников на ежегодную конференцию по охране труда. Регистрация обязательна. Начало в 10:00 в конференц-зале №2.", date: "30.05.2026", author: "Служба охраны труда", category: "События", important: true },
  { id: 5, title: "Обновление регламентов внутреннего документооборота", text: "С 1 июня вступают в силу обновлённые регламенты. Пожалуйста, ознакомьтесь с изменениями в разделе «Документооборот».", date: "28.05.2026", author: "Юридический отдел", category: "Важное", important: false },
];

const CATEGORIES = ["Все", "Объявления", "События", "Релизы", "Поздравления", "Важное"];
const CATEGORY_COLORS: Record<string, string> = {
  "Объявления": "#3b82f6",
  "События": "#f59e0b",
  "Релизы": "#10b981",
  "Поздравления": "#ec4899",
  "Важное": "#ef4444",
};

export default function NewsModule({ onBack }: Props) {
  const [filter, setFilter] = useState("Все");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<typeof NEWS[0] | null>(null);

  const filtered = NEWS.filter(n =>
    (filter === "Все" || n.category === filter) &&
    (n.title.toLowerCase().includes(search.toLowerCase()) || n.text.toLowerCase().includes(search.toLowerCase()))
  );

  if (selected) {
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        <ModuleHeader title={selected.category} onBack={() => setSelected(null)} />
        <div className="max-w-2xl mx-auto px-4 pt-5 pb-8 space-y-4">
          {selected.important && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <Icon name="AlertTriangle" size={15} color="#ef4444" />
              <span className="text-sm text-red-400 font-medium">Важная новость</span>
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>{selected.title}</h1>
            <div className="flex items-center gap-3 text-xs text-white/40">
              <span className="flex items-center gap-1"><Icon name="User" size={12} />{selected.author}</span>
              <span className="flex items-center gap-1"><Icon name="Calendar" size={12} />{selected.date}</span>
              <span className="tag" style={{ background: `${CATEGORY_COLORS[selected.category]}20`, borderColor: `${CATEGORY_COLORS[selected.category]}40`, color: CATEGORY_COLORS[selected.category] }}>{selected.category}</span>
            </div>
          </div>
          <div className="glass rounded-2xl p-5">
            <p className="text-white/80 leading-relaxed text-sm">{selected.text}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      <ModuleHeader title="Новостная лента" onBack={onBack} subtitle={`${NEWS.length} новостей`} icon="Newspaper" iconColor="#f59e0b" />
      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4 pb-8">
        <div className="animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
          <div className="relative">
            <Icon name="Search" size={16} color="rgba(255,255,255,0.3)" className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input className="input-field pl-10" placeholder="Поиск по заголовку или тексту..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 animate-fade-up opacity-0 delay-100" style={{ animationFillMode: 'forwards' }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)} className={`px-4 py-2 rounded-xl text-sm font-medium flex-shrink-0 transition-all ${filter === cat ? "text-white" : "text-white/50 hover:text-white/80"}`} style={{ background: filter === cat ? 'linear-gradient(135deg, #1b6fff, #0040cc)' : 'rgba(255,255,255,0.06)', border: `1px solid ${filter === cat ? 'rgba(27,111,255,0.5)' : 'rgba(255,255,255,0.1)'}` }}>
              {cat}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map((item, i) => (
            <button key={item.id} onClick={() => setSelected(item)} className={`w-full text-left card-module animate-fade-up opacity-0`} style={{ animationDelay: `${0.1 + i * 0.05}s`, animationFillMode: 'forwards' }}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className="tag text-xs" style={{ background: `${CATEGORY_COLORS[item.category] || '#1b6fff'}20`, borderColor: `${CATEGORY_COLORS[item.category] || '#1b6fff'}40`, color: CATEGORY_COLORS[item.category] || '#1b6fff' }}>
                  {item.category}
                </span>
                {item.important && <Icon name="AlertCircle" size={16} color="#ef4444" />}
              </div>
              <h3 className="text-sm font-semibold text-white mb-1 leading-snug">{item.title}</h3>
              <p className="text-xs text-white/50 line-clamp-2 mb-2">{item.text}</p>
              <div className="flex items-center gap-3 text-xs text-white/30">
                <span className="flex items-center gap-1"><Icon name="User" size={11} />{item.author}</span>
                <span className="flex items-center gap-1"><Icon name="Calendar" size={11} />{item.date}</span>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-white/30">
              <Icon name="Search" size={32} color="rgba(255,255,255,0.2)" className="mx-auto mb-3" />
              <p>Ничего не найдено</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
