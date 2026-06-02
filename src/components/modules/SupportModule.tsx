import { useState } from "react";
import Icon from "@/components/ui/icon";
import ModuleHeader from "@/components/ModuleHeader";

interface Props { onBack: () => void; }

type Priority = "Низкий" | "Средний" | "Высокий" | "Критический";
type TicketStatus = "Открыт" | "В работе" | "Решён" | "Закрыт";

const P_COLORS: Record<Priority, string> = { "Низкий": "#64748b", "Средний": "#f59e0b", "Высокий": "#f97316", "Критический": "#ef4444" };
const S_COLORS: Record<TicketStatus, { bg: string; text: string }> = {
  "Открыт": { bg: "rgba(59,130,246,0.15)", text: "#3b82f6" },
  "В работе": { bg: "rgba(245,158,11,0.15)", text: "#f59e0b" },
  "Решён": { bg: "rgba(16,185,129,0.15)", text: "#10b981" },
  "Закрыт": { bg: "rgba(100,116,139,0.15)", text: "#64748b" },
};

const TICKETS = [
  { id: 1, title: "Ошибка при загрузке документа PDF", desc: "При попытке загрузить файл размером более 10 МБ система выдаёт ошибку 413.", priority: "Высокий" as Priority, status: "В работе" as TicketStatus, date: "01.06.2026", comments: [
    { author: "Поддержка", text: "Приняли в работу. Проверяем сервер загрузки.", time: "1 час назад" },
  ]},
  { id: 2, title: "Не приходят уведомления о новых задачах", desc: "С 30 мая перестали приходить push-уведомления.", priority: "Средний" as Priority, status: "Открыт" as TicketStatus, date: "30.05.2026", comments: [] },
  { id: 3, title: "Запрос на добавление пользователя", desc: "Добавить нового сотрудника Петрова И.И. с ролью «Пользователь».", priority: "Низкий" as Priority, status: "Решён" as TicketStatus, date: "25.05.2026", comments: [
    { author: "Администратор", text: "Пользователь добавлен. Учётные данные направлены на почту.", time: "25.05.2026" },
  ]},
];

export default function SupportModule({ onBack }: Props) {
  const [view, setView] = useState<"list" | "create" | "ticket">("list");
  const [selected, setSelected] = useState<typeof TICKETS[0] | null>(null);
  const [form, setForm] = useState({ title: "", desc: "", priority: "Средний" as Priority });
  const [commentText, setCommentText] = useState("");

  if (view === "ticket" && selected) {
    const sc = S_COLORS[selected.status];
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        <ModuleHeader title={`Тикет #${selected.id}`} onBack={() => setView("list")} />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
          <div className="glass rounded-2xl p-4">
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs px-2 py-1 rounded-lg" style={{ background: sc.bg, color: sc.text }}>{selected.status}</span>
              <span className="text-xs font-semibold" style={{ color: P_COLORS[selected.priority] }}>● {selected.priority}</span>
            </div>
            <h2 className="text-base font-bold text-white mb-2">{selected.title}</h2>
            <p className="text-sm text-white/60">{selected.desc}</p>
            <p className="text-xs text-white/30 mt-3 flex items-center gap-1"><Icon name="Calendar" size={11} />{selected.date}</p>
          </div>
          <div className="space-y-3">
            {selected.comments.map((c, i) => (
              <div key={i} className="p-4 rounded-2xl" style={{ background: 'rgba(27,111,255,0.08)', border: '1px solid rgba(27,111,255,0.2)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white/80">{c.author}</span>
                  <span className="text-xs text-white/30">{c.time}</span>
                </div>
                <p className="text-sm text-white/70">{c.text}</p>
              </div>
            ))}
            {selected.comments.length === 0 && <p className="text-center text-white/30 text-sm py-4">Пока нет ответов от поддержки</p>}
          </div>
          <div className="flex gap-2">
            <input className="input-field flex-1 text-sm py-3" placeholder="Добавить комментарий..." value={commentText} onChange={e => setCommentText(e.target.value)} />
            <button className="p-3 rounded-xl flex-shrink-0" style={{ background: 'rgba(27,111,255,0.25)', border: '1px solid rgba(27,111,255,0.3)' }}>
              <Icon name="Send" size={18} color="white" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === "create") {
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        <ModuleHeader title="Новый тикет" onBack={() => setView("list")} />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Тема обращения</label>
            <input className="input-field" placeholder="Кратко опишите проблему..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Описание</label>
            <textarea className="input-field resize-none" rows={5} placeholder="Подробно опишите проблему, шаги воспроизведения, ожидаемый и фактический результат..." value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Приоритет</label>
            <div className="grid grid-cols-4 gap-2">
              {(["Низкий", "Средний", "Высокий", "Критический"] as Priority[]).map(p => (
                <button key={p} onClick={() => setForm(f => ({ ...f, priority: p }))} className="py-2.5 px-2 rounded-xl text-xs font-semibold transition-all" style={{ background: form.priority === p ? `${P_COLORS[p]}25` : 'rgba(255,255,255,0.05)', border: `1px solid ${form.priority === p ? P_COLORS[p] : 'rgba(255,255,255,0.1)'}`, color: form.priority === p ? P_COLORS[p] : 'rgba(255,255,255,0.5)' }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)' }}>
            <Icon name="Paperclip" size={18} color="rgba(255,255,255,0.4)" />
            <span className="text-sm text-white/40">Прикрепить скриншот или файл</span>
          </div>
          <button className="btn-primary flex items-center justify-center gap-2" disabled={!form.title || !form.desc}>
            <Icon name="Send" size={18} />Отправить обращение
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      <ModuleHeader title="Тех. поддержка" onBack={onBack} icon="LifeBuoy" iconColor="#ec4899" />
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
        <button onClick={() => setView("create")} className="btn-primary flex items-center justify-center gap-2 animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
          <Icon name="Plus" size={18} />Создать обращение
        </button>
        <div className="space-y-3">
          {TICKETS.map((t, i) => {
            const sc = S_COLORS[t.status];
            return (
              <button key={t.id} onClick={() => { setSelected(t); setView("ticket"); }} className={`w-full text-left card-module animate-fade-up opacity-0`} style={{ animationDelay: `${0.05 + i * 0.07}s`, animationFillMode: 'forwards' }}>
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs px-2 py-1 rounded-lg font-medium" style={{ background: sc.bg, color: sc.text }}>{t.status}</span>
                  <span className="text-xs font-semibold" style={{ color: P_COLORS[t.priority] }}>● {t.priority}</span>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1 leading-snug">{t.title}</h3>
                <p className="text-xs text-white/40 line-clamp-2 mb-2">{t.desc}</p>
                <div className="flex items-center justify-between text-xs text-white/30">
                  <span className="flex items-center gap-1"><Icon name="Calendar" size={11} />{t.date}</span>
                  <span className="flex items-center gap-1"><Icon name="MessageCircle" size={11} />{t.comments.length} ответов</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
