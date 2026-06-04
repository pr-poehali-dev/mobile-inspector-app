import { useState, useMemo } from "react";
import Icon from "@/components/ui/icon";
import ModuleHeader from "@/components/ModuleHeader";
import AdminBlockButton from "@/components/AdminBlockButton";
import { useApp } from "@/context/AppContext";

interface Props { onBack: () => void; }

interface DocItem {
  id: number;
  name: string;
  type: string;
  category: string;
  direction: string;
  dept: string;
  date: string;
  size: string;
  ownerId: number;
  ownerName: string;
  paid: boolean;
  price: number;
  content: string;
}

const FILE_ICONS: Record<string, { icon: string; color: string }> = {
  PDF: { icon: "FileText", color: "#ef4444" },
  DOCX: { icon: "FileType", color: "#3b82f6" },
  XLSX: { icon: "Table", color: "#10b981" },
};

const DIRECTIONS = ["Все", "Входящий", "Исходящий", "Внутренний"];

const SAMPLE_TEXT = `Настоящий документ является примером содержимого, доступного для просмотра внутри приложения всем пользователям бесплатно.

1. ОБЩИЕ ПОЛОЖЕНИЯ
1.1. Документ составлен в соответствии с действующим законодательством Российской Федерации.
1.2. Все стороны обязуются соблюдать условия настоящего документа.

2. ПРЕДМЕТ
2.1. Предметом является регулирование отношений между сторонами.
2.2. Условия согласованы и приняты обеими сторонами.

3. ОТВЕТСТВЕННОСТЬ СТОРОН
3.1. Стороны несут ответственность в соответствии с законодательством РФ.

4. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ
4.1. Документ вступает в силу с момента подписания.
4.2. Все изменения оформляются дополнительными соглашениями.`;

const INITIAL_DOCS: DocItem[] = [
  { id: 1, name: "Договор поставки №245-2026", type: "PDF", category: "Договоры", direction: "Входящий", dept: "Отдел закупок", date: "01.06.2026", size: "1.2 МБ", ownerId: 4, ownerName: "Мария Иванова", paid: false, price: 0, content: SAMPLE_TEXT },
  { id: 2, name: "Акт приёмки-передачи оборудования", type: "DOCX", category: "Акты", direction: "Внутренний", dept: "Склад", date: "30.05.2026", size: "340 КБ", ownerId: 4, ownerName: "Мария Иванова", paid: false, price: 0, content: SAMPLE_TEXT },
  { id: 3, name: "Шаблон приказа о назначении ответственных", type: "PDF", category: "Приказы", direction: "Внутренний", dept: "Руководство", date: "28.05.2026", size: "450 КБ", ownerId: 4, ownerName: "Мария Иванова", paid: true, price: 500, content: SAMPLE_TEXT },
  { id: 4, name: "Инструкция по охране труда 2024", type: "PDF", category: "Инструкции", direction: "Внутренний", dept: "ОТиТБ", date: "25.05.2026", size: "2.1 МБ", ownerId: 4, ownerName: "Мария Иванова", paid: true, price: 1200, content: SAMPLE_TEXT },
];

type ViewMode = "list" | "viewer" | "add" | "cabinet" | "request" | "requisites";

