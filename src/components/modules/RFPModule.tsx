import { useState, useRef, useMemo } from "react";
import Icon from "@/components/ui/icon";
import ModuleHeader from "@/components/ModuleHeader";
import { useApp } from "@/context/AppContext";
import { usePersistentState } from "@/hooks/usePersistentState";

// Сообщение чата между заказчиком и поставщиком
interface RfpChatMessage { id: number; rfpId: number; supplierId: number; fromUserId: number; text: string; date: string; }
// Уведомление о заинтересованности поставщику-победителю (в «мой кабинет»)
interface InterestNotice { id: number; supplierId: number; rfpId: number; rfpTitle: string; fromName: string; date: string; }

interface Props { onBack: () => void; }

type Status = "Черновик" | "Активен" | "Не активен" | "Закрыт";

const STATUS_COLORS: Record<Status, { bg: string; text: string; border: string }> = {
  "Черновик": { bg: "rgba(148,163,184,0.15)", text: "#94a3b8", border: "rgba(148,163,184,0.3)" },
  "Активен": { bg: "rgba(16,185,129,0.15)", text: "#10b981", border: "rgba(16,185,129,0.3)" },
  "Не активен": { bg: "rgba(245,158,11,0.15)", text: "#f59e0b", border: "rgba(245,158,11,0.3)" },
  "Закрыт": { bg: "rgba(239,68,68,0.15)", text: "#ef4444", border: "rgba(239,68,68,0.3)" },
};

const EXECUTOR_PRICE_YEAR = 4999;
const EXECUTOR_PRICE_MONTH = 700;

interface RFP {
  id: number;
  title: string;
  desc: string;
  category: string;
  location: string;      // место выполнения услуги
  workTerm: string;      // срок выполнения услуги
  deadline: string;      // срок приёма предложений (ISO yyyy-mm-dd или dd.mm.yyyy)
  status: Status;
  proposals: number;
  ownerId: number;
  contactPhone?: string; // телефон для обратной связи — виден только победителю
}

interface Supplier {
  id: number;
  name: string;
  about: string;
  permit: string;        // право на осуществление поставок/услуг
  location: string;
  contacts: string;
  site: string;
  completedOrders: number; // завершённые заказы → рейтинг доверия
  verified: boolean;       // «Проверенный исполнитель»
}

interface Proposal {
  id: number;
  rfpId: number;
  rfpTitle: string;
  supplierId: number;
  company: string;
  price: number;
  delivery: string;
  deliveryDays: number;
  file: string;
  manualRating: number | null; // оценка заказчика (если выставлена)
  date: string;
}

// Базовый рейтинг доверия: 3.5 + 0.1 за завершённый заказ (макс 5.0)
const trustRating = (completed: number) => Math.min(5, 3.5 + completed * 0.1);

const INITIAL_SUPPLIERS: Supplier[] = [
  { id: 101, name: "ООО «МебельПро»", about: "Производство и поставка офисной мебели с 2010 года.", permit: "Лицензия на оптовую торговлю мебелью №12345", location: "Москва", contacts: "+7 (495) 111-22-33, info@mebelpro.ru", site: "mebelpro.ru", completedOrders: 13, verified: true },
  { id: 102, name: "ИП Сидоров А.В.", about: "Частный поставщик, доставка по ЦФО.", permit: "ОГРНИП 316774600012345", location: "Подольск", contacts: "+7 (916) 555-44-33", site: "", completedOrders: 7, verified: false },
  { id: 103, name: "АО «Мебель Центр»", about: "Крупный поставщик корпоративной мебели.", permit: "Лицензия №77-2024, член СРО", location: "Санкт-Петербург", contacts: "+7 (812) 700-80-90, sales@mc.ru", site: "mebel-center.ru", completedOrders: 14, verified: true },
];

const INITIAL_RFPS: RFP[] = [
  { id: 1, title: "Поставка офисной мебели 2026", desc: "Требуется поставка столов, кресел и стеллажей для нового офиса.", category: "Оборудование", location: "Москва, ул. Тверская 1", workTerm: "30 дней", deadline: "2026-06-15", status: "Активен", proposals: 3, ownerId: 0 },
  { id: 2, title: "Услуги по уборке помещений", desc: "Ежедневная и генеральная уборка трёх офисных зданий.", category: "Услуги", location: "Москва", workTerm: "12 месяцев", deadline: "2026-06-20", status: "Активен", proposals: 1, ownerId: 0 },
  { id: 3, title: "Закупка серверного оборудования", desc: "Серверы, сетевые коммутаторы и системы хранения данных.", category: "IT", location: "Удалённо", workTerm: "45 дней", deadline: "2026-05-30", status: "Закрыт", proposals: 0, ownerId: 0 },
];

const INITIAL_PROPOSALS: Proposal[] = [
  { id: 1001, rfpId: 1, rfpTitle: "Поставка офисной мебели 2026", supplierId: 101, company: "ООО «МебельПро»", price: 850000, delivery: "14 дней", deliveryDays: 14, file: "proposal_mebelpro.pdf", manualRating: null, date: "03.06.2026" },
  { id: 1002, rfpId: 1, rfpTitle: "Поставка офисной мебели 2026", supplierId: 102, company: "ИП Сидоров А.В.", price: 720000, delivery: "21 день", deliveryDays: 21, file: "proposal_sidorov.pdf", manualRating: null, date: "03.06.2026" },
  { id: 1003, rfpId: 1, rfpTitle: "Поставка офисной мебели 2026", supplierId: 103, company: "АО «Мебель Центр»", price: 960000, delivery: "7 дней", deliveryDays: 7, file: "proposal_mc.pdf", manualRating: null, date: "03.06.2026" },
  { id: 1004, rfpId: 2, rfpTitle: "Услуги по уборке помещений", supplierId: 102, company: "ИП Сидоров А.В.", price: 180000, delivery: "ежедневно", deliveryDays: 1, file: "uborka.pdf", manualRating: null, date: "02.06.2026" },
];

type ViewMode = "list" | "create" | "edit" | "compare" | "upload" | "cabinet" | "request" | "payment" | "supplier" | "supplierEdit" | "chat";

function parseDeadline(d: string): number {
  if (!d || d === "—") return Infinity;
  if (d.includes("-")) { const [y, m, day] = d.split("-").map(Number); return new Date(y, m - 1, day, 23, 59).getTime(); }
  const [day, m, y] = d.split(".").map(Number); return new Date(y, m - 1, day, 23, 59).getTime();
}
function fmtDeadline(d: string): string {
  if (!d || d === "—") return "—";
  if (d.includes("-")) { const [y, m, day] = d.split("-"); return `${day}.${m}.${y}`; }
  return d;
}

