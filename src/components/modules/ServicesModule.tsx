import { useState, useMemo, useRef } from "react";
import Icon from "@/components/ui/icon";
import ModuleHeader from "@/components/ModuleHeader";
import { useApp } from "@/context/AppContext";
import { usePersistentState } from "@/hooks/usePersistentState";

interface Props { onBack: () => void; }

// ── Структура данных (готова к переносу на сервер) ──
interface Service { id: number; name: string; price: number; description: string; }
interface CaseItem { id: number; title: string; description: string; media: string; mediaType: "image" | "video"; }
interface Review { id: number; author: string; rating: number; text: string; date: string; }
interface Executor {
  id: number;
  ownerId: number;
  name: string;
  banner: string;        // data-url логотипа/фото
  category: string;
  city: string;
  address: string;
  about: string;
  contacts: string;
  rating: number;        // средняя оценка (по умолчанию 5.0)
  visible: boolean;      // видимость в общем списке
  services: Service[];
  cases: CaseItem[];
  reviews: Review[];
}

const CATEGORIES = ["Ремонт", "Консультации", "Доставка", "Клининг", "IT-услуги"];
const CITIES = ["Все города", "Москва", "Санкт-Петербург", "Казань", "Екатеринбург", "Новосибирск"];
const RATING_FILTERS = [{ v: 0, label: "Любой" }, { v: 4, label: "4.0+" }, { v: 4.5, label: "4.5+" }];
const EXECUTOR_PRICE = 4999; // ₽/мес

const SEED_EXECUTORS: Executor[] = [
  {
    id: 9001, ownerId: -1, name: "СтройМастер", banner: "", category: "Ремонт", city: "Москва", address: "ул. Строителей, 10", about: "Ремонт квартир и офисов под ключ. Опыт 12 лет.", contacts: "+7 (495) 100-20-30, stroymaster@mail.ru", rating: 4.8, visible: true,
    services: [{ id: 1, name: "Косметический ремонт", price: 35000, description: "Покраска, обои, мелкий ремонт" }, { id: 2, name: "Капитальный ремонт", price: 150000, description: "Полный ремонт под ключ" }],
    cases: [{ id: 1, title: "Ремонт 2-комнатной квартиры", description: "Сдали за 30 дней", media: "", mediaType: "image" }],
    reviews: [{ id: 1, author: "Иван", rating: 5, text: "Отличная работа, всё в срок!", date: "01.06.2026" }],
  },
  {
    id: 9002, ownerId: -1, name: "Юрист-Консалт", banner: "", category: "Консультации", city: "Санкт-Петербург", address: "Невский пр., 50", about: "Юридические консультации для бизнеса и частных лиц.", contacts: "+7 (812) 200-30-40", rating: 4.9, visible: true,
    services: [{ id: 1, name: "Консультация", price: 2500, description: "1 час консультации" }],
    cases: [], reviews: [{ id: 1, author: "ООО Ромашка", rating: 5, text: "Помогли с договором.", date: "28.05.2026" }],
  },
  {
    id: 9003, ownerId: -1, name: "Быстрая Доставка", banner: "", category: "Доставка", city: "Москва", address: "—", about: "Курьерская доставка по городу за 2 часа.", contacts: "+7 (495) 300-40-50", rating: 4.5, visible: true,
    services: [{ id: 1, name: "Доставка по городу", price: 500, description: "До 5 кг, 2 часа" }],
    cases: [], reviews: [],
  },
];

type ViewMode = "list" | "profile" | "request" | "payment" | "dashboard" | "editService" | "editCase" | "editReview";

