import { useState, useMemo, useRef } from "react";
import Icon from "@/components/ui/icon";
import ModuleHeader from "@/components/ModuleHeader";
import AdminBlockButton from "@/components/AdminBlockButton";
import { useApp } from "@/context/AppContext";

interface Props { onBack: () => void; }

interface DocFiles {
  pdf?: string;
  docx?: string;
  xlsx?: string;
}

interface DocItem {
  id: number;
  name: string;
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
  files: DocFiles;
}

const FORMAT_META: Record<keyof DocFiles, { label: string; ext: string; icon: string; color: string }> = {
  pdf: { label: "PDF", ext: ".pdf", icon: "FileText", color: "#ef4444" },
  docx: { label: "Word", ext: ".docx", icon: "FileType", color: "#3b82f6" },
  xlsx: { label: "Excel", ext: ".xlsx", icon: "Table", color: "#10b981" },
};

const DIRECTIONS = ["Все", "Входящий", "Исходящий", "Внутренний"];

const DOC_PRICE_YEAR = 4999;
const DOC_PRICE_MONTH = 700;

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
  { id: 1, name: "Договор поставки №245-2026", category: "Договоры", direction: "Входящий", dept: "Отдел закупок", date: "01.06.2026", size: "1.2 МБ", ownerId: 4, ownerName: "Мария Иванова", paid: false, price: 0, content: SAMPLE_TEXT, files: { pdf: "dogovor_245.pdf", docx: "dogovor_245.docx" } },
  { id: 2, name: "Акт приёмки-передачи оборудования", category: "Акты", direction: "Внутренний", dept: "Склад", date: "30.05.2026", size: "340 КБ", ownerId: 4, ownerName: "Мария Иванова", paid: false, price: 0, content: SAMPLE_TEXT, files: { docx: "akt_priemki.docx", xlsx: "akt_priemki.xlsx" } },
  { id: 3, name: "Шаблон приказа о назначении ответственных", category: "Приказы", direction: "Внутренний", dept: "Руководство", date: "28.05.2026", size: "450 КБ", ownerId: 4, ownerName: "Мария Иванова", paid: true, price: 500, content: SAMPLE_TEXT, files: { pdf: "prikaz.pdf", docx: "prikaz.docx", xlsx: "prikaz.xlsx" } },
  { id: 4, name: "Инструкция по охране труда 2024", category: "Инструкции", direction: "Внутренний", dept: "ОТиТБ", date: "25.05.2026", size: "2.1 МБ", ownerId: 4, ownerName: "Мария Иванова", paid: true, price: 1200, content: SAMPLE_TEXT, files: { pdf: "instrukciya_ot.pdf" } },
];

type ViewMode = "list" | "viewer" | "add" | "cabinet" | "request" | "requisites" | "payment";

function primaryFormat(files: DocFiles): keyof DocFiles {
  if (files.pdf) return "pdf";
  if (files.docx) return "docx";
  if (files.xlsx) return "xlsx";
  return "pdf";
}

