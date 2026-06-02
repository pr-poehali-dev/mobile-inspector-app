import { useState } from "react";
import Icon from "@/components/ui/icon";
import ModuleHeader from "@/components/ModuleHeader";

interface Props { onBack: () => void; }

interface CheckItem { id: number; text: string; done: boolean; }
interface Checklist { id: number; title: string; items: CheckItem[]; template?: boolean; }

const TEMPLATES: Checklist[] = [
  { id: 1, title: "Оформление заявки", template: true, items: [
    { id: 1, text: "Заполнить форму заявки", done: false },
    { id: 2, text: "Приложить сопроводительные документы", done: false },
    { id: 3, text: "Согласовать с руководителем", done: false },
    { id: 4, text: "Отправить в бухгалтерию", done: false },
  ]},
  { id: 2, title: "Проверка сервера", template: true, items: [
    { id: 1, text: "Проверить дисковое пространство", done: true },
    { id: 2, text: "Обновить антивирусные базы", done: true },
    { id: 3, text: "Проверить журналы ошибок", done: false },
    { id: 4, text: "Создать резервную копию", done: false },
    { id: 5, text: "Проверить сетевые настройки", done: false },
  ]},
];

export default function ChecklistModule({ onBack }: Props) {
  const [lists, setLists] = useState<Checklist[]>(TEMPLATES);
  const [selectedId, setSelectedId] = useState<number | null>(1);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newItem, setNewItem] = useState("");

  const selected = lists.find(l => l.id === selectedId);

  const toggleItem = (listId: number, itemId: number) => {
    setLists(prev => prev.map(l => l.id !== listId ? l : {
      ...l,
      items: l.items.map(it => it.id === itemId ? { ...it, done: !it.done } : it)
    }));
  };

  const addItem = () => {
    if (!newItem.trim() || !selectedId) return;
    setLists(prev => prev.map(l => l.id !== selectedId ? l : {
      ...l,
      items: [...l.items, { id: Date.now(), text: newItem, done: false }]
    }));
    setNewItem("");
  };

  const createList = () => {
    if (!newTitle.trim()) return;
    const newList: Checklist = { id: Date.now(), title: newTitle, items: [] };
    setLists(prev => [...prev, newList]);
    setSelectedId(newList.id);
    setNewTitle("");
    setCreating(false);
  };

  const getProgress = (list: Checklist) => {
    if (!list.items.length) return 0;
    return Math.round((list.items.filter(i => i.done).length / list.items.length) * 100);
  };

  return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      <ModuleHeader title="Чек-листы" onBack={onBack} icon="CheckSquare" iconColor="#06b6d4" />
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
        {/* List selector */}
        <div className="flex gap-2 overflow-x-auto pb-1 animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
          {lists.map(l => {
            const prog = getProgress(l);
            return (
              <button key={l.id} onClick={() => setSelectedId(l.id)} className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${selectedId === l.id ? "text-white" : "text-white/50 hover:text-white/80"}`} style={{ background: selectedId === l.id ? 'linear-gradient(135deg, #06b6d4, #0891b2)' : 'rgba(255,255,255,0.06)', border: `1px solid ${selectedId === l.id ? 'rgba(6,182,212,0.5)' : 'rgba(255,255,255,0.1)'}` }}>
                {l.title}
                {l.template && <span className="text-xs opacity-60">шаблон</span>}
                <span className="text-xs opacity-70 ml-1">{prog}%</span>
              </button>
            );
          })}
          <button onClick={() => setCreating(true)} className="flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 transition-all flex items-center gap-1.5" style={{ background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)' }}>
            <Icon name="Plus" size={14} />Новый
          </button>
        </div>

        {creating && (
          <div className="glass rounded-2xl p-4 animate-scale-in space-y-3">
            <input className="input-field" placeholder="Название чек-листа..." value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && createList()} autoFocus />
            <div className="flex gap-2">
              <button onClick={() => setCreating(false)} className="btn-ghost flex-1 text-sm">Отмена</button>
              <button onClick={createList} className="btn-primary flex-1 text-sm flex items-center justify-center gap-1"><Icon name="Plus" size={15} />Создать</button>
            </div>
          </div>
        )}

        {selected && (
          <div className="animate-fade-up opacity-0 delay-100" style={{ animationFillMode: 'forwards' }}>
            {/* Progress */}
            <div className="glass rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-white">{selected.title}</h2>
                <span className="text-2xl font-bold text-cyan-400">{getProgress(selected)}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${getProgress(selected)}%`, background: 'linear-gradient(90deg, #06b6d4, #0ea5e9)' }} />
              </div>
              <div className="flex justify-between mt-2 text-xs text-white/40">
                <span>{selected.items.filter(i => i.done).length} выполнено</span>
                <span>{selected.items.filter(i => !i.done).length} осталось</span>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2 mb-4">
              {selected.items.map(item => (
                <button key={item.id} onClick={() => toggleItem(selected.id, item.id)} className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all hover:bg-white/5" style={{ background: item.done ? 'rgba(6,182,212,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${item.done ? 'rgba(6,182,212,0.25)' : 'rgba(255,255,255,0.08)'}` }}>
                  <div className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center transition-all ${item.done ? "glow-sm" : "border border-white/25"}`} style={{ background: item.done ? 'linear-gradient(135deg, #06b6d4, #0891b2)' : 'transparent' }}>
                    {item.done && <Icon name="Check" size={12} color="white" />}
                  </div>
                  <span className={`text-sm flex-1 transition-all ${item.done ? "text-white/40 line-through" : "text-white/80"}`}>{item.text}</span>
                </button>
              ))}
            </div>

            {/* Add item */}
            <div className="flex gap-2">
              <input className="input-field text-sm py-3 flex-1" placeholder="Добавить пункт..." value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === "Enter" && addItem()} />
              <button onClick={addItem} className="p-3 rounded-xl flex-shrink-0" style={{ background: 'rgba(6,182,212,0.25)', border: '1px solid rgba(6,182,212,0.3)' }}>
                <Icon name="Plus" size={18} color="#06b6d4" />
              </button>
            </div>

            <button className="w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-white/60 hover:text-white transition-colors hover:bg-white/10 border border-white/10">
              <Icon name="Download" size={15} />Экспорт в PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