export default function ServicesModule({ onBack }: Props) {
  const { currentUser, hasRole, isAdmin, addRoleRequest, roleRequests, payForRole, roleGrants } = useApp();

  const [executors, setExecutors] = usePersistentState<Executor[]>("marketplace_executors", SEED_EXECUTORS);
  const [view, setView] = useState<ViewMode>("list");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("Все города");
  const [ratingFilter, setRatingFilter] = useState(0);
  const [catFilter, setCatFilter] = useState("Все");
  const [toast, setToast] = useState<string | null>(null);
  const [requestPhone, setRequestPhone] = useState(currentUser.phone || "");
  const [requestAgreed, setRequestAgreed] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingCase, setEditingCase] = useState<CaseItem | null>(null);
  const [editingReview, setEditingReview] = useState<Review | null>(null);

  const bannerRef = useRef<HTMLInputElement>(null);
  const caseMediaRef = useRef<HTMLInputElement>(null);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  // роль исполнителя для маркетплейса используем "executor" (та же, что и в RFP)
  const isExecutor = isAdmin || hasRole("executor");
  const myReq = roleRequests.filter(r => r.userId === currentUser.id && r.role === "executor").slice(-1)[0];

  const myExecutor = executors.find(e => e.ownerId === currentUser.id) || null;
  const selected = executors.find(e => e.id === selectedId) || null;

  const filtered = useMemo(() => executors.filter(e =>
    e.visible &&
    (catFilter === "Все" || e.category === catFilter) &&
    (cityFilter === "Все города" || e.city === cityFilter) &&
    e.rating >= ratingFilter &&
    (e.name.toLowerCase().includes(search.toLowerCase()) || e.services.some(s => s.name.toLowerCase().includes(search.toLowerCase())))
  ), [executors, catFilter, cityFilter, ratingFilter, search]);

  const updateMine = (patch: Partial<Executor>) => setExecutors(prev => prev.map(e => e.ownerId === currentUser.id ? { ...e, ...patch } : e));

  const ensureMyExecutor = () => {
    if (myExecutor) return myExecutor;
    const created: Executor = { id: currentUser.id, ownerId: currentUser.id, name: currentUser.name, banner: "", category: CATEGORIES[0], city: currentUser.location || "Москва", address: "", about: "", contacts: currentUser.phone || "", rating: 5.0, visible: true, services: [], cases: [], reviews: [] };
    setExecutors(prev => [created, ...prev]);
    return created;
  };

  const handleBanner = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => updateMine({ banner: reader.result as string });
    reader.readAsDataURL(f); e.target.value = "";
  };
  const handleCaseMedia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f || !editingCase) return;
    const reader = new FileReader();
    const mediaType: "image" | "video" = f.type.startsWith("video") ? "video" : "image";
    reader.onload = () => setEditingCase(c => c && { ...c, media: reader.result as string, mediaType });
    reader.readAsDataURL(f); e.target.value = "";
  };

  // ── REQUEST ROLE ──
  if (view === "request") {
    const canSubmit = requestPhone.replace(/\D/g, "").length >= 10 && requestAgreed;
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        {toast && <Toast msg={toast} />}
        <ModuleHeader title="Стать исполнителем" onBack={() => setView("list")} icon="Store" iconColor="#0ea5e9" />
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-8 space-y-5">
          <div className="text-center space-y-3">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto" style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.3)' }}><Icon name="Store" size={36} color="#0ea5e9" /></div>
            <div><h2 className="text-xl font-bold text-white mb-2">Кабинет исполнителя</h2><p className="text-white/50 text-sm">Разместите свои услуги, кейсы и отзывы. Доступ — {EXECUTOR_PRICE.toLocaleString("ru-RU")} ₽/мес.</p></div>
          </div>
          <div className="glass rounded-2xl p-4 text-left space-y-2.5">
            {["Баннер, услуги, цены и описание", "Кейсы с фото и видео", "Отзывы и рейтинг", "Видимость в общем списке"].map((it, i) => <div key={i} className="flex items-center gap-3"><div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(14,165,233,0.2)' }}><Icon name="Check" size={11} color="#0ea5e9" /></div><span className="text-sm text-white/70">{it}</span></div>)}
          </div>
          <div className="glass rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.15)' }}><Icon name="Wallet" size={20} color="#10b981" /></div>
            <div className="flex-1"><p className="text-sm font-semibold text-white">Стоимость доступа</p><p className="text-xs text-white/40">Оплата после одобрения заявки</p></div>
            <span className="text-lg font-bold text-green-400">{EXECUTOR_PRICE.toLocaleString("ru-RU")} ₽/мес</span>
          </div>
          <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Телефон для обратной связи *</label><input className="input-field" type="tel" placeholder="+7 (___) ___-__-__" value={requestPhone} onChange={e => setRequestPhone(e.target.value)} /></div>
          <div className="glass rounded-2xl p-4 flex items-start gap-3" style={{ border: '1px solid rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.08)' }}><Icon name="Info" size={16} color="#f59e0b" className="flex-shrink-0 mt-0.5" /><p className="text-xs text-yellow-200/80 leading-relaxed">Администрация рассматривает заявку и принимает решение об одобрении или отказе по собственному усмотрению. Решение администрации окончательно и не требует пояснений.</p></div>
          <button type="button" onClick={() => setRequestAgreed(a => !a)} className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all" style={{ background: requestAgreed ? 'rgba(14,165,233,0.12)' : 'rgba(255,255,255,0.04)', border: requestAgreed ? '1px solid rgba(14,165,233,0.35)' : '1px solid rgba(255,255,255,0.1)' }}>
            <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: requestAgreed ? '#0ea5e9' : 'transparent', border: requestAgreed ? 'none' : '1px solid rgba(255,255,255,0.25)' }}>{requestAgreed && <Icon name="Check" size={12} color="white" />}</div>
            <span className="text-sm text-white/80">Я ознакомлен и согласен с правилами подачи заявки</span>
          </button>
          <button className="btn-primary flex items-center justify-center gap-2 disabled:opacity-40" disabled={!canSubmit} onClick={() => { addRoleRequest("executor", requestPhone, true); showToast("📩 Заявка отправлена администратору"); setRequestAgreed(false); setView("list"); }} style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}><Icon name="Send" size={18} />Отправить заявку</button>
        </div>
      </div>
    );
  }

  // ── PAYMENT ──
  if (view === "payment") {
    if (!myReq || myReq.status !== "approved" || myReq.paid) {
      return (<div className="min-h-screen relative z-10 animate-fade-in"><ModuleHeader title="Оплата доступа" onBack={() => setView("list")} /><div className="max-w-2xl mx-auto px-4 pt-8 text-center"><Icon name="Clock" size={36} color="rgba(255,255,255,0.3)" className="mx-auto mb-3" /><p className="text-white/50 text-sm">Оплата станет доступна после одобрения заявки администратором.</p></div></div>);
    }
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        {toast && <Toast msg={toast} />}
        <ModuleHeader title="Оплата доступа" onBack={() => setView("list")} icon="Wallet" iconColor="#10b981" />
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-8 space-y-4">
          <div className="glass rounded-2xl p-4 flex items-center gap-3" style={{ border: '1px solid rgba(16,185,129,0.3)' }}><Icon name="CheckCircle" size={20} color="#10b981" /><p className="text-sm text-white/80 flex-1">Заявка одобрена. Оплатите доступ исполнителя.</p></div>
          <div className="glass-strong rounded-2xl p-5 text-center"><p className="text-xs text-white/40 uppercase tracking-wider">Доступ исполнителя</p><p className="text-3xl font-bold text-white mt-1">{EXECUTOR_PRICE.toLocaleString("ru-RU")} ₽<span className="text-sm font-normal text-white/40"> / мес</span></p></div>
          <button onClick={() => { payForRole(myReq.id); ensureMyExecutor(); showToast("✅ Оплата принята, кабинет активирован!"); setView("dashboard"); }} className="btn-primary flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}><Icon name="CreditCard" size={18} />Оплатить {EXECUTOR_PRICE.toLocaleString("ru-RU")} ₽</button>
        </div>
      </div>
    );
  }

  // ── EXECUTOR PROFILE (public) ──
  if (view === "profile" && selected) {
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        {toast && <Toast msg={toast} />}
        <ModuleHeader title={selected.name} onBack={() => setView("list")} subtitle={selected.category} />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
          <div className="rounded-2xl overflow-hidden h-32 relative" style={{ background: 'linear-gradient(135deg,#0ea5e9,#0284c7)' }}>{selected.banner && <img src={selected.banner} alt="" className="w-full h-full object-cover" />}</div>
          <div className="glass-strong rounded-2xl p-4 -mt-10 mx-2 relative">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-white">{selected.name}</h2>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-yellow-400"><Icon name="Star" size={14} color="#facc15" />{selected.rating.toFixed(1)}</span>
            </div>
            <p className="text-xs text-white/40 flex items-center gap-1 mt-1"><Icon name="MapPin" size={11} />{selected.city}{selected.address ? `, ${selected.address}` : ""}</p>
            {selected.about && <p className="text-sm text-white/60 mt-2">{selected.about}</p>}
            {selected.contacts && <p className="text-sm text-white/70 mt-2 flex items-center gap-1.5"><Icon name="Phone" size={13} color="#0ea5e9" />{selected.contacts}</p>}
          </div>

          <Section title="Услуги" icon="ListChecks">
            {selected.services.map(s => <div key={s.id} className="glass rounded-xl p-3"><div className="flex justify-between"><p className="text-sm font-medium text-white">{s.name}</p><p className="text-sm font-bold text-green-400">от {s.price.toLocaleString("ru-RU")} ₽</p></div>{s.description && <p className="text-xs text-white/40 mt-1">{s.description}</p>}</div>)}
            {selected.services.length === 0 && <Empty text="Услуги не указаны" />}
          </Section>

          <Section title="Кейсы" icon="Images">
            {selected.cases.map(c => <div key={c.id} className="glass rounded-xl overflow-hidden">{c.media && (c.mediaType === "video" ? <video src={c.media} className="w-full h-40 object-cover" controls /> : <img src={c.media} alt="" className="w-full h-40 object-cover" />)}<div className="p-3"><p className="text-sm font-medium text-white">{c.title}</p>{c.description && <p className="text-xs text-white/40 mt-1">{c.description}</p>}</div></div>)}
            {selected.cases.length === 0 && <Empty text="Кейсы не добавлены" />}
          </Section>

          <Section title="Отзывы" icon="MessageCircle">
            {selected.reviews.map(r => <div key={r.id} className="glass rounded-xl p-3"><div className="flex justify-between items-center mb-1"><p className="text-sm font-medium text-white">{r.author}</p><span className="flex items-center gap-0.5">{[1,2,3,4,5].map(n => <Icon key={n} name="Star" size={11} color={n <= r.rating ? "#facc15" : "rgba(255,255,255,0.2)"} />)}</span></div><p className="text-sm text-white/60">{r.text}</p><p className="text-xs text-white/30 mt-1">{r.date}</p></div>)}
            {selected.reviews.length === 0 && <Empty text="Отзывов пока нет" />}
          </Section>
        </div>
      </div>
    );
  }

  // ── DASHBOARD (executor) ──
  if (view === "dashboard") {
    const me = myExecutor || ensureMyExecutor();
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        {toast && <Toast msg={toast} />}
        <ModuleHeader title="Кабинет исполнителя" onBack={() => setView("list")} icon="LayoutDashboard" iconColor="#0ea5e9" />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
          {/* Баннер */}
          <div className="rounded-2xl overflow-hidden h-28 relative" style={{ background: 'linear-gradient(135deg,#0ea5e9,#0284c7)' }}>
            {me.banner && <img src={me.banner} alt="" className="w-full h-full object-cover" />}
            <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={handleBanner} />
            <button onClick={() => bannerRef.current?.click()} className="absolute bottom-2 right-2 px-3 py-1.5 rounded-lg text-xs font-medium text-white flex items-center gap-1.5" style={{ background: 'rgba(0,0,0,0.5)' }}><Icon name="ImagePlus" size={13} />{me.banner ? "Заменить баннер" : "Загрузить баннер"}</button>
          </div>

          {/* Профиль */}
          <div className="glass rounded-2xl p-4 space-y-3">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Профиль</p>
            <Field label="Наименование" value={me.name} onChange={v => updateMine({ name: v })} />
            <div>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Категория</label>
              <div className="flex flex-wrap gap-2">{CATEGORIES.map(c => <button key={c} onClick={() => updateMine({ category: c })} className="px-3 py-1.5 rounded-xl text-xs" style={{ background: me.category === c ? 'rgba(14,165,233,0.2)' : 'rgba(255,255,255,0.06)', border: `1px solid ${me.category === c ? 'rgba(14,165,233,0.4)' : 'rgba(255,255,255,0.1)'}`, color: me.category === c ? '#0ea5e9' : 'rgba(255,255,255,0.5)' }}>{c}</button>)}</div>
            </div>
            <Field label="Город" value={me.city} onChange={v => updateMine({ city: v })} />
            <Field label="Адрес / геокоординаты" value={me.address} onChange={v => updateMine({ address: v })} />
            <Field label="Информация о себе" value={me.about} onChange={v => updateMine({ about: v })} textarea />
            <Field label="Контакты" value={me.contacts} onChange={v => updateMine({ contacts: v })} />
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="flex items-center gap-2"><Icon name="Star" size={16} color="#facc15" /><span className="text-sm text-white/70">Рейтинг</span></div>
              <span className="text-base font-bold text-yellow-400">{me.rating.toFixed(1)}</span>
            </div>
            <button onClick={() => updateMine({ visible: !me.visible })} className="w-full flex items-center gap-3 p-3 rounded-xl" style={{ background: me.visible ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${me.visible ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.1)'}` }}>
              <Icon name={me.visible ? "Eye" : "EyeOff"} size={16} color={me.visible ? "#10b981" : "rgba(255,255,255,0.5)"} />
              <span className="text-sm text-white/80 flex-1 text-left">{me.visible ? "Виден в общем списке" : "Скрыт из общего списка"}</span>
              <div className="w-10 h-6 rounded-full flex items-center px-0.5 transition-all" style={{ background: me.visible ? '#10b981' : 'rgba(255,255,255,0.15)' }}><div className="w-5 h-5 rounded-full bg-white transition-all" style={{ marginLeft: me.visible ? '16px' : '0' }} /></div>
            </button>
          </div>

          {/* Услуги */}
          <ListEditor title="Услуги" icon="ListChecks" items={me.services.map(s => ({ id: s.id, primary: s.name, secondary: `от ${s.price.toLocaleString("ru-RU")} ₽` }))}
            onAdd={() => { setEditingService({ id: Date.now(), name: "", price: 0, description: "" }); setView("editService"); }}
            onEdit={id => { const s = me.services.find(x => x.id === id); if (s) { setEditingService(s); setView("editService"); } }}
            onDelete={id => updateMine({ services: me.services.filter(x => x.id !== id) })} />

          {/* Кейсы */}
          <ListEditor title="Кейсы" icon="Images" items={me.cases.map(c => ({ id: c.id, primary: c.title, secondary: c.mediaType === "video" ? "Видео" : "Фото" }))}
            onAdd={() => { setEditingCase({ id: Date.now(), title: "", description: "", media: "", mediaType: "image" }); setView("editCase"); }}
            onEdit={id => { const c = me.cases.find(x => x.id === id); if (c) { setEditingCase(c); setView("editCase"); } }}
            onDelete={id => updateMine({ cases: me.cases.filter(x => x.id !== id) })} />

          {/* Отзывы */}
          <ListEditor title="Отзывы" icon="MessageCircle" items={me.reviews.map(r => ({ id: r.id, primary: r.author, secondary: `${r.rating}★` }))}
            onAdd={() => { setEditingReview({ id: Date.now(), author: "", rating: 5, text: "", date: new Date().toLocaleDateString("ru-RU") }); setView("editReview"); }}
            onEdit={id => { const r = me.reviews.find(x => x.id === id); if (r) { setEditingReview(r); setView("editReview"); } }}
            onDelete={id => updateMine({ reviews: me.reviews.filter(x => x.id !== id) })} />

          <button onClick={() => { setSelectedId(me.id); setView("profile"); }} className="btn-ghost flex items-center justify-center gap-2 text-sm"><Icon name="Eye" size={16} />Предпросмотр профиля</button>
        </div>
      </div>
    );
  }

  // ── EDIT SERVICE / CASE / REVIEW ──
  if (view === "editService" && editingService) {
    return (
      <FormScreen title="Услуга" onBack={() => setView("dashboard")} onSave={() => { const me = myExecutor || ensureMyExecutor(); updateMine({ services: me.services.some(s => s.id === editingService.id) ? me.services.map(s => s.id === editingService.id ? editingService : s) : [...me.services, editingService] }); showToast("✅ Сохранено"); setView("dashboard"); }} canSave={!!editingService.name.trim()}>
        <Field label="Название услуги" value={editingService.name} onChange={v => setEditingService(s => s && { ...s, name: v })} />
        <Field label="Цена, ₽" value={String(editingService.price || "")} onChange={v => setEditingService(s => s && { ...s, price: Number(v) || 0 })} type="number" />
        <Field label="Описание" value={editingService.description} onChange={v => setEditingService(s => s && { ...s, description: v })} textarea />
      </FormScreen>
    );
  }
  if (view === "editCase" && editingCase) {
    return (
      <FormScreen title="Кейс" onBack={() => setView("dashboard")} onSave={() => { const me = myExecutor || ensureMyExecutor(); updateMine({ cases: me.cases.some(c => c.id === editingCase.id) ? me.cases.map(c => c.id === editingCase.id ? editingCase : c) : [...me.cases, editingCase] }); showToast("✅ Сохранено"); setView("dashboard"); }} canSave={!!editingCase.title.trim()}>
        <Field label="Название кейса" value={editingCase.title} onChange={v => setEditingCase(c => c && { ...c, title: v })} />
        <Field label="Описание работы" value={editingCase.description} onChange={v => setEditingCase(c => c && { ...c, description: v })} textarea />
        <div>
          <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Фото / видео</label>
          <input ref={caseMediaRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleCaseMedia} />
          {editingCase.media ? (
            <div className="rounded-xl overflow-hidden relative">{editingCase.mediaType === "video" ? <video src={editingCase.media} className="w-full h-40 object-cover" controls /> : <img src={editingCase.media} alt="" className="w-full h-40 object-cover" />}<button onClick={() => setEditingCase(c => c && { ...c, media: "" })} className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}><Icon name="X" size={15} color="white" /></button></div>
          ) : <button onClick={() => caseMediaRef.current?.click()} className="w-full flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)' }}><Icon name="Upload" size={18} color="rgba(255,255,255,0.4)" /><span className="text-sm text-white/40">Загрузить фото или видео</span></button>}
        </div>
      </FormScreen>
    );
  }
  if (view === "editReview" && editingReview) {
    return (
      <FormScreen title="Отзыв" onBack={() => setView("dashboard")} onSave={() => { const me = myExecutor || ensureMyExecutor(); const reviews = me.reviews.some(r => r.id === editingReview.id) ? me.reviews.map(r => r.id === editingReview.id ? editingReview : r) : [...me.reviews, editingReview]; const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 5; updateMine({ reviews, rating: Math.round(avg * 10) / 10 }); showToast("✅ Сохранено"); setView("dashboard"); }} canSave={!!editingReview.author.trim()}>
        <Field label="Автор" value={editingReview.author} onChange={v => setEditingReview(r => r && { ...r, author: v })} />
        <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Оценка</label><div className="flex gap-1">{[1,2,3,4,5].map(n => <button key={n} onClick={() => setEditingReview(r => r && { ...r, rating: n })}><Icon name="Star" size={24} color={n <= editingReview.rating ? "#facc15" : "rgba(255,255,255,0.2)"} /></button>)}</div></div>
        <Field label="Текст отзыва" value={editingReview.text} onChange={v => setEditingReview(r => r && { ...r, text: v })} textarea />
      </FormScreen>
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
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(14,165,233,0.2)', border: '1px solid rgba(14,165,233,0.3)' }}><Icon name="Store" size={16} color="#0ea5e9" /></div>
            <div className="flex-1"><h1 className="text-base font-bold text-white">Оказание услуг</h1><p className="text-xs text-white/40">{filtered.length} исполнителей</p></div>
            {isExecutor && <button onClick={() => setView("dashboard")} className="p-2 rounded-xl hover:bg-white/10 transition-colors"><Icon name="LayoutDashboard" size={18} color="#0ea5e9" /></button>}
          </div>
          {/* CTA роли */}
          {!isExecutor && (
            myReq && myReq.status === "approved" && !myReq.paid ? (
              <button onClick={() => setView("payment")} className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-left" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.4)' }}><Icon name="Wallet" size={16} color="#10b981" /><span className="text-sm font-medium text-white flex-1">Заявка одобрена — оплатите доступ исполнителя</span><Icon name="ChevronRight" size={15} color="#10b981" /></button>
            ) : myReq && myReq.status === "pending" ? (
              <div className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.1)', border: '1px dashed rgba(245,158,11,0.35)' }}><Icon name="Clock" size={16} color="#f59e0b" /><span className="text-sm font-medium text-white flex-1">Заявка на рассмотрении администрацией</span></div>
            ) : (
              <button onClick={() => { setRequestPhone(currentUser.phone || ""); setRequestAgreed(false); setView("request"); }} className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-left" style={{ background: 'rgba(14,165,233,0.1)', border: '1px dashed rgba(14,165,233,0.35)' }}><Icon name="Store" size={16} color="#0ea5e9" /><span className="text-sm font-medium text-white flex-1">Стать исполнителем · {EXECUTOR_PRICE.toLocaleString("ru-RU")} ₽/мес</span><Icon name="ChevronRight" size={15} color="rgba(14,165,233,0.6)" /></button>
            )
          )}
          <div className="relative"><Icon name="Search" size={15} color="rgba(255,255,255,0.3)" className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" /><input className="input-field pl-9 py-2.5 text-sm" placeholder="Поиск по услуге или компании..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-3 pb-8 space-y-3">
        {/* Фильтры */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setCatFilter("Все")} className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium" style={{ background: catFilter === "Все" ? 'rgba(14,165,233,0.25)' : 'rgba(255,255,255,0.05)', border: `1px solid ${catFilter === "Все" ? 'rgba(14,165,233,0.5)' : 'rgba(255,255,255,0.08)'}`, color: catFilter === "Все" ? '#0ea5e9' : 'rgba(255,255,255,0.5)' }}>Все</button>
          {CATEGORIES.map(c => <button key={c} onClick={() => setCatFilter(c)} className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium" style={{ background: catFilter === c ? 'rgba(14,165,233,0.25)' : 'rgba(255,255,255,0.05)', border: `1px solid ${catFilter === c ? 'rgba(14,165,233,0.5)' : 'rgba(255,255,255,0.08)'}`, color: catFilter === c ? '#0ea5e9' : 'rgba(255,255,255,0.5)' }}>{c}</button>)}
        </div>
        <div className="flex gap-2">
          <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} className="flex-1 input-field py-2 text-sm" style={{ background: 'rgba(255,255,255,0.06)' }}>{CITIES.map(c => <option key={c} value={c} style={{ background: '#1a1a2e' }}>{c}</option>)}</select>
          <div className="flex gap-1">{RATING_FILTERS.map(r => <button key={r.v} onClick={() => setRatingFilter(r.v)} className="px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1" style={{ background: ratingFilter === r.v ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${ratingFilter === r.v ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.08)'}`, color: ratingFilter === r.v ? '#f59e0b' : 'rgba(255,255,255,0.5)' }}>{r.v > 0 && <Icon name="Star" size={11} color="#f59e0b" />}{r.label}</button>)}</div>
        </div>

        {/* Карточки */}
        {filtered.map((e, i) => (
          <button key={e.id} onClick={() => { setSelectedId(e.id); setView("profile"); }} className="w-full text-left glass rounded-2xl overflow-hidden animate-fade-up opacity-0 hover:border-white/20 transition-all" style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'forwards' }}>
            <div className="h-20 relative" style={{ background: 'linear-gradient(135deg,#0ea5e9,#0284c7)' }}>{e.banner && <img src={e.banner} alt="" className="w-full h-full object-cover" />}<span className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-lg" style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }}>{e.category}</span></div>
            <div className="p-3">
              <div className="flex items-center justify-between"><p className="text-sm font-semibold text-white">{e.name}</p><span className="flex items-center gap-1 text-sm font-semibold text-yellow-400"><Icon name="Star" size={13} color="#facc15" />{e.rating.toFixed(1)}</span></div>
              <p className="text-xs text-white/50 mt-0.5">{e.services[0]?.name || "Услуги"}{e.services[0] ? ` · от ${e.services[0].price.toLocaleString("ru-RU")} ₽` : ""}</p>
              <p className="text-xs text-white/40 mt-1 flex items-center gap-1"><Icon name="MapPin" size={11} />{e.city}</p>
            </div>
          </button>
        ))}
        {filtered.length === 0 && <div className="text-center py-14"><Icon name="Store" size={32} color="rgba(255,255,255,0.2)" className="mx-auto mb-3" /><p className="text-white/30 text-sm">Исполнители не найдены</p></div>}
      </div>
    </div>
  );
}

function Stat() { return null; }
function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return <div><p className="text-xs font-semibold text-white/40 uppercase tracking-wider px-1 mb-2 flex items-center gap-1.5"><Icon name={icon} size={13} color="#0ea5e9" />{title}</p><div className="space-y-2">{children}</div></div>;
}
function Empty({ text }: { text: string }) { return <p className="text-center py-4 text-white/30 text-sm">{text}</p>; }
function ListEditor({ title, icon, items, onAdd, onEdit, onDelete }: { title: string; icon: string; items: { id: number; primary: string; secondary: string }[]; onAdd: () => void; onEdit: (id: number) => void; onDelete: (id: number) => void }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3"><p className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5"><Icon name={icon} size={13} color="#0ea5e9" />{title}</p><button onClick={onAdd} className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1" style={{ background: 'rgba(14,165,233,0.15)', color: '#0ea5e9' }}><Icon name="Plus" size={12} color="#0ea5e9" />Добавить</button></div>
      <div className="space-y-2">
        {items.map(it => <div key={it.id} className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}><div className="flex-1 min-w-0"><p className="text-sm text-white truncate">{it.primary}</p><p className="text-xs text-white/40">{it.secondary}</p></div><button onClick={() => onEdit(it.id)} className="p-1.5 rounded-lg hover:bg-white/10"><Icon name="Pencil" size={13} color="rgba(255,255,255,0.6)" /></button><button onClick={() => onDelete(it.id)} className="p-1.5 rounded-lg hover:bg-white/10"><Icon name="Trash2" size={13} color="rgba(239,68,68,0.7)" /></button></div>)}
        {items.length === 0 && <p className="text-center py-3 text-white/30 text-xs">Пусто</p>}
      </div>
    </div>
  );
}
function FormScreen({ title, onBack, onSave, canSave, children }: { title: string; onBack: () => void; onSave: () => void; canSave: boolean; children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      <ModuleHeader title={title} onBack={onBack} icon="Pencil" iconColor="#0ea5e9" />
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
        {children}
        <button onClick={onSave} disabled={!canSave} className="btn-primary flex items-center justify-center gap-2 disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}><Icon name="Check" size={18} />Сохранить</button>
      </div>
    </div>
  );
}
function Field({ label, value, onChange, placeholder, textarea, type }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean; type?: string }) {
  return (
    <div>
      <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">{label}</label>
      {textarea ? <textarea className="input-field resize-none" rows={3} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} /> : <input className="input-field" type={type || "text"} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />}
    </div>
  );
}
function Toast({ msg }: { msg: string }) {
  return <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl text-sm font-medium text-white animate-fade-up" style={{ background: 'rgba(14,165,233,0.92)', backdropFilter: 'blur(12px)', animationFillMode: 'forwards' }}>{msg}</div>;
}