export default function DocumentsModule({ onBack }: Props) {
  const { currentUser, hasRole, isAdmin, categories, addRoleRequest, bumpStat, isContentBlocked } = useApp();
  const CATEGORIES = ["Все", ...(categories.documents || [])];

  const [docs, setDocs] = useState<DocItem[]>(INITIAL_DOCS);
  const [catFilter, setCatFilter] = useState("Все");
  const [dirFilter, setDirFilter] = useState("Все");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("list");
  const [selected, setSelected] = useState<DocItem | null>(null);
  const [editing, setEditing] = useState<DocItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [purchased, setPurchased] = useState<number[]>([]);
  const [requisites, setRequisites] = useState({ inn: "", account: "", bank: "", card: "" });
  const [addForm, setAddForm] = useState({ name: "", type: "PDF", category: (categories.documents || [])[0] || "Договоры", direction: "Внутренний", paid: false, price: "", content: "" });

  const isDocumentor = isAdmin || hasRole("documentor");
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const myDocs = useMemo(() => docs.filter(d => d.ownerId === currentUser.id), [docs, currentUser.id]);
  const filtered = docs.filter(d => (isAdmin || !isContentBlocked("document", d.id)) && (catFilter === "Все" || d.category === catFilter) && (dirFilter === "Все" || d.direction === dirFilter) && d.name.toLowerCase().includes(search.toLowerCase()));

  const saveDoc = () => {
    if (!addForm.name.trim()) return;
    if (editing) {
      setDocs(prev => prev.map(d => d.id === editing.id ? { ...d, name: addForm.name, type: addForm.type, category: addForm.category, direction: addForm.direction, paid: addForm.paid, price: addForm.paid ? Number(addForm.price) || 0 : 0, content: addForm.content || d.content } : d));
      showToast("✅ Документ обновлён");
    } else {
      setDocs(prev => [{ id: Date.now(), name: addForm.name, type: addForm.type, category: addForm.category, direction: addForm.direction, dept: currentUser.name, date: new Date().toLocaleDateString("ru-RU"), size: "—", ownerId: currentUser.id, ownerName: currentUser.name, paid: addForm.paid, price: addForm.paid ? Number(addForm.price) || 0 : 0, content: addForm.content || SAMPLE_TEXT }, ...prev]);
      bumpStat("documents", 1);
      showToast("✅ Документ опубликован");
    }
    setAddForm({ name: "", type: "PDF", category: (categories.documents || [])[0] || "Договоры", direction: "Внутренний", paid: false, price: "", content: "" });
    setEditing(null);
    setView("cabinet");
  };

  const deleteDoc = (id: number) => { setDocs(prev => prev.filter(d => d.id !== id)); bumpStat("documents", -1); showToast("🗑️ Удалено"); };
  const startEdit = (d: DocItem) => { setEditing(d); setAddForm({ name: d.name, type: d.type, category: d.category, direction: d.direction, paid: d.paid, price: String(d.price), content: d.content }); setView("add"); };

  // ── REQUEST ROLE ──
  if (view === "request") return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      {toast && <Toast msg={toast} />}
      <ModuleHeader title="Стать документоведом" onBack={() => setView("list")} />
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-8 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}><Icon name="FolderOpen" size={36} color="#10b981" /></div>
        <div><h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Роль документоведа</h2><p className="text-white/50 text-sm leading-relaxed">Получите право публиковать документы — бесплатные и платные — и зарабатывать на продаже шаблонов.</p></div>
        <div className="glass rounded-2xl p-4 text-left space-y-2.5">
          {["Добавлять документы в каталог", "Платные и бесплатные документы", "Личный кабинет с реквизитами", "Управление своими документами"].map((item, i) => (
            <div key={i} className="flex items-center gap-3"><div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.2)' }}><Icon name="Check" size={11} color="#10b981" /></div><span className="text-sm text-white/70">{item}</span></div>
          ))}
        </div>
        <button className="btn-primary flex items-center justify-center gap-2" onClick={() => { addRoleRequest("documentor"); showToast("📩 Заявка отправлена администратору"); setView("list"); }} style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}><Icon name="Send" size={18} />Отправить заявку</button>
      </div>
    </div>
  );

  // ── REQUISITES ──
  if (view === "requisites") return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      {toast && <Toast msg={toast} />}
      <ModuleHeader title="Реквизиты для оплаты" onBack={() => setView("cabinet")} icon="CreditCard" iconColor="#10b981" />
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
        <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">ИНН</label><input className="input-field" placeholder="0000000000" value={requisites.inn} onChange={e => setRequisites(r => ({ ...r, inn: e.target.value }))} /></div>
        <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Расчётный счёт</label><input className="input-field" placeholder="40700000000000000000" value={requisites.account} onChange={e => setRequisites(r => ({ ...r, account: e.target.value }))} /></div>
        <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Банк</label><input className="input-field" placeholder="Наименование банка" value={requisites.bank} onChange={e => setRequisites(r => ({ ...r, bank: e.target.value }))} /></div>
        <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Карта для выплат</label><input className="input-field" placeholder="0000 0000 0000 0000" value={requisites.card} onChange={e => setRequisites(r => ({ ...r, card: e.target.value }))} /></div>
        <button onClick={() => { showToast("✅ Реквизиты сохранены"); setView("cabinet"); }} className="btn-primary flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}><Icon name="Check" size={18} />Сохранить реквизиты</button>
      </div>
    </div>
  );

  // ── CABINET ──
  if (view === "cabinet") return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      {toast && <Toast msg={toast} />}
      <ModuleHeader title="Кабинет документоведа" onBack={() => setView("list")} icon="FolderOpen" iconColor="#10b981" subtitle={`${myDocs.length} документов`} />
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="glass rounded-2xl p-4 text-center"><div className="text-2xl font-bold text-white">{myDocs.length}</div><div className="text-xs text-white/40">Документов</div></div>
          <div className="glass rounded-2xl p-4 text-center"><div className="text-2xl font-bold text-green-400">{myDocs.filter(d => d.paid).reduce((s, d) => s + d.price, 0).toLocaleString("ru-RU")} ₽</div><div className="text-xs text-white/40">Потенциальный доход</div></div>
        </div>
        <button onClick={() => setView("requisites")} className="w-full flex items-center gap-3 p-4 rounded-2xl text-left" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
          <Icon name="CreditCard" size={18} color="#10b981" /><span className="text-sm font-medium text-white flex-1">Реквизиты для оплаты</span><Icon name="ChevronRight" size={16} color="rgba(255,255,255,0.3)" />
        </button>
        <button onClick={() => { setEditing(null); setView("add"); }} className="btn-primary flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}><Icon name="Plus" size={18} />Добавить документ</button>
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider px-1">Мои документы</p>
        {myDocs.map(d => {
          const fi = FILE_ICONS[d.type] || { icon: "File", color: "#94a3b8" };
          return (
            <div key={d.id} className="glass rounded-2xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${fi.color}15` }}><Icon name={fi.icon} size={18} color={fi.color} /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{d.name}</p>
                <p className="text-xs text-white/40">{d.paid ? <span className="text-green-400">{d.price} ₽</span> : "Бесплатно"} · {d.date}</p>
              </div>
              <button onClick={() => startEdit(d)} className="p-2 rounded-lg hover:bg-white/10"><Icon name="Pencil" size={15} color="rgba(255,255,255,0.6)" /></button>
              <button onClick={() => deleteDoc(d.id)} className="p-2 rounded-lg hover:bg-white/10"><Icon name="Trash2" size={15} color="rgba(239,68,68,0.7)" /></button>
            </div>
          );
        })}
        {myDocs.length === 0 && <div className="text-center py-10 text-white/30 text-sm">Вы ещё не добавили документы</div>}
      </div>
    </div>
  );

  // ── ADD/EDIT ──
  if (view === "add") return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      {toast && <Toast msg={toast} />}
      <ModuleHeader title={editing ? "Редактировать документ" : "Добавить документ"} onBack={() => { setEditing(null); setView("cabinet"); }} icon="Plus" iconColor="#10b981" />
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
        <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Название *</label><input className="input-field" placeholder="Название документа..." value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} /></div>
        <div>
          <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Тип файла</label>
          <div className="flex gap-2">{["PDF", "DOCX", "XLSX"].map(tp => <button key={tp} onClick={() => setAddForm(f => ({ ...f, type: tp }))} className="flex-1 py-2 rounded-xl text-xs font-medium transition-all" style={{ background: addForm.type === tp ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)', border: `1px solid ${addForm.type === tp ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}`, color: addForm.type === tp ? '#10b981' : 'rgba(255,255,255,0.5)' }}>{tp}</button>)}</div>
        </div>
        <div>
          <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Категория</label>
          <div className="flex flex-wrap gap-2">{(categories.documents || []).map(cat => <button key={cat} onClick={() => setAddForm(f => ({ ...f, category: cat }))} className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all" style={{ background: addForm.category === cat ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)', border: `1px solid ${addForm.category === cat ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}`, color: addForm.category === cat ? '#10b981' : 'rgba(255,255,255,0.5)' }}>{cat}</button>)}</div>
        </div>
        <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Содержимое документа</label><textarea className="input-field resize-none" rows={5} placeholder="Текст документа для просмотра..." value={addForm.content} onChange={e => setAddForm(f => ({ ...f, content: e.target.value }))} /></div>
        <button onClick={() => setAddForm(f => ({ ...f, paid: !f.paid }))} className="w-full flex items-center gap-3 p-4 rounded-xl transition-all" style={{ background: addForm.paid ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)', border: addForm.paid ? '1px solid rgba(16,185,129,0.35)' : '1px solid rgba(255,255,255,0.1)' }}>
          <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: addForm.paid ? '#10b981' : 'transparent', border: addForm.paid ? 'none' : '1px solid rgba(255,255,255,0.25)' }}>{addForm.paid && <Icon name="Check" size={12} color="white" />}</div>
          <div className="text-left"><p className="text-sm font-medium text-white">Платный документ</p><p className="text-xs text-white/40">Платно скачивание и отправка. Просмотр всегда бесплатный</p></div>
        </button>
        {addForm.paid && <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Цена, ₽</label><input className="input-field" type="number" placeholder="500" value={addForm.price} onChange={e => setAddForm(f => ({ ...f, price: e.target.value }))} /></div>}
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)' }}><Icon name="Upload" size={18} color="rgba(255,255,255,0.4)" /><span className="text-sm text-white/40">Загрузить файл документа</span></div>
        <button onClick={saveDoc} className="btn-primary flex items-center justify-center gap-2" disabled={!addForm.name.trim()} style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}><Icon name={editing ? "Check" : "Upload"} size={18} />{editing ? "Сохранить" : "Опубликовать"}</button>
      </div>
    </div>
  );

  // ── VIEWER ──
  if (view === "viewer" && selected) {
    const fi = FILE_ICONS[selected.type] || { icon: "File", color: "#94a3b8" };
    const isPurchased = purchased.includes(selected.id) || !selected.paid;
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        {toast && <Toast msg={toast} />}
        <ModuleHeader title={selected.name} onBack={() => setView("list")} subtitle={selected.ownerName} />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${fi.color}15` }}><Icon name={fi.icon} size={20} color={fi.color} /></div>
            <div className="flex-1"><div className="flex gap-2"><span className="tag text-xs">{selected.category}</span><span className="tag text-xs" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>{selected.direction}</span></div></div>
            {selected.paid ? <span className="text-sm font-bold text-green-400">{selected.price} ₽</span> : <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>Бесплатно</span>}
          </div>

          {/* Document content — free for everyone */}
          <div className="glass rounded-2xl p-5" style={{ minHeight: '300px' }}>
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/10">
              <Icon name="Eye" size={14} color="rgba(255,255,255,0.4)" />
              <span className="text-xs text-white/40">Просмотр документа · бесплатно для всех</span>
            </div>
            <pre className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed font-sans" style={{ fontFamily: 'Golos Text, sans-serif' }}>{selected.content}</pre>
          </div>

          {/* Download / send actions */}
          <div className="glass rounded-2xl p-4">
            {selected.paid && !isPurchased ? (
              <>
                <div className="flex items-center gap-2 mb-3"><Icon name="Lock" size={15} color="#f59e0b" /><p className="text-sm text-white/70">Для скачивания и отправки нужна оплата</p></div>
                <button onClick={() => { setPurchased(prev => [...prev, selected.id]); showToast(`✅ Оплачено ${selected.price} ₽`); }} className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}><Icon name="CreditCard" size={16} />Купить за {selected.price} ₽</button>
              </>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => showToast("📥 Документ скачивается...")} className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' }}><Icon name="Download" size={15} />Скачать</button>
                <button onClick={() => showToast("✉️ Документ отправлен")} className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}><Icon name="Mail" size={15} />Отправить</button>
                <button onClick={() => { window.print(); }} className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}><Icon name="Printer" size={15} />Печать</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN LIST ──
  return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      {toast && <Toast msg={toast} />}
      <div className="glass border-b border-white/10 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/10 transition-colors flex-shrink-0"><Icon name="ArrowLeft" size={20} color="white" /></button>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)' }}><Icon name="FolderOpen" size={16} color="#10b981" /></div>
            <h1 className="text-base font-bold text-white flex-1">Документооборот</h1>
            {isDocumentor && <button onClick={() => setView("cabinet")} className="p-2 rounded-xl hover:bg-white/10 transition-colors"><Icon name="LayoutDashboard" size={18} color="#10b981" /></button>}
          </div>
          {isDocumentor ? (
            <button onClick={() => { setEditing(null); setView("add"); }} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}><Icon name="Plus" size={17} />Добавить документ</button>
          ) : (
            <button onClick={() => setView("request")} className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-left" style={{ background: 'rgba(16,185,129,0.1)', border: '1px dashed rgba(16,185,129,0.35)' }}>
              <Icon name="FolderPlus" size={16} color="#10b981" /><span className="text-sm font-medium text-white flex-1">Хотите публиковать документы?</span><Icon name="ChevronRight" size={15} color="rgba(16,185,129,0.6)" />
            </button>
          )}
          <div className="relative">
            <Icon name="Search" size={15} color="rgba(255,255,255,0.3)" className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input className="input-field pl-9 py-2.5 text-sm" placeholder="Поиск по названию..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-3 pb-8 space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map(cat => <button key={cat} onClick={() => setCatFilter(cat)} className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all" style={{ background: catFilter === cat ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.05)', border: `1px solid ${catFilter === cat ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.08)'}`, color: catFilter === cat ? '#10b981' : 'rgba(255,255,255,0.5)' }}>{cat}</button>)}
        </div>
        <div className="flex gap-2">
          {DIRECTIONS.map(dir => <button key={dir} onClick={() => setDirFilter(dir)} className="px-3 py-1.5 rounded-xl text-xs font-medium flex-shrink-0 transition-all" style={{ background: dirFilter === dir ? 'rgba(27,111,255,0.25)' : 'rgba(255,255,255,0.05)', border: `1px solid ${dirFilter === dir ? 'rgba(27,111,255,0.4)' : 'rgba(255,255,255,0.08)'}`, color: dirFilter === dir ? '#4d8fff' : 'rgba(255,255,255,0.5)' }}>{dir}</button>)}
        </div>
        {filtered.map((doc, i) => {
          const fi = FILE_ICONS[doc.type] || { icon: "File", color: "#94a3b8" };
          return (
            <div key={doc.id} className="relative w-full glass rounded-2xl p-4 animate-fade-up opacity-0 hover:border-white/20 transition-all" style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'forwards' }}>
              <button onClick={() => { setSelected(doc); setView("viewer"); }} className="w-full text-left">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${fi.color}15`, border: `1px solid ${fi.color}30` }}><Icon name={fi.icon} size={20} color={fi.color} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white leading-snug mb-1 pr-8">{doc.name}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-white/40">
                      <span className="flex items-center gap-1"><Icon name="User" size={11} />{doc.ownerName}</span>
                      <span className="flex items-center gap-1"><Icon name="Calendar" size={11} />{doc.date}</span>
                    </div>
                    <div className="flex gap-2 mt-1.5 items-center">
                      <span className="tag text-xs">{doc.category}</span>
                      {doc.paid ? <span className="text-xs px-2 py-0.5 rounded-lg font-medium" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>{doc.price} ₽</span> : <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>Бесплатно</span>}
                    </div>
                  </div>
                </div>
              </button>
              <div className="absolute top-3 right-3"><AdminBlockButton kind="document" id={doc.id} authorId={doc.ownerId} size={13} /></div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="text-center py-14"><Icon name="FolderX" size={32} color="rgba(255,255,255,0.2)" className="mx-auto mb-3" /><p className="text-white/30 text-sm">Документы не найдены</p></div>}
      </div>
    </div>
  );
}

function Toast({ msg }: { msg: string }) {
  return <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl text-sm font-medium text-white animate-fade-up" style={{ background: 'rgba(16,185,129,0.92)', backdropFilter: 'blur(12px)', animationFillMode: 'forwards' }}>{msg}</div>;
}