export default function RFPModule({ onBack }: Props) {
  const { currentUser, hasRole, isAdmin, addRoleRequest, roleRequests, payForRole, roleGrants } = useApp();

  const [view, setView] = useState<ViewMode>("list");
  const [selectedRfp, setSelectedRfp] = useState<RFP | null>(null);
  const [editingRfp, setEditingRfp] = useState<RFP | null>(null);
  const [viewedSupplierId, setViewedSupplierId] = useState<number | null>(null);
  // Чат заказчик↔поставщик и уведомления о заинтересованности (сохраняются)
  const [chatMessages, setChatMessages] = usePersistentState<RfpChatMessage[]>("rfp_chats", []);
  const [interestNotices, setInterestNotices] = usePersistentState<InterestNotice[]>("rfp_interests", []);
  const [chatPeer, setChatPeer] = useState<{ rfpId: number; supplierId: number; company: string } | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [form, setForm] = useState({ title: "", desc: "", deadline: "", category: "", location: "", workTerm: "", contactPhone: "" });
  const [rfpSearch, setRfpSearch] = useState("");
  const [rfpList, setRfpList] = useState<RFP[]>(INITIAL_RFPS);
  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const [proposals, setProposals] = useState<Proposal[]>(INITIAL_PROPOSALS);
  const [toast, setToast] = useState<string | null>(null);
  const [uploadCompany, setUploadCompany] = useState("");
  const [uploadPrice, setUploadPrice] = useState("");
  const [uploadDelivery, setUploadDelivery] = useState("");
  const [uploadFile, setUploadFile] = useState("");
  // Модалка «Связаться с заказчиком» при нажатии на карточку победителя
  const [winnerContactModal, setWinnerContactModal] = useState<InterestNotice | null>(null);
  const [requestPhone, setRequestPhone] = useState(currentUser.phone || "");
  const [requestAgreed, setRequestAgreed] = useState(false);
  const [supplierForm, setSupplierForm] = useState<Supplier | null>(null);
  // Окно контакта с выбранным победителем
  const [winnerContact, setWinnerContact] = useState<{ company: string; supplierId: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const isExecutor = isAdmin || hasRole("executor");
  const myExecRequest = roleRequests.filter(r => r.userId === currentUser.id && r.role === "executor").slice(-1)[0];
  const myGrant = roleGrants.find(g => g.userId === currentUser.id && g.role === "executor");
  const myDaysLeft = useMemo(() => {
    if (!myGrant) return null;
    const [d, m, y] = myGrant.validUntil.split(".").map(Number);
    return Math.ceil((new Date(y, m - 1, d).getTime() - Date.now()) / (24 * 3600 * 1000));
  }, [myGrant]);
  const subscriptionActive = isAdmin || (myDaysLeft !== null && myDaysLeft > 0);

  // Профиль текущего исполнителя (если он поставщик)
  const mySupplier = suppliers.find(s => s.id === currentUser.id) || null;

  const myRfps = rfpList.filter(r => r.ownerId === currentUser.id);
  const myProposals = proposals.filter(p => p.supplierId === currentUser.id);
  // Уведомления о заинтересованности, адресованные текущему поставщику (его supplierId === currentUser.id)
  const myInterestNotices = interestNotices.filter(n => n.supplierId === currentUser.id);

  // Активные запросы с поиском по категории, месту, описанию
  const visibleRfps = useMemo(() => {
    let list = rfpList.filter(r => r.status === "Активен" && parseDeadline(r.deadline) >= Date.now());
    if (rfpSearch.trim()) {
      const q = rfpSearch.toLowerCase().trim();
      list = list.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        r.desc.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rfpList, rfpSearch]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setUploadFile(f.name);
    e.target.value = "";
  };

  const saveRfp = (status: Status) => {
    if (!form.title) return;
    if (editingRfp) {
      setRfpList(prev => prev.map(r => r.id === editingRfp.id ? { ...r, title: form.title, desc: form.desc, category: form.category || "Без категории", location: form.location, workTerm: form.workTerm, deadline: form.deadline || r.deadline, contactPhone: form.contactPhone } : r));
      showToast("✅ Запрос обновлён");
    } else {
      setRfpList(prev => [{ id: Date.now(), title: form.title, desc: form.desc, category: form.category || "Без категории", location: form.location, workTerm: form.workTerm, deadline: form.deadline || "—", status, proposals: 0, ownerId: currentUser.id, contactPhone: form.contactPhone }, ...prev]);
      showToast(status === "Черновик" ? "💾 Черновик сохранён" : "🚀 Запрос опубликован");
    }
    setForm({ title: "", desc: "", deadline: "", category: "", location: "", workTerm: "", contactPhone: "" });
    setEditingRfp(null);
    setView("list");
  };

  const startEditRfp = (r: RFP) => {
    setEditingRfp(r);
    setForm({ title: r.title, desc: r.desc, deadline: r.deadline.includes("-") ? r.deadline : "", category: r.category, location: r.location, workTerm: r.workTerm, contactPhone: r.contactPhone || "" });
    setView("edit");
  };
  const setRfpStatus = (id: number, status: Status) => { setRfpList(prev => prev.map(r => r.id === id ? { ...r, status } : r)); showToast(status === "Активен" ? "Запрос активен" : "Запрос скрыт"); };
  const deleteRfp = (id: number) => { setRfpList(prev => prev.filter(r => r.id !== id)); showToast("🗑️ Запрос удалён"); };

  const submitProposal = () => {
    if (!selectedRfp || !uploadCompany || !uploadPrice) return;
    const days = parseInt(uploadDelivery) || 0;
    const prop: Proposal = { id: Date.now(), rfpId: selectedRfp.id, rfpTitle: selectedRfp.title, supplierId: currentUser.id, company: uploadCompany, price: Number(uploadPrice.replace(/\D/g, "")) || 0, delivery: uploadDelivery || "—", deliveryDays: days, file: uploadFile || "предложение.pdf", manualRating: null, date: new Date().toLocaleDateString("ru-RU") };
    setProposals(prev => [prop, ...prev]);
    setRfpList(prev => prev.map(r => r.id === selectedRfp.id ? { ...r, proposals: r.proposals + 1 } : r));
    // создаём/обновляем карточку поставщика для текущего исполнителя
    if (!suppliers.find(s => s.id === currentUser.id)) {
      setSuppliers(prev => [...prev, { id: currentUser.id, name: uploadCompany, about: "", permit: "", location: currentUser.location || "", contacts: currentUser.phone || "", site: "", completedOrders: 0, verified: false }]);
    }
    setView("list");
    showToast("📎 Предложение отправлено заказчику");
    setUploadCompany(""); setUploadPrice(""); setUploadDelivery(""); setUploadFile("");
  };

  const rateProposal = (proposalId: number, stars: number) => {
    setProposals(prev => prev.map(p => p.id === proposalId ? { ...p, manualRating: stars } : p));
    showToast(`Оценка ${stars}★ выставлена`);
  };

  const supplierOf = (id: number) => suppliers.find(s => s.id === id);
  const supplierRating = (id: number) => {
    const s = supplierOf(id);
    return s ? trustRating(s.completedOrders) : 0;
  };

  // ── REQUEST ROLE ──
  if (view === "request") {
    const phoneDigits = requestPhone.replace(/\D/g, "");
    const canSubmit = phoneDigits.length >= 10 && requestAgreed;
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        {toast && <Toast msg={toast} />}
        <ModuleHeader title="Стать исполнителем" onBack={() => setView("list")} />
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-8 space-y-5">
          <div className="text-center space-y-3">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}><Icon name="Briefcase" size={36} color="#8b5cf6" /></div>
            <div><h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Роль исполнителя</h2><p className="text-white/50 text-sm leading-relaxed">Получите право отправлять предложения по запросам заказчиков и вести профиль поставщика.</p></div>
          </div>
          <div className="glass rounded-2xl p-4 text-left space-y-2.5">
            {["Отправлять предложения на запросы", "Профиль поставщика с рейтингом", "Накопление рейтинга доверия", "Личный кабинет исполнителя"].map((item, i) => (
              <div key={i} className="flex items-center gap-3"><div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139,92,246,0.2)' }}><Icon name="Check" size={11} color="#8b5cf6" /></div><span className="text-sm text-white/70">{item}</span></div>
            ))}
          </div>
          <div className="glass rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.15)' }}><Icon name="Wallet" size={20} color="#10b981" /></div>
            <div className="flex-1"><p className="text-sm font-semibold text-white">Стоимость роли</p><p className="text-xs text-white/40">Оплата после одобрения заявки</p></div>
            <div className="text-right"><p className="text-base font-bold text-green-400">{EXECUTOR_PRICE_YEAR.toLocaleString("ru-RU")} ₽/год</p><p className="text-xs text-white/40">или {EXECUTOR_PRICE_MONTH} ₽/мес</p></div>
          </div>
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Номер телефона для обратной связи *</label>
            <input className="input-field" type="tel" placeholder="+7 (___) ___-__-__" value={requestPhone} onChange={e => setRequestPhone(e.target.value)} />
          </div>
          <div className="glass rounded-2xl p-4 flex items-start gap-3" style={{ border: '1px solid rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.08)' }}>
            <Icon name="Info" size={16} color="#f59e0b" className="flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-200/80 leading-relaxed">Администрация рассматривает заявку и принимает решение об одобрении или отказе по собственному усмотрению. Решение администрации окончательно и не требует пояснений.</p>
          </div>
          <button type="button" onClick={() => setRequestAgreed(a => !a)} className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all" style={{ background: requestAgreed ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.04)', border: requestAgreed ? '1px solid rgba(139,92,246,0.35)' : '1px solid rgba(255,255,255,0.1)' }}>
            <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: requestAgreed ? '#8b5cf6' : 'transparent', border: requestAgreed ? 'none' : '1px solid rgba(255,255,255,0.25)' }}>{requestAgreed && <Icon name="Check" size={12} color="white" />}</div>
            <span className="text-sm text-white/80">Я ознакомлен и согласен с правилами подачи заявки</span>
          </button>
          <button className="btn-primary flex items-center justify-center gap-2 disabled:opacity-40" disabled={!canSubmit} onClick={() => { addRoleRequest("executor", requestPhone, true); showToast("📩 Заявка отправлена администратору"); setRequestAgreed(false); setView("list"); }}><Icon name="Send" size={18} />Отправить заявку</button>
        </div>
      </div>
    );
  }

  // ── PAYMENT ──
  if (view === "payment") {
    if (!myExecRequest || myExecRequest.status !== "approved" || myExecRequest.paid) {
      return (
        <div className="min-h-screen relative z-10 animate-fade-in">
          {toast && <Toast msg={toast} />}
          <ModuleHeader title="Оплата роли" onBack={() => setView("list")} />
          <div className="max-w-2xl mx-auto px-4 pt-8 pb-8 text-center"><Icon name="Clock" size={36} color="rgba(255,255,255,0.3)" className="mx-auto mb-3" /><p className="text-white/50 text-sm">Оплата станет доступна после одобрения заявки администратором.</p></div>
        </div>
      );
    }
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        {toast && <Toast msg={toast} />}
        <ModuleHeader title="Оплата роли" onBack={() => setView("list")} icon="Wallet" iconColor="#10b981" />
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-8 space-y-4">
          <div className="glass rounded-2xl p-4 flex items-center gap-3" style={{ border: '1px solid rgba(16,185,129,0.3)' }}><Icon name="CheckCircle" size={20} color="#10b981" /><p className="text-sm text-white/80 flex-1">Заявка одобрена. Выберите тариф и оплатите для активации доступа.</p></div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { payForRole(myExecRequest.id); showToast("✅ Оплата принята, роль активирована!"); setView("cabinet"); }} className="glass-strong rounded-2xl p-5 text-center hover:border-white/30 transition-all"><p className="text-xs text-white/40 uppercase tracking-wider">На год</p><p className="text-2xl font-bold text-white mt-1">{EXECUTOR_PRICE_YEAR.toLocaleString("ru-RU")} ₽</p><p className="text-xs text-green-400 mt-1">выгодно</p></button>
            <button onClick={() => { payForRole(myExecRequest.id); showToast("✅ Оплата принята, роль активирована!"); setView("cabinet"); }} className="glass-strong rounded-2xl p-5 text-center hover:border-white/30 transition-all"><p className="text-xs text-white/40 uppercase tracking-wider">На месяц</p><p className="text-2xl font-bold text-white mt-1">{EXECUTOR_PRICE_MONTH} ₽</p><p className="text-xs text-white/40 mt-1">помесячно</p></button>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: 'rgba(27,111,255,0.08)', border: '1px solid rgba(27,111,255,0.2)' }}><Icon name="Info" size={14} color="#4d8fff" className="flex-shrink-0 mt-0.5" /><p className="text-xs text-blue-200/70">После оплаты роль активируется. Отсчёт срока подписки начинается со дня оплаты.</p></div>
        </div>
      </div>
    );
  }

  // ── SUPPLIER PROFILE ──
  if (view === "supplier" && viewedSupplierId !== null) {
    const s = supplierOf(viewedSupplierId);
    if (!s) { setView("list"); return null; }
    const rating = trustRating(s.completedOrders);
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        {toast && <Toast msg={toast} />}
        <ModuleHeader title="Профиль поставщика" onBack={() => setView(selectedRfp ? "compare" : "list")} />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
          <div className="glass-strong rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-lg font-bold text-white" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>{s.name[0]}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-white">{s.name}</h2>
                  {s.verified && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold" style={{ background: 'rgba(16,185,129,0.18)', color: '#10b981', border: '1px solid rgba(16,185,129,0.4)' }}><Icon name="BadgeCheck" size={12} color="#10b981" />Проверенный исполнитель</span>}
                </div>
                <div className="flex items-center gap-1 mt-1"><Icon name="Star" size={14} color="#facc15" /><span className="text-sm font-semibold text-yellow-400">{rating.toFixed(1)}</span><span className="text-xs text-white/40 ml-1">рейтинг доверия · {s.completedOrders} заказов</span></div>
              </div>
            </div>
            {s.about && <p className="text-sm text-white/60 mt-3">{s.about}</p>}
          </div>
          <div className="glass rounded-2xl p-4 space-y-3">
            <Row icon="ShieldCheck" color="#10b981" label="Право на осуществление поставок/услуг" value={s.permit || "—"} />
            <Row icon="MapPin" color="#f59e0b" label="Местонахождение" value={s.location || "—"} />
            <Row icon="Phone" color="#4d8fff" label="Контактная информация" value={s.contacts || "—"} />
            <Row icon="Globe" color="#8b5cf6" label="Сайт" value={s.site || "—"} />
          </div>
          {viewedSupplierId === currentUser.id && isExecutor && (
            <button onClick={() => { setSupplierForm({ ...s }); setView("supplierEdit"); }} className="btn-primary flex items-center justify-center gap-2"><Icon name="Pencil" size={18} />Редактировать профиль</button>
          )}
        </div>
      </div>
    );
  }

  // ── SUPPLIER EDIT ──
  if (view === "supplierEdit" && supplierForm) {
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        {toast && <Toast msg={toast} />}
        <ModuleHeader title="Профиль поставщика" onBack={() => setView("supplier")} icon="Pencil" iconColor="#8b5cf6" />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
          <Field label="Наименование" value={supplierForm.name} onChange={v => setSupplierForm(f => f && { ...f, name: v })} />
          <Field label="О компании" value={supplierForm.about} onChange={v => setSupplierForm(f => f && { ...f, about: v })} textarea />
          <Field label="Право на осуществление поставок/услуг" value={supplierForm.permit} onChange={v => setSupplierForm(f => f && { ...f, permit: v })} />
          <Field label="Местонахождение" value={supplierForm.location} onChange={v => setSupplierForm(f => f && { ...f, location: v })} />
          <Field label="Контактная информация" value={supplierForm.contacts} onChange={v => setSupplierForm(f => f && { ...f, contacts: v })} />
          <Field label="Сайт" value={supplierForm.site} onChange={v => setSupplierForm(f => f && { ...f, site: v })} />
          <button onClick={() => { setSuppliers(prev => prev.some(x => x.id === supplierForm.id) ? prev.map(x => x.id === supplierForm.id ? supplierForm : x) : [...prev, supplierForm]); showToast("✅ Профиль обновлён"); setView("supplier"); }} className="btn-primary flex items-center justify-center gap-2"><Icon name="Check" size={18} />Сохранить</button>
        </div>
      </div>
    );
  }

  // ── UPLOAD PROPOSAL ──
  if (view === "upload" && selectedRfp) {
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        {toast && <Toast msg={toast} />}
        <ModuleHeader title="Загрузить предложение" onBack={() => setView("list")} subtitle={selectedRfp.title} />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Название компании</label>
            <input className="input-field" value={uploadCompany} onChange={e => setUploadCompany(e.target.value)} placeholder="ООО «Ваша компания»" />
            {(mySupplier?.name || currentUser.name) && uploadCompany === (mySupplier?.name || currentUser.name) && (
              <p className="text-xs text-white/30 mt-1">Подтянуто из профиля поставщика</p>
            )}
          </div>
          <Field label="Предлагаемая цена" value={uploadPrice} onChange={setUploadPrice} placeholder="0 ₽" />
          <Field label="Срок поставки" value={uploadDelivery} onChange={setUploadDelivery} placeholder="Например: 14 дней" />
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Файл предложения</label>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xlsx" className="hidden" onChange={handleFile} />
            <button onClick={() => fileRef.current?.click()} className="w-full border-2 border-dashed border-white/15 rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer hover:border-violet-500/50 transition-colors">
              <Icon name="Upload" size={24} color={uploadFile ? "#8b5cf6" : "rgba(255,255,255,0.3)"} />
              <span className="text-xs" style={{ color: uploadFile ? '#a78bfa' : 'rgba(255,255,255,0.4)' }}>{uploadFile ? `✓ ${uploadFile}` : "Нажмите для выбора PDF/DOCX/XLSX"}</span>
            </button>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setView("list")} className="btn-ghost flex-1 text-sm">Отмена</button>
            <button className="btn-primary flex-1 text-sm flex items-center justify-center gap-2" disabled={!uploadCompany || !uploadPrice} onClick={submitProposal}><Icon name="Send" size={15} />Отправить</button>
          </div>
        </div>
      </div>
    );
  }

  // ── COMPARE (динамическое) ──
  if (view === "compare" && selectedRfp) {
    const list = proposals.filter(p => p.rfpId === selectedRfp.id);
    const withRating = list.map(p => ({ ...p, rating: p.manualRating ?? supplierRating(p.supplierId) }));
    const best = withRating.length ? {
      price: withRating.reduce((a, b) => a.price < b.price ? a : b),
      rating: withRating.reduce((a, b) => a.rating > b.rating ? a : b),
      fast: withRating.reduce((a, b) => (a.deliveryDays || 999) < (b.deliveryDays || 999) ? a : b),
    } : null;
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        {toast && <Toast msg={toast} />}
        <ModuleHeader title="Сравнение предложений" onBack={() => setView(selectedRfp.ownerId === currentUser.id ? "cabinet" : "list")} subtitle={selectedRfp.title} />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
          {withRating.length === 0 ? (
            <div className="text-center py-14"><Icon name="Inbox" size={32} color="rgba(255,255,255,0.2)" className="mx-auto mb-3" /><p className="text-white/30 text-sm">По этому запросу пока нет предложений</p></div>
          ) : (
            <>
              <div className="space-y-2">
                {withRating.map(p => {
                  const sup = supplierOf(p.supplierId);
                  return (
                    <div key={p.id} className="glass rounded-2xl p-4">
                      <button onClick={() => { setViewedSupplierId(p.supplierId); setView("supplier"); }} className="w-full text-left flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-1">
                          <span className="font-semibold text-white">{p.company}</span>
                          {sup?.verified && <Icon name="BadgeCheck" size={14} color="#10b981" />}
                        </div>
                        <Icon name="ChevronRight" size={15} color="rgba(255,255,255,0.3)" />
                      </button>
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <Mini label="Цена" value={`${p.price.toLocaleString("ru-RU")} ₽`} highlight={best?.price.id === p.id} color="#10b981" />
                        <Mini label="Срок" value={p.delivery} highlight={best?.fast.id === p.id} color="#06b6d4" />
                        <Mini label="Рейтинг" value={`${p.rating.toFixed(1)}★`} highlight={best?.rating.id === p.id} color="#facc15" />
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <button onClick={() => showToast(`📄 Открываю ${p.file}`)} className="text-xs text-blue-400 flex items-center gap-1"><Icon name="Paperclip" size={11} />{p.file}</button>
                        <div className="flex items-center gap-0.5 ml-auto">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button key={star} onClick={() => rateProposal(p.id, star)}><Icon name="Star" size={14} color={star <= (p.manualRating ?? Math.round(p.rating)) ? "#facc15" : "rgba(255,255,255,0.2)"} /></button>
                          ))}
                        </div>
                      </div>
                      {/* Кнопка выбора победителя — доступна только автору заказа */}
                      {(selectedRfp.ownerId === currentUser.id || isAdmin) && (
                        <button onClick={() => setWinnerContact({ company: p.company, supplierId: p.supplierId })} className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' }}>
                          <Icon name="Award" size={16} />Выбрать победителем
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Рекомендация системы — пересчитывается динамически */}
              {best && (
                <div className="glass rounded-2xl p-4">
                  <p className="text-xs text-white/40 mb-2 uppercase tracking-wider font-semibold">Рекомендация системы</p>
                  <div className="flex items-center gap-2 mb-1.5"><Icon name="TrendingDown" size={14} color="#10b981" /><p className="text-sm text-white">Лучшая цена: <span className="text-green-400 font-medium">{best.price.company} — {best.price.price.toLocaleString("ru-RU")} ₽</span></p></div>
                  <div className="flex items-center gap-2 mb-1.5"><Icon name="Star" size={14} color="#facc15" /><p className="text-sm text-white">Лучший рейтинг: <span className="text-yellow-400 font-medium">{best.rating.company} — {best.rating.rating.toFixed(1)}★</span></p></div>
                  <div className="flex items-center gap-2"><Icon name="Zap" size={14} color="#06b6d4" /><p className="text-sm text-white">Быстрее всех: <span className="text-cyan-400 font-medium">{best.fast.company} — {best.fast.delivery}</span></p></div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Окно контакта с победителем */}
        {winnerContact && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setWinnerContact(null)}>
            <div className="w-full max-w-md mx-4 mb-4 sm:mb-0 glass-strong rounded-3xl p-6 animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2 mb-1"><div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.2)' }}><Icon name="Award" size={16} color="#8b5cf6" /></div><h3 className="text-base font-bold text-white">Связаться с поставщиком</h3></div>
              <p className="text-xs text-white/40 mb-4">{winnerContact.company}</p>
              <div className="space-y-2">
                <button onClick={() => { const s = supplierOf(winnerContact.supplierId); const phone = (s?.contacts || "").match(/[+\d][\d\s()-]{7,}/)?.[0]?.replace(/[\s()-]/g, "") || ""; if (phone) window.location.href = `tel:${phone}`; else showToast("Телефон не указан"); }} className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' }}>
                  <Icon name="Phone" size={18} color="#10b981" /><span className="text-sm font-medium text-white flex-1">Позвонить поставщику</span><Icon name="ChevronRight" size={15} color="rgba(255,255,255,0.3)" />
                </button>
                <button onClick={() => { setChatPeer({ rfpId: selectedRfp.id, supplierId: winnerContact.supplierId, company: winnerContact.company }); setWinnerContact(null); setView("chat"); }} className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left" style={{ background: 'rgba(27,111,255,0.12)', border: '1px solid rgba(27,111,255,0.3)' }}>
                  <Icon name="MessageSquare" size={18} color="#4d8fff" /><span className="text-sm font-medium text-white flex-1">Написать в приложении</span><Icon name="ChevronRight" size={15} color="rgba(255,255,255,0.3)" />
                </button>
                <button onClick={() => {
                  setInterestNotices(prev => [...prev, { id: Date.now(), supplierId: winnerContact.supplierId, rfpId: selectedRfp.id, rfpTitle: selectedRfp.title, fromName: currentUser.name, date: new Date().toLocaleString("ru-RU") }]);
                  setWinnerContact(null);
                  showToast("✅ Поставщик уведомлён о вашей заинтересованности");
                }} className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left" style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)' }}>
                  <Icon name="Send" size={18} color="#8b5cf6" /><span className="text-sm font-medium text-white flex-1">Сообщить о заинтересованности</span><Icon name="ChevronRight" size={15} color="rgba(255,255,255,0.3)" />
                </button>
              </div>
              <button onClick={() => setWinnerContact(null)} className="btn-ghost w-full text-sm mt-3">Закрыть</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── ЧАТ заказчик ↔ поставщик ──
  if (view === "chat" && chatPeer) {
    const thread = chatMessages.filter(m => m.rfpId === chatPeer.rfpId && m.supplierId === chatPeer.supplierId);
    const sendMsg = () => {
      if (!chatInput.trim()) return;
      setChatMessages(prev => [...prev, { id: Date.now(), rfpId: chatPeer.rfpId, supplierId: chatPeer.supplierId, fromUserId: currentUser.id, text: chatInput.trim(), date: new Date().toLocaleString("ru-RU") }]);
      setChatInput("");
    };
    return (
      <div className="min-h-screen relative z-10 animate-fade-in flex flex-col">
        {toast && <Toast msg={toast} />}
        <ModuleHeader title={chatPeer.company} onBack={() => setView("compare")} icon="MessageSquare" iconColor="#4d8fff" subtitle="Чат по заказу" />
        <div className="max-w-2xl mx-auto w-full px-4 pt-4 pb-28 flex-1 space-y-2">
          {thread.length === 0 && <div className="text-center py-14"><Icon name="MessageSquare" size={32} color="rgba(255,255,255,0.2)" className="mx-auto mb-3" /><p className="text-white/30 text-sm">Начните диалог с поставщиком</p></div>}
          {thread.map(m => {
            const mine = m.fromUserId === currentUser.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[80%] rounded-2xl px-3.5 py-2.5" style={{ background: mine ? 'linear-gradient(135deg,#1b6fff,#0040cc)' : 'rgba(255,255,255,0.06)', border: mine ? 'none' : '1px solid rgba(255,255,255,0.1)' }}>
                  <p className="text-sm text-white whitespace-pre-wrap">{m.text}</p>
                  <p className="text-[10px] text-white/40 mt-1 text-right">{m.date}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="fixed bottom-0 left-0 right-0 glass border-t border-white/10 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center gap-2">
            <input className="input-field flex-1" placeholder="Сообщение..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMsg()} />
            <button onClick={sendMsg} className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#1b6fff,#0040cc)' }}><Icon name="Send" size={18} color="white" /></button>
          </div>
        </div>
      </div>
    );
  }

  // ── CREATE / EDIT RFP ──
  if (view === "create" || view === "edit") {
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        {toast && <Toast msg={toast} />}
        <ModuleHeader title={view === "edit" ? "Изменить запрос" : "Новый запрос"} onBack={() => { setEditingRfp(null); setView(view === "edit" ? "cabinet" : "list"); }} />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
          <Field label="Наименование запроса *" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="Например: Закупка оргтехники" />
          <Field label="Описание" value={form.desc} onChange={v => setForm(f => ({ ...f, desc: v }))} placeholder="Подробное описание требований..." textarea />
          <Field label="Категория" value={form.category} onChange={v => setForm(f => ({ ...f, category: v }))} placeholder="Оборудование / Услуги / IT..." />
          <Field label="Место выполнения услуги" value={form.location} onChange={v => setForm(f => ({ ...f, location: v }))} placeholder="Город, адрес или «Удалённо»" />
          <Field label="Срок выполнения услуги" value={form.workTerm} onChange={v => setForm(f => ({ ...f, workTerm: v }))} placeholder="Например: 30 дней" />
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Срок приёма предложений</label>
            <input className="input-field" type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
            <p className="text-xs text-white/30 mt-1">Когда срок закончится, запрос автоматически исчезнет из общего потока.</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Телефон для обратной связи</label>
            <input className="input-field" type="tel" placeholder="+7 (___) ___-__-__" value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} />
            <div className="flex items-start gap-2 mt-2 p-3 rounded-xl" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
              <Icon name="Lock" size={13} color="#8b5cf6" className="flex-shrink-0 mt-0.5" />
              <p className="text-xs text-violet-300/80">Телефон не отображается в карточке запроса. Он будет доступен только победителю после того, как вы выберете его предложение.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => saveRfp("Черновик")} className="btn-ghost flex-1" disabled={!form.title}>Сохранить черновик</button>
            <button onClick={() => saveRfp("Активен")} className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={!form.title || !form.desc}><Icon name="Send" size={16} />{view === "edit" ? "Сохранить" : "Опубликовать"}</button>
          </div>
        </div>
      </div>
    );
  }

  // ── CABINET ──
  if (view === "cabinet") {
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        {toast && <Toast msg={toast} />}
        <ModuleHeader title="Мой кабинет" onBack={() => setView("list")} icon="LayoutDashboard" iconColor="#8b5cf6" />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
          {/* Подписка исполнителя */}
          {isExecutor && !isAdmin && (
            <div className="glass rounded-2xl p-4" style={{ border: `1px solid ${subscriptionActive ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: subscriptionActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }}><Icon name={subscriptionActive ? "CalendarCheck" : "CalendarX"} size={20} color={subscriptionActive ? "#10b981" : "#ef4444"} /></div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">Подписка исполнителя</p>
                  {subscriptionActive ? <p className="text-xs text-white/50">Осталось <span className="text-green-400 font-semibold">{myDaysLeft}</span> дн. · до {myGrant?.validUntil}</p> : <p className="text-xs text-red-400">Подписка истекла — предложения не публикуются в общем потоке</p>}
                </div>
                {!subscriptionActive && myExecRequest && <button onClick={() => setView("payment")} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>Продлить</button>}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="glass rounded-2xl p-4 text-center"><div className="text-2xl font-bold text-white">{myRfps.length}</div><div className="text-xs text-white/40">Мои запросы</div></div>
            <div className="glass rounded-2xl p-4 text-center"><div className="text-2xl font-bold text-white">{myProposals.length}</div><div className="text-xs text-white/40">Мои предложения</div></div>
          </div>

          {/* Уведомления о заинтересованности заказчиков (победитель) */}
          {myInterestNotices.length > 0 && (
            <div className="glass rounded-2xl p-4" style={{ border: '1px solid rgba(139,92,246,0.3)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: '#8b5cf6' }}><Icon name="Award" size={14} color="#8b5cf6" />Вас выбрали победителем ({myInterestNotices.length})</p>
              <div className="space-y-2">
                {myInterestNotices.map(n => {
                  // Найдём само предложение победителя по этому заказу
                  const myProposal = proposals.find(p => p.rfpId === n.rfpId && p.supplierId === currentUser.id);
                  // Найдём RFP чтобы показать телефон заказчика победителю
                  const rfp = rfpList.find(r => r.id === n.rfpId);
                  return (
                    <button key={n.id} onClick={() => setWinnerContactModal(n)} className="w-full text-left rounded-xl p-3 transition-all hover:bg-white/5" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-semibold truncate">{n.rfpTitle}</p>
                          <p className="text-xs text-white/50 mt-0.5">Заказчик: {n.fromName} · {n.date}</p>
                          {myProposal && <p className="text-xs text-violet-300 mt-0.5">Моё предложение: {myProposal.price.toLocaleString("ru-RU")} ₽ · {myProposal.delivery}</p>}
                        </div>
                        <div className="flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa' }}>Связаться →</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Модалка «Связаться с заказчиком» */}
          {winnerContactModal && (() => {
            const myProposal = proposals.find(p => p.rfpId === winnerContactModal.rfpId && p.supplierId === currentUser.id);
            const rfp = rfpList.find(r => r.id === winnerContactModal.rfpId);
            return (
              <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} onClick={() => setWinnerContactModal(null)}>
                <div className="w-full max-w-md mx-4 mb-4 sm:mb-0 rounded-3xl p-6 space-y-4 animate-fade-up opacity-0" style={{ background: 'rgba(15,23,42,0.98)', border: '1px solid rgba(139,92,246,0.3)', animationFillMode: 'forwards' }} onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.2)' }}><Icon name="Award" size={20} color="#8b5cf6" /></div>
                    <div><h3 className="text-base font-bold text-white">Связаться с заказчиком</h3><p className="text-xs text-white/40 truncate">{winnerContactModal.rfpTitle}</p></div>
                  </div>

                  {/* Детали моего предложения */}
                  {myProposal && (
                    <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Моё предложение</p>
                      <p className="text-sm text-white">{myProposal.company} · <span className="text-green-400 font-semibold">{myProposal.price.toLocaleString("ru-RU")} ₽</span></p>
                      <p className="text-xs text-white/50">Срок: {myProposal.delivery} · Файл: {myProposal.file}</p>
                    </div>
                  )}

                  {/* Телефон заказчика — доступен только победителю */}
                  {rfp?.contactPhone && (
                    <div className="rounded-xl p-3" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
                      <p className="text-xs text-white/40 mb-1">Телефон заказчика</p>
                      <p className="text-sm font-semibold text-violet-300">{rfp.contactPhone}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <button onClick={() => { const phone = rfp?.contactPhone?.replace(/\D/g, "") || ""; if (phone) window.location.href = `tel:+${phone}`; else showToast("Телефон заказчика не указан"); }} className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' }}>
                      <Icon name="Phone" size={18} color="#10b981" /><span className="text-sm font-medium text-white flex-1">Позвонить заказчику</span><Icon name="ChevronRight" size={15} color="rgba(255,255,255,0.3)" />
                    </button>
                    <button onClick={() => { if (rfp) { setChatPeer({ rfpId: rfp.id, supplierId: currentUser.id, company: winnerContactModal.fromName }); setWinnerContactModal(null); setView("chat"); } }} className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left" style={{ background: 'rgba(27,111,255,0.12)', border: '1px solid rgba(27,111,255,0.3)' }}>
                      <Icon name="MessageSquare" size={18} color="#4d8fff" /><span className="text-sm font-medium text-white flex-1">Написать в приложении</span><Icon name="ChevronRight" size={15} color="rgba(255,255,255,0.3)" />
                    </button>
                  </div>
                  <button onClick={() => setWinnerContactModal(null)} className="btn-ghost w-full text-sm">Закрыть</button>
                </div>
              </div>
            );
          })()}

          {isExecutor && (
            <button onClick={() => { const s = mySupplier || { id: currentUser.id, name: currentUser.name, about: "", permit: "", location: currentUser.location || "", contacts: currentUser.phone || "", site: "", completedOrders: 0, verified: false }; setViewedSupplierId(currentUser.id); if (!mySupplier) setSuppliers(prev => [...prev, s]); setView("supplier"); }} className="w-full flex items-center gap-3 p-4 rounded-2xl text-left" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)' }}>
              <Icon name="UserCog" size={18} color="#8b5cf6" /><span className="text-sm font-medium text-white flex-1">Мой профиль поставщика</span><Icon name="ChevronRight" size={16} color="rgba(255,255,255,0.3)" />
            </button>
          )}

          {/* Управление запросами */}
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider px-1">Созданные предложения (запросы)</p>
          {myRfps.length > 0 ? myRfps.map(rfp => {
            const sc = STATUS_COLORS[rfp.status];
            const expired = parseDeadline(rfp.deadline) < Date.now();
            return (
              <div key={rfp.id} className="glass rounded-2xl p-4">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="text-sm font-semibold text-white flex-1">{rfp.title}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-lg font-medium" style={{ background: sc.bg, color: sc.text }}>{rfp.status}</span>
                </div>
                <p className="text-xs text-white/40">до {fmtDeadline(rfp.deadline)}{expired && " (истёк)"} · {proposals.filter(p => p.rfpId === rfp.id).length} предложений</p>
                <button onClick={() => { setSelectedRfp(rfp); setView("compare"); }} className="mt-2 text-xs text-blue-400 flex items-center gap-1"><Icon name="BarChart3" size={12} />Сравнить предложения</button>
                {/* Панель управления запросом */}
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/8">
                  <button onClick={() => setRfpStatus(rfp.id, "Активен")} className="py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5" style={{ background: rfp.status === "Активен" ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)', border: `1px solid ${rfp.status === "Активен" ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}`, color: rfp.status === "Активен" ? '#10b981' : 'rgba(255,255,255,0.6)' }}><Icon name="Eye" size={12} />Активен</button>
                  <button onClick={() => setRfpStatus(rfp.id, "Не активен")} className="py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5" style={{ background: rfp.status === "Не активен" ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)', border: `1px solid ${rfp.status === "Не активен" ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.1)'}`, color: rfp.status === "Не активен" ? '#f59e0b' : 'rgba(255,255,255,0.6)' }}><Icon name="EyeOff" size={12} />Не активен</button>
                  <button onClick={() => startEditRfp(rfp)} className="py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}><Icon name="Pencil" size={12} />Изменить</button>
                  <button onClick={() => deleteRfp(rfp.id)} className="py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}><Icon name="Trash2" size={12} />Удалить</button>
                </div>
              </div>
            );
          }) : <div className="text-center py-6 text-white/30 text-sm">Вы ещё не создавали запросы</div>}

          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider px-1">Отправленные предложения</p>
          {myProposals.length > 0 ? myProposals.map(p => (
            <div key={p.id} className="glass rounded-2xl p-4">
              <p className="text-xs text-white/40 mb-1">По запросу: {p.rfpTitle}</p>
              <div className="flex items-center justify-between"><span className="text-sm font-semibold text-white">{p.company}</span><span className="text-sm font-semibold text-green-400">{p.price.toLocaleString("ru-RU")} ₽</span></div>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-white/40"><span className="flex items-center gap-1"><Icon name="Clock" size={11} />{p.delivery}</span><span className="flex items-center gap-1"><Icon name="Paperclip" size={11} />{p.file}</span><span className="ml-auto">{p.date}</span></div>
            </div>
          )) : <div className="text-center py-6 text-white/30 text-sm">Вы ещё не отправляли предложения</div>}
        </div>
      </div>
    );
  }

  // ── MAIN LIST ──
  return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      {toast && <Toast msg={toast} />}
      <div className="glass border-b border-white/10 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/10 transition-colors flex-shrink-0"><Icon name="ArrowLeft" size={20} color="white" /></button>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)' }}><Icon name="FileSearch" size={16} color="#8b5cf6" /></div>
          <div className="flex-1"><h1 className="text-base font-bold text-white">Запрос предложений</h1><p className="text-xs text-white/40">{visibleRfps.length} активных запросов</p></div>
          <button onClick={() => setView("cabinet")} className="relative p-2 rounded-xl hover:bg-white/10 transition-colors">
            <Icon name="LayoutDashboard" size={18} color="#8b5cf6" />
            {(myProposals.length > 0 || myRfps.length > 0) && <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold" style={{ background: '#8b5cf6', fontSize: '9px' }}>{myProposals.length + myRfps.length}</span>}
          </button>
        </div>
        {/* Поиск по категории, месту, описанию */}
        <div className="max-w-2xl mx-auto mt-2.5 relative">
          <Icon name="Search" size={15} color="rgba(255,255,255,0.3)" className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input className="input-field pl-12 py-2 text-sm" placeholder="Поиск по категории, месту, описанию..." value={rfpSearch} onChange={e => setRfpSearch(e.target.value)} />
          {rfpSearch && <button onClick={() => setRfpSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><Icon name="X" size={14} color="rgba(255,255,255,0.4)" /></button>}
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
        {/* Любой пользователь может бесплатно разместить запрос */}
        <button onClick={() => { setEditingRfp(null); setForm({ title: "", desc: "", deadline: "", category: "", location: "", workTerm: "" }); setView("create"); }} className="btn-primary flex items-center justify-center gap-2 animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
          <Icon name="Plus" size={18} />Создать запрос предложений
        </button>
        {/* CTA для роли исполнителя */}
        {!isExecutor && (
          myExecRequest && myExecRequest.status === "approved" && !myExecRequest.paid ? (
            <button onClick={() => setView("payment")} className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-left" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.4)' }}>
              <Icon name="Wallet" size={16} color="#10b981" /><span className="text-sm font-medium text-white flex-1">Заявка одобрена — оплатите роль исполнителя</span><Icon name="ChevronRight" size={15} color="#10b981" />
            </button>
          ) : myExecRequest && myExecRequest.status === "pending" ? (
            <div className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-left" style={{ background: 'rgba(245,158,11,0.1)', border: '1px dashed rgba(245,158,11,0.35)' }}>
              <Icon name="Clock" size={16} color="#f59e0b" /><span className="text-sm font-medium text-white flex-1">Заявка на роль исполнителя на рассмотрении</span>
            </div>
          ) : (
            <button onClick={() => { setRequestPhone(currentUser.phone || ""); setRequestAgreed(false); setView("request"); }} className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-left" style={{ background: 'rgba(139,92,246,0.1)', border: '1px dashed rgba(139,92,246,0.35)' }}>
              <Icon name="Briefcase" size={16} color="#8b5cf6" /><span className="text-sm font-medium text-white flex-1">Хотите отправлять предложения? Станьте исполнителем</span><Icon name="ChevronRight" size={15} color="rgba(139,92,246,0.6)" />
            </button>
          )
        )}
        <div className="space-y-3">
          {visibleRfps.map((rfp, i) => {
            const sc = STATUS_COLORS[rfp.status];
            return (
              <div key={rfp.id} className={`card-module animate-fade-up opacity-0`} style={{ animationDelay: `${0.1 + i * 0.07}s`, animationFillMode: 'forwards' }}>
                <div className="flex items-start justify-between mb-2">
                  <span className="tag text-xs">{rfp.category}</span>
                  <span className="text-xs px-2 py-1 rounded-lg font-medium" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>{rfp.status}</span>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{rfp.title}</h3>
                <p className="text-xs text-white/50 mb-3 line-clamp-2">{rfp.desc}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-white/40 mb-3">
                  <span className="flex items-center gap-1"><Icon name="MapPin" size={11} />{rfp.location || "—"}</span>
                  <span className="flex items-center gap-1"><Icon name="Timer" size={11} />{rfp.workTerm || "—"}</span>
                  <span className="flex items-center gap-1"><Icon name="Calendar" size={11} />до {fmtDeadline(rfp.deadline)}</span>
                  <span className="flex items-center gap-1"><Icon name="FileText" size={11} />{proposals.filter(p => p.rfpId === rfp.id).length}</span>
                </div>
                <div className="flex gap-2 pt-3 border-t border-white/8">
                  <button onClick={() => { setSelectedRfp(rfp); if (isExecutor) { setUploadCompany(mySupplier?.name || currentUser.name || ""); setView("upload"); } else { setRequestPhone(currentUser.phone || ""); setRequestAgreed(false); setView("request"); } }} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium text-white/60 hover:text-white transition-colors hover:bg-white/10 active:scale-95">
                    <Icon name="Upload" size={13} />Загрузить предложение
                  </button>
                  <button onClick={() => { setSelectedRfp(rfp); setView("compare"); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors active:scale-95" style={{ background: 'rgba(27,111,255,0.1)', border: '1px solid rgba(27,111,255,0.2)' }}>
                    <Icon name="BarChart3" size={13} />Сравнить
                  </button>
                </div>
              </div>
            );
          })}
          {visibleRfps.length === 0 && <div className="text-center py-14"><Icon name="FileSearch" size={32} color="rgba(255,255,255,0.2)" className="mx-auto mb-3" /><p className="text-white/30 text-sm">Нет активных запросов</p></div>}
        </div>
      </div>
    </div>
  );
}

function Toast({ msg }: { msg: string }) {
  return <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl text-sm font-medium text-white animate-fade-up" style={{ background: 'rgba(139,92,246,0.92)', backdropFilter: 'blur(12px)', border: '1px solid rgba(139,92,246,0.5)', animationFillMode: 'forwards' }}>{msg}</div>;
}

function Row({ icon, color, label, value }: { icon: string; color: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}><Icon name={icon} size={15} color={color} /></div>
      <div className="flex-1 min-w-0"><p className="text-xs text-white/40">{label}</p><p className="text-sm text-white/80 break-words">{value}</p></div>
    </div>
  );
}

function Mini({ label, value, highlight, color }: { label: string; value: string; highlight?: boolean; color: string }) {
  return (
    <div className="text-center py-2 rounded-xl" style={{ background: highlight ? `${color}18` : 'rgba(255,255,255,0.04)', border: `1px solid ${highlight ? `${color}50` : 'rgba(255,255,255,0.08)'}` }}>
      <p className="text-xs text-white/40">{label}</p>
      <p className="text-sm font-semibold" style={{ color: highlight ? color : 'white' }}>{value}</p>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, textarea }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean }) {
  return (
    <div>
      <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">{label}</label>
      {textarea
        ? <textarea className="input-field resize-none" rows={4} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
        : <input className="input-field" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />}
    </div>
  );
}