export default function DocumentsModule({ onBack }: Props) {
  const { currentUser, hasRole, isAdmin, categories, addRoleRequest, roleRequests, payForRole, roleGrants, bumpStat, isContentBlocked, purchaseDoc, isDocPurchased } = useApp();
  const CATEGORIES = ["Все", ...(categories.documents || [])];

  const [docs, setDocs] = useState<DocItem[]>(INITIAL_DOCS);
  const [catFilter, setCatFilter] = useState("Все");
  const [dirFilter, setDirFilter] = useState("Все");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("list");
  const [selected, setSelected] = useState<DocItem | null>(null);
  const [editing, setEditing] = useState<DocItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [requisites, setRequisites] = useState({ inn: "", account: "", bank: "", card: "", bic: "", qrUrl: "" });
  const [addForm, setAddForm] = useState({ name: "", category: (categories.documents || [])[0] || "Договоры", direction: "Внутренний", paid: false, price: "", content: "", files: {} as DocFiles });
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [requestPhone, setRequestPhone] = useState(currentUser.phone || "");
  const [requestAgreed, setRequestAgreed] = useState(false);

  const qrRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const docxRef = useRef<HTMLInputElement>(null);
  const xlsxRef = useRef<HTMLInputElement>(null);

  const isDocumentor = isAdmin || hasRole("documentor");
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  // Заявка и срок подписки документоведа
  const myDocRequest = roleRequests.filter(r => r.userId === currentUser.id && r.role === "documentor").slice(-1)[0];
  const myGrant = roleGrants.find(g => g.userId === currentUser.id && g.role === "documentor");

  const daysLeft = useMemo(() => {
    if (!myGrant) return null;
    const [d, m, y] = myGrant.validUntil.split(".").map(Number);
    const end = new Date(y, m - 1, d).getTime();
    const diff = Math.ceil((end - Date.now()) / (24 * 3600 * 1000));
    return diff;
  }, [myGrant]);
  const subscriptionActive = isAdmin || (daysLeft !== null && daysLeft > 0);

  const myDocs = useMemo(() => docs.filter(d => d.ownerId === currentUser.id), [docs, currentUser.id]);

  // В общий поток попадают документы только тех документоведов, у кого активна подписка.
  // У владельца с истёкшей подпиской документы остаются в кабинете, но скрыты из ленты.
  const ownerSubscriptionActive = (ownerId: number) => {
    const u = roleGrants.find(g => g.userId === ownerId && g.role === "documentor");
    if (!u) return true; // админ / старые демо-документы публикуются по умолчанию
    const [d, m, y] = u.validUntil.split(".").map(Number);
    return new Date(y, m - 1, d).getTime() > Date.now();
  };

  const filtered = docs.filter(d =>
    (isAdmin || !isContentBlocked("document", d.id)) &&
    ownerSubscriptionActive(d.ownerId) &&
    (catFilter === "Все" || d.category === catFilter) &&
    (dirFilter === "Все" || d.direction === dirFilter) &&
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleFile = (fmt: keyof DocFiles) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setAddForm(prev => ({ ...prev, files: { ...prev.files, [fmt]: f.name } }));
    e.target.value = "";
  };
  const removeFile = (fmt: keyof DocFiles) => setAddForm(prev => { const nf = { ...prev.files }; delete nf[fmt]; return { ...prev, files: nf }; });

  const handleQr = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setRequisites(r => ({ ...r, qrUrl: reader.result as string }));
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  const saveDoc = () => {
    if (!addForm.name.trim()) return;
    const files = Object.keys(addForm.files).length ? addForm.files : { pdf: `${addForm.name}.pdf` };
    if (editing) {
      setDocs(prev => prev.map(d => d.id === editing.id ? { ...d, name: addForm.name, category: addForm.category, direction: addForm.direction, paid: addForm.paid, price: addForm.paid ? Number(addForm.price) || 0 : 0, content: addForm.content || d.content, files } : d));
      showToast("✅ Документ обновлён");
    } else {
      setDocs(prev => [{ id: Date.now(), name: addForm.name, category: addForm.category, direction: addForm.direction, dept: currentUser.name, date: new Date().toLocaleDateString("ru-RU"), size: "—", ownerId: currentUser.id, ownerName: currentUser.name, paid: addForm.paid, price: addForm.paid ? Number(addForm.price) || 0 : 0, content: addForm.content || SAMPLE_TEXT, files }, ...prev]);
      bumpStat("documents", 1);
      showToast("✅ Документ опубликован");
    }
    setAddForm({ name: "", category: (categories.documents || [])[0] || "Договоры", direction: "Внутренний", paid: false, price: "", content: "", files: {} });
    setEditing(null);
    setView("cabinet");
  };

  const deleteDoc = (id: number) => { setDocs(prev => prev.filter(d => d.id !== id)); bumpStat("documents", -1); showToast("🗑️ Удалено"); };
  const startEdit = (d: DocItem) => { setEditing(d); setAddForm({ name: d.name, category: d.category, direction: d.direction, paid: d.paid, price: String(d.price), content: d.content, files: { ...d.files } }); setView("add"); };

  const ownerRequisites = (ownerId: number) => {
    // В демо реквизиты хранятся локально только у текущего пользователя; для остальных — заглушка владельца
    if (ownerId === currentUser.id) return requisites;
    return { inn: "", account: "40817810099910004321", bank: "ПАО Сбербанк", card: "", bic: "044525225", qrUrl: "" };
  };

  // ── REQUEST ROLE ──
  if (view === "request") {
    const phoneDigits = requestPhone.replace(/\D/g, "");
    const canSubmit = phoneDigits.length >= 10 && requestAgreed;
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        {toast && <Toast msg={toast} />}
        <ModuleHeader title="Стать документоведом" onBack={() => setView("list")} />
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-8 space-y-5">
          <div className="text-center space-y-3">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}><Icon name="FolderOpen" size={36} color="#10b981" /></div>
            <div><h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Роль документоведа</h2><p className="text-white/50 text-sm leading-relaxed">Получите право публиковать документы — бесплатные и платные — и зарабатывать на продаже шаблонов.</p></div>
          </div>
          <div className="glass rounded-2xl p-4 text-left space-y-2.5">
            {["Добавлять документы в каталог", "Платные и бесплатные документы", "Личный кабинет с реквизитами", "Управление своими документами"].map((item, i) => (
              <div key={i} className="flex items-center gap-3"><div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.2)' }}><Icon name="Check" size={11} color="#10b981" /></div><span className="text-sm text-white/70">{item}</span></div>
            ))}
          </div>

          {/* Стоимость */}
          <div className="glass rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.15)' }}><Icon name="Wallet" size={20} color="#10b981" /></div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Стоимость роли</p>
              <p className="text-xs text-white/40">Оплата после одобрения заявки</p>
            </div>
            <div className="text-right"><p className="text-base font-bold text-green-400">{DOC_PRICE_YEAR.toLocaleString("ru-RU")} ₽/год</p><p className="text-xs text-white/40">или {DOC_PRICE_MONTH} ₽/мес</p></div>
          </div>

          {/* Телефон */}
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Номер телефона для обратной связи *</label>
            <input className="input-field" type="tel" placeholder="+7 (___) ___-__-__" value={requestPhone} onChange={e => setRequestPhone(e.target.value)} />
          </div>

          {/* Юридическая инструкция */}
          <div className="glass rounded-2xl p-4 flex items-start gap-3" style={{ border: '1px solid rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.08)' }}>
            <Icon name="Info" size={16} color="#f59e0b" className="flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-200/80 leading-relaxed">Администрация рассматривает заявку и принимает решение об одобрении или отказе по собственному усмотрению. Решение администрации окончательно и не требует пояснений.</p>
          </div>

          {/* Чекбокс согласия */}
          <button type="button" onClick={() => setRequestAgreed(a => !a)} className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all" style={{ background: requestAgreed ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)', border: requestAgreed ? '1px solid rgba(16,185,129,0.35)' : '1px solid rgba(255,255,255,0.1)' }}>
            <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: requestAgreed ? '#10b981' : 'transparent', border: requestAgreed ? 'none' : '1px solid rgba(255,255,255,0.25)' }}>{requestAgreed && <Icon name="Check" size={12} color="white" />}</div>
            <span className="text-sm text-white/80">Я ознакомлен и согласен с правилами подачи заявки</span>
          </button>

          <button className="btn-primary flex items-center justify-center gap-2 disabled:opacity-40" disabled={!canSubmit} onClick={() => { addRoleRequest("documentor", requestPhone, true); showToast("📩 Заявка отправлена администратору"); setRequestAgreed(false); setView("list"); }} style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}><Icon name="Send" size={18} />Отправить заявку</button>
        </div>
      </div>
    );
  }

  // ── PAYMENT (after approval) ──
  if (view === "payment") {
    if (!myDocRequest || myDocRequest.status !== "approved" || myDocRequest.paid) {
      return (
        <div className="min-h-screen relative z-10 animate-fade-in">
          {toast && <Toast msg={toast} />}
          <ModuleHeader title="Оплата роли" onBack={() => setView("list")} />
          <div className="max-w-2xl mx-auto px-4 pt-8 pb-8 text-center">
            <Icon name="Clock" size={36} color="rgba(255,255,255,0.3)" className="mx-auto mb-3" />
            <p className="text-white/50 text-sm">Оплата станет доступна после одобрения заявки администратором.</p>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        {toast && <Toast msg={toast} />}
        <ModuleHeader title="Оплата роли" onBack={() => setView("list")} icon="Wallet" iconColor="#10b981" />
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-8 space-y-4">
          <div className="glass rounded-2xl p-4 flex items-center gap-3" style={{ border: '1px solid rgba(16,185,129,0.3)' }}>
            <Icon name="CheckCircle" size={20} color="#10b981" />
            <p className="text-sm text-white/80 flex-1">Заявка одобрена. Выберите тариф и оплатите для активации доступа.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { payForRole(myDocRequest.id); showToast("✅ Оплата принята, роль активирована!"); setView("cabinet"); }} className="glass-strong rounded-2xl p-5 text-center hover:border-white/30 transition-all">
              <p className="text-xs text-white/40 uppercase tracking-wider">На год</p>
              <p className="text-2xl font-bold text-white mt-1">{DOC_PRICE_YEAR.toLocaleString("ru-RU")} ₽</p>
              <p className="text-xs text-green-400 mt-1">выгодно</p>
            </button>
            <button onClick={() => { payForRole(myDocRequest.id); showToast("✅ Оплата принята, роль активирована!"); setView("cabinet"); }} className="glass-strong rounded-2xl p-5 text-center hover:border-white/30 transition-all">
              <p className="text-xs text-white/40 uppercase tracking-wider">На месяц</p>
              <p className="text-2xl font-bold text-white mt-1">{DOC_PRICE_MONTH} ₽</p>
              <p className="text-xs text-white/40 mt-1">помесячно</p>
            </button>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: 'rgba(27,111,255,0.08)', border: '1px solid rgba(27,111,255,0.2)' }}>
            <Icon name="Info" size={14} color="#4d8fff" className="flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-200/70">После оплаты роль активируется, и вы сможете публиковать документы. Отсчёт срока подписки начинается со дня оплаты.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── REQUISITES ──
  if (view === "requisites") return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      {toast && <Toast msg={toast} />}
      <ModuleHeader title="Реквизиты для оплаты" onBack={() => setView("cabinet")} icon="CreditCard" iconColor="#10b981" />
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
        <p className="text-xs text-white/40 px-1">Эти реквизиты автоматически показываются покупателям ваших платных документов.</p>
        <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Номер счёта для оплаты</label><input className="input-field" placeholder="40817810099910004321" value={requisites.account} onChange={e => setRequisites(r => ({ ...r, account: e.target.value }))} /></div>
        <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Банк</label><input className="input-field" placeholder="Наименование банка" value={requisites.bank} onChange={e => setRequisites(r => ({ ...r, bank: e.target.value }))} /></div>
        <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">БИК</label><input className="input-field" placeholder="044525225" value={requisites.bic} onChange={e => setRequisites(r => ({ ...r, bic: e.target.value }))} /></div>
        <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">ИНН</label><input className="input-field" placeholder="0000000000" value={requisites.inn} onChange={e => setRequisites(r => ({ ...r, inn: e.target.value }))} /></div>
        <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Карта для выплат</label><input className="input-field" placeholder="0000 0000 0000 0000" value={requisites.card} onChange={e => setRequisites(r => ({ ...r, card: e.target.value }))} /></div>
        <div>
          <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">QR-код для оплаты</label>
          <input ref={qrRef} type="file" accept="image/*" className="hidden" onChange={handleQr} />
          <button onClick={() => qrRef.current?.click()} className="w-full flex flex-col items-center gap-2 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '2px dashed rgba(255,255,255,0.15)' }}>
            {requisites.qrUrl ? <img src={requisites.qrUrl} alt="QR" className="w-28 h-28 object-contain rounded-lg" /> : <Icon name="QrCode" size={28} color="rgba(255,255,255,0.3)" />}
            <span className="text-xs text-white/40">{requisites.qrUrl ? "Заменить QR-код" : "Загрузить QR-код"}</span>
          </button>
        </div>
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
        {/* Подписка */}
        {!isAdmin && (
          <div className="glass rounded-2xl p-4" style={{ border: `1px solid ${subscriptionActive ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: subscriptionActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }}><Icon name={subscriptionActive ? "CalendarCheck" : "CalendarX"} size={20} color={subscriptionActive ? "#10b981" : "#ef4444"} /></div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">Подписка документоведа</p>
                {subscriptionActive
                  ? <p className="text-xs text-white/50">Осталось <span className="text-green-400 font-semibold">{daysLeft}</span> дн. · до {myGrant?.validUntil}</p>
                  : <p className="text-xs text-red-400">Подписка истекла — документы не публикуются в общем потоке</p>}
              </div>
              {!subscriptionActive && myDocRequest && <button onClick={() => setView("payment")} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>Продлить</button>}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="glass rounded-2xl p-4 text-center"><div className="text-2xl font-bold text-white">{myDocs.length}</div><div className="text-xs text-white/40">Документов</div></div>
          <div className="glass rounded-2xl p-4 text-center"><div className="text-2xl font-bold text-green-400">{myDocs.filter(d => d.paid).reduce((s, d) => s + d.price, 0).toLocaleString("ru-RU")} ₽</div><div className="text-xs text-white/40">Потенциальный доход</div></div>
        </div>
        <button onClick={() => setView("requisites")} className="w-full flex items-center gap-3 p-4 rounded-2xl text-left" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
          <Icon name="CreditCard" size={18} color="#10b981" /><span className="text-sm font-medium text-white flex-1">Реквизиты для оплаты</span><Icon name="ChevronRight" size={16} color="rgba(255,255,255,0.3)" />
        </button>
        <button onClick={() => { setEditing(null); setView("add"); }} className="btn-primary flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}><Icon name="Plus" size={18} />Добавить документ</button>
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider px-1">Управление документами</p>
        {myDocs.map(d => {
          const fi = FORMAT_META[primaryFormat(d.files)];
          const published = ownerSubscriptionActive(d.ownerId);
          return (
            <div key={d.id} className="glass rounded-2xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${fi.color}15` }}><Icon name={fi.icon} size={18} color={fi.color} /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{d.name}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs text-white/40">{d.paid ? <span className="text-green-400">{d.price} ₽</span> : "Бесплатно"} · {d.date}</p>
                  <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: published ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: published ? '#10b981' : '#f59e0b' }}>{published ? "В потоке" : "Скрыт"}</span>
                </div>
                <div className="flex gap-1 mt-1">{(Object.keys(d.files) as (keyof DocFiles)[]).map(f => <span key={f} className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${FORMAT_META[f].color}18`, color: FORMAT_META[f].color }}>{FORMAT_META[f].label}</span>)}</div>
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
          <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Категория</label>
          <div className="flex flex-wrap gap-2">{(categories.documents || []).map(cat => <button key={cat} onClick={() => setAddForm(f => ({ ...f, category: cat }))} className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all" style={{ background: addForm.category === cat ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)', border: `1px solid ${addForm.category === cat ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}`, color: addForm.category === cat ? '#10b981' : 'rgba(255,255,255,0.5)' }}>{cat}</button>)}</div>
        </div>
        <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Содержимое документа (для просмотра)</label><textarea className="input-field resize-none" rows={5} placeholder="Текст документа для просмотра..." value={addForm.content} onChange={e => setAddForm(f => ({ ...f, content: e.target.value }))} /></div>

        {/* Загрузка форматов */}
        <div>
          <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Файлы документа (можно загрузить все три формата или часть)</label>
          <input ref={pdfRef} type="file" accept=".pdf" className="hidden" onChange={handleFile("pdf")} />
          <input ref={docxRef} type="file" accept=".doc,.docx" className="hidden" onChange={handleFile("docx")} />
          <input ref={xlsxRef} type="file" accept=".xls,.xlsx" className="hidden" onChange={handleFile("xlsx")} />
          <div className="space-y-2">
            {(["pdf", "docx", "xlsx"] as (keyof DocFiles)[]).map(fmt => {
              const meta = FORMAT_META[fmt];
              const ref = fmt === "pdf" ? pdfRef : fmt === "docx" ? docxRef : xlsxRef;
              const val = addForm.files[fmt];
              return (
                <div key={fmt} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: val ? `${meta.color}10` : 'rgba(255,255,255,0.04)', border: `1px solid ${val ? `${meta.color}40` : 'rgba(255,255,255,0.1)'}` }}>
                  <Icon name={meta.icon} size={18} color={val ? meta.color : "rgba(255,255,255,0.4)"} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{meta.label} <span className="text-xs text-white/30">({meta.ext})</span></p>
                    {val && <p className="text-xs truncate" style={{ color: meta.color }}>✓ {val}</p>}
                  </div>
                  {val
                    ? <button onClick={() => removeFile(fmt)} className="p-1.5 rounded-lg hover:bg-white/10"><Icon name="X" size={15} color="rgba(255,255,255,0.5)" /></button>
                    : <button onClick={() => ref.current?.click()} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>Загрузить</button>}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-white/30 mt-2">Все форматы хранятся как один документ. Пользователь сможет скачать любой из них.</p>
        </div>

        <button onClick={() => setAddForm(f => ({ ...f, paid: !f.paid }))} className="w-full flex items-center gap-3 p-4 rounded-xl transition-all" style={{ background: addForm.paid ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)', border: addForm.paid ? '1px solid rgba(16,185,129,0.35)' : '1px solid rgba(255,255,255,0.1)' }}>
          <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: addForm.paid ? '#10b981' : 'transparent', border: addForm.paid ? 'none' : '1px solid rgba(255,255,255,0.25)' }}>{addForm.paid && <Icon name="Check" size={12} color="white" />}</div>
          <div className="text-left"><p className="text-sm font-medium text-white">Платный документ</p><p className="text-xs text-white/40">Платно скачивание и отправка. Просмотр всегда бесплатный</p></div>
        </button>
        {addForm.paid && <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Цена, ₽</label><input className="input-field" type="number" placeholder="500" value={addForm.price} onChange={e => setAddForm(f => ({ ...f, price: e.target.value }))} /></div>}
        <button onClick={saveDoc} className="btn-primary flex items-center justify-center gap-2" disabled={!addForm.name.trim()} style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}><Icon name={editing ? "Check" : "Upload"} size={18} />{editing ? "Сохранить" : "Опубликовать"}</button>
      </div>
    </div>
  );

  // ── VIEWER ──
  if (view === "viewer" && selected) {
    const fi = FORMAT_META[primaryFormat(selected.files)];
    const isPurchased = isDocPurchased(selected.id) || !selected.paid;
    const hasPdf = !!selected.files.pdf;
    const availableFormats = (Object.keys(selected.files) as (keyof DocFiles)[]);
    const ownerReq = ownerRequisites(selected.ownerId);
    const blockSelect: React.CSSProperties = { userSelect: "none", WebkitUserSelect: "none", MozUserSelect: "none", msUserSelect: "none" };
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        {toast && <Toast msg={toast} />}
        <ModuleHeader title={selected.name} onBack={() => { setDownloadOpen(false); setView("list"); }} subtitle={selected.ownerName} />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${fi.color}15` }}><Icon name={fi.icon} size={20} color={fi.color} /></div>
            <div className="flex-1"><div className="flex gap-2"><span className="tag text-xs">{selected.category}</span><span className="tag text-xs" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>{selected.direction}</span></div></div>
            {selected.paid ? <span className="text-sm font-bold text-green-400">{selected.price} ₽</span> : <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>Бесплатно</span>}
          </div>

          {/* PDF viewer — secure (no select, no context menu) */}
          {hasPdf ? (
            <div
              className="glass rounded-2xl p-5"
              style={{ minHeight: '300px', ...blockSelect }}
              onContextMenu={e => e.preventDefault()}
              onCopy={e => e.preventDefault()}
            >
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/10">
                <Icon name="FileText" size={14} color="#ef4444" />
                <span className="text-xs text-white/40">Просмотр PDF · бесплатно для всех · копирование запрещено</span>
                <Icon name="Lock" size={12} color="rgba(255,255,255,0.3)" className="ml-auto" />
              </div>
              <pre className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed font-sans" style={{ fontFamily: 'Golos Text, sans-serif', ...blockSelect }}>{selected.content}</pre>
            </div>
          ) : (
            <div className="glass rounded-2xl p-5 flex items-start gap-3" style={{ border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)' }}>
              <Icon name="AlertTriangle" size={18} color="#f59e0b" className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-200">PDF-версия недоступна</p>
                <p className="text-xs text-yellow-200/70 mt-1">Для этого документа загружены только форматы: {availableFormats.map(f => FORMAT_META[f].label).join(", ")}. Просмотр внутри приложения недоступен — скачайте файл.</p>
              </div>
            </div>
          )}

          {/* Download / send actions */}
          <div className="glass rounded-2xl p-4">
            {selected.paid && !isPurchased ? (
              <>
                <div className="flex items-center gap-2 mb-3"><Icon name="Lock" size={15} color="#f59e0b" /><p className="text-sm text-white/70">Для скачивания и отправки нужна оплата</p></div>
                {/* Реквизиты документоведа */}
                <div className="rounded-xl p-3 mb-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Реквизиты для оплаты</p>
                  <div className="space-y-1 text-xs text-white/60">
                    {ownerReq.account && <p>Счёт: <span className="text-white/80">{ownerReq.account}</span></p>}
                    {ownerReq.bank && <p>Банк: <span className="text-white/80">{ownerReq.bank}</span></p>}
                    {ownerReq.bic && <p>БИК: <span className="text-white/80">{ownerReq.bic}</span></p>}
                    {ownerReq.card && <p>Карта: <span className="text-white/80">{ownerReq.card}</span></p>}
                  </div>
                  {ownerReq.qrUrl && <img src={ownerReq.qrUrl} alt="QR" className="w-24 h-24 object-contain rounded-lg mt-2" />}
                </div>
                <button onClick={() => { purchaseDoc(selected.id); showToast(`✅ Оплачено ${selected.price} ₽. Документ всегда будет доступен вам.`); }} className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}><Icon name="CreditCard" size={16} />Купить за {selected.price} ₽</button>
              </>
            ) : (
              <div className="space-y-2">
                {selected.paid && isPurchased && <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-1" style={{ background: 'rgba(16,185,129,0.1)' }}><Icon name="CheckCircle" size={14} color="#10b981" /><span className="text-xs text-green-400">Документ оплачен — доступен всегда без повторной покупки</span></div>}
                {/* Скачивание в любом из форматов */}
                <div className="relative">
                  <button onClick={() => setDownloadOpen(o => !o)} className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' }}>
                    <Icon name="Download" size={15} />Скачать <Icon name={downloadOpen ? "ChevronUp" : "ChevronDown"} size={14} />
                  </button>
                  {downloadOpen && (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {(["pdf", "docx", "xlsx"] as (keyof DocFiles)[]).map(fmt => {
                        const meta = FORMAT_META[fmt];
                        const avail = !!selected.files[fmt];
                        return (
                          <button key={fmt} disabled={!avail} onClick={() => { setDownloadOpen(false); showToast(`📥 Скачивание ${meta.label} (${selected.files[fmt]})`); }} className="py-2.5 rounded-xl text-xs font-medium flex flex-col items-center gap-1 disabled:opacity-30" style={{ background: avail ? `${meta.color}15` : 'rgba(255,255,255,0.04)', border: `1px solid ${avail ? `${meta.color}40` : 'rgba(255,255,255,0.08)'}`, color: avail ? meta.color : 'rgba(255,255,255,0.4)' }}>
                            <Icon name={meta.icon} size={16} color={avail ? meta.color : 'rgba(255,255,255,0.4)'} />{meta.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEmailInput(""); setEmailModal(true); }} className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}><Icon name="Mail" size={15} />Отправить</button>
                  <button onClick={() => { window.print(); }} className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}><Icon name="Printer" size={15} />Печать</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Email modal */}
        {emailModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setEmailModal(false)}>
            <div className="w-full max-w-md mx-4 mb-4 sm:mb-0 glass-strong rounded-3xl p-6 animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.2)' }}><Icon name="Mail" size={16} color="#10b981" /></div>
                <h3 className="text-base font-bold text-white">Отправить документ</h3>
              </div>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Электронная почта получателя</label>
              <input className="input-field mb-4" type="email" placeholder="example@mail.ru" value={emailInput} onChange={e => setEmailInput(e.target.value)} autoFocus onKeyDown={e => { if (e.key === "Enter" && emailInput.includes("@")) { setEmailModal(false); showToast(`✉️ Документ отправлен на ${emailInput}`); } }} />
              <div className="flex gap-2">
                <button onClick={() => setEmailModal(false)} className="btn-ghost flex-1 text-sm">Отмена</button>
                <button onClick={() => { setEmailModal(false); showToast(`✉️ Документ отправлен на ${emailInput}`); }} disabled={!emailInput.includes("@")} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2 disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}><Icon name="Send" size={15} />Отправить</button>
              </div>
            </div>
          </div>
        )}
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
          ) : myDocRequest && myDocRequest.status === "approved" && !myDocRequest.paid ? (
            <button onClick={() => setView("payment")} className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-left" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.4)' }}>
              <Icon name="Wallet" size={16} color="#10b981" /><span className="text-sm font-medium text-white flex-1">Заявка одобрена — оплатите роль</span><Icon name="ChevronRight" size={15} color="#10b981" />
            </button>
          ) : myDocRequest && myDocRequest.status === "pending" ? (
            <div className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-left" style={{ background: 'rgba(245,158,11,0.1)', border: '1px dashed rgba(245,158,11,0.35)' }}>
              <Icon name="Clock" size={16} color="#f59e0b" /><span className="text-sm font-medium text-white flex-1">Заявка на рассмотрении администрацией</span>
            </div>
          ) : (
            <button onClick={() => { setRequestPhone(currentUser.phone || ""); setRequestAgreed(false); setView("request"); }} className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-left" style={{ background: 'rgba(16,185,129,0.1)', border: '1px dashed rgba(16,185,129,0.35)' }}>
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
          const fi = FORMAT_META[primaryFormat(doc.files)];
          return (
            <div key={doc.id} className="relative w-full glass rounded-2xl p-4 animate-fade-up opacity-0 hover:border-white/20 transition-all" style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'forwards' }}>
              <button onClick={() => { setDownloadOpen(false); setSelected(doc); setView("viewer"); }} className="w-full text-left">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${fi.color}15`, border: `1px solid ${fi.color}30` }}><Icon name={fi.icon} size={20} color={fi.color} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white leading-snug mb-1 pr-8">{doc.name}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-white/40">
                      <span className="flex items-center gap-1"><Icon name="User" size={11} />{doc.ownerName}</span>
                      <span className="flex items-center gap-1"><Icon name="Calendar" size={11} />{doc.date}</span>
                    </div>
                    <div className="flex gap-2 mt-1.5 items-center flex-wrap">
                      <span className="tag text-xs">{doc.category}</span>
                      {(Object.keys(doc.files) as (keyof DocFiles)[]).map(f => <span key={f} className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${FORMAT_META[f].color}18`, color: FORMAT_META[f].color }}>{FORMAT_META[f].label}</span>)}
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