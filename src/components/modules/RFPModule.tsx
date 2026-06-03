import { useState, useRef } from "react";
import Icon from "@/components/ui/icon";
import ModuleHeader from "@/components/ModuleHeader";
import { useApp } from "@/context/AppContext";

interface Props { onBack: () => void; }

interface MyProposal { id: number; rfpId: number; rfpTitle: string; company: string; price: string; delivery: string; file: string; rating: number; date: string; }

type Status = "Черновик" | "Активен" | "На рассмотрении" | "Закрыт";

const STATUS_COLORS: Record<Status, { bg: string; text: string; border: string }> = {
  "Черновик": { bg: "rgba(148,163,184,0.15)", text: "#94a3b8", border: "rgba(148,163,184,0.3)" },
  "Активен": { bg: "rgba(16,185,129,0.15)", text: "#10b981", border: "rgba(16,185,129,0.3)" },
  "На рассмотрении": { bg: "rgba(245,158,11,0.15)", text: "#f59e0b", border: "rgba(245,158,11,0.3)" },
  "Закрыт": { bg: "rgba(239,68,68,0.15)", text: "#ef4444", border: "rgba(239,68,68,0.3)" },
};

const RFPS = [
  { id: 1, title: "Поставка офисной мебели 2026", desc: "Требуется поставка столов, кресел и стеллажей для нового офиса.", category: "Оборудование", deadline: "15.06.2026", status: "Активен" as Status, proposals: 3 },
  { id: 2, title: "Услуги по уборке помещений", desc: "Ежедневная и генеральная уборка трёх офисных зданий.", category: "Услуги", deadline: "20.06.2026", status: "На рассмотрении" as Status, proposals: 5 },
  { id: 3, title: "Закупка серверного оборудования", desc: "Серверы, сетевые коммутаторы и системы хранения данных.", category: "IT", deadline: "30.05.2026", status: "Закрыт" as Status, proposals: 7 },
];

const PROPOSALS = [
  { id: 1, company: "ООО «МебельПро»", price: "850 000 ₽", delivery: "14 дней", rating: 4.8, file: "proposal_mebelpro.pdf" },
  { id: 2, company: "ИП Сидоров А.В.", price: "720 000 ₽", delivery: "21 день", rating: 4.2, file: "proposal_sidorov.pdf" },
  { id: 3, company: "АО «Мебель Центр»", price: "960 000 ₽", delivery: "7 дней", rating: 4.9, file: "proposal_mc.pdf" },
];

export default function RFPModule({ onBack }: Props) {
  const { currentUser } = useApp();
  const [view, setView] = useState<"list" | "create" | "compare" | "upload" | "cabinet">("list");
  const [selectedRfp, setSelectedRfp] = useState<typeof RFPS[0] | null>(null);
  const [form, setForm] = useState({ title: "", desc: "", deadline: "", category: "" });
  const [rfpList, setRfpList] = useState(RFPS.map(r => ({ ...r, ownerId: 0 })));
  const [toast, setToast] = useState<string | null>(null);
  const [uploadCompany, setUploadCompany] = useState("");
  const [uploadPrice, setUploadPrice] = useState("");
  const [uploadDelivery, setUploadDelivery] = useState("");
  const [uploadFile, setUploadFile] = useState("");
  const [myProposals, setMyProposals] = useState<MyProposal[]>([]);
  const [proposalRatings, setProposalRatings] = useState<Record<number, number>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const myRfps = rfpList.filter(r => r.ownerId === currentUser.id);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setUploadFile(f.name);
    e.target.value = "";
  };

  const saveDraft = () => {
    if (!form.title) return;
    setRfpList(prev => [...prev, { id: Date.now(), title: form.title, desc: form.desc, category: form.category || "Без категории", deadline: form.deadline || "—", status: "Черновик" as Status, proposals: 0, ownerId: currentUser.id }]);
    setForm({ title: "", desc: "", deadline: "", category: "" });
    setView("list");
    showToast("💾 Черновик сохранён");
  };

  const publish = () => {
    if (!form.title) return;
    setRfpList(prev => [...prev, { id: Date.now(), title: form.title, desc: form.desc, category: form.category || "Без категории", deadline: form.deadline || "—", status: "Активен" as Status, proposals: 0, ownerId: currentUser.id }]);
    setForm({ title: "", desc: "", deadline: "", category: "" });
    setView("list");
    showToast("🚀 Запрос опубликован");
  };

  const submitProposal = () => {
    if (!selectedRfp || !uploadCompany || !uploadPrice) return;
    const prop: MyProposal = { id: Date.now(), rfpId: selectedRfp.id, rfpTitle: selectedRfp.title, company: uploadCompany, price: uploadPrice, delivery: uploadDelivery || "—", file: uploadFile || "предложение.pdf", rating: 0, date: new Date().toLocaleDateString("ru-RU") };
    setMyProposals(prev => [prop, ...prev]);
    setRfpList(prev => prev.map(r => r.id === selectedRfp.id ? { ...r, proposals: r.proposals + 1 } : r));
    setView("list");
    showToast("📎 Предложение отправлено заказчику");
    setUploadCompany(""); setUploadPrice(""); setUploadDelivery(""); setUploadFile("");
  };

  if (view === "upload" && selectedRfp) {
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        <ModuleHeader title="Загрузить предложение" onBack={() => setView("list")} subtitle={selectedRfp.title} />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Название компании</label>
            <input className="input-field" placeholder="ООО «Ваша компания»" value={uploadCompany} onChange={e => setUploadCompany(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Предлагаемая цена</label>
            <input className="input-field" placeholder="0 ₽" value={uploadPrice} onChange={e => setUploadPrice(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Срок поставки</label>
            <input className="input-field" placeholder="Например: 14 дней" value={uploadDelivery} onChange={e => setUploadDelivery(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Файл предложения</label>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xlsx" className="hidden" onChange={handleFile} />
            <button onClick={() => fileRef.current?.click()} className="w-full border-2 border-dashed border-white/15 rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer hover:border-violet-500/50 transition-colors">
              <Icon name="Upload" size={24} color={uploadFile ? "#8b5cf6" : "rgba(255,255,255,0.3)"} />
              <span className="text-xs" style={{ color: uploadFile ? '#a78bfa' : 'rgba(255,255,255,0.4)' }}>
                {uploadFile ? `✓ ${uploadFile}` : "Нажмите для выбора PDF/DOCX/XLSX"}
              </span>
            </button>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setView("list")} className="btn-ghost flex-1 text-sm">Отмена</button>
            <button className="btn-primary flex-1 text-sm flex items-center justify-center gap-2" disabled={!uploadCompany || !uploadPrice} onClick={submitProposal}>
              <Icon name="Send" size={15} />Отправить
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === "compare" && selectedRfp) {
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        <ModuleHeader title="Сравнение предложений" onBack={() => setView("list")} subtitle={selectedRfp.title} />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left text-xs text-white/40 pb-2 pr-4">Поставщик</th>
                  <th className="text-left text-xs text-white/40 pb-2 pr-4">Цена</th>
                  <th className="text-left text-xs text-white/40 pb-2 pr-4">Срок</th>
                  <th className="text-left text-xs text-white/40 pb-2">Рейтинг</th>
                </tr>
              </thead>
              <tbody>
                {PROPOSALS.map((p, i) => (
                  <tr key={p.id} className="border-t border-white/8">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-white">{p.company}</div>
                      <button onClick={() => showToast(`📄 Открываю ${p.file}`)} className="text-xs text-blue-400 flex items-center gap-1 mt-0.5"><Icon name="Paperclip" size={11} />{p.file}</button>
                    </td>
                    <td className="py-3 pr-4 font-semibold text-white">{p.price}</td>
                    <td className="py-3 pr-4 text-white/70">{p.delivery}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(star => {
                          const current = proposalRatings[p.id] ?? Math.round(p.rating);
                          return (
                            <button key={star} onClick={() => { setProposalRatings(prev => ({ ...prev, [p.id]: star })); showToast(`Оценка ${star}★ выставлена`); }}>
                              <Icon name="Star" size={14} color={star <= current ? "#facc15" : "rgba(255,255,255,0.2)"} />
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="text-xs text-white/40 mb-2 uppercase tracking-wider font-semibold">Рекомендация системы</p>
            <div className="flex items-center gap-2 mb-1.5"><Icon name="TrendingDown" size={14} color="#10b981" /><p className="text-sm text-white">Лучшая цена: <span className="text-green-400 font-medium">ИП Сидоров А.В. — 720 000 ₽</span></p></div>
            <div className="flex items-center gap-2 mb-1.5"><Icon name="Star" size={14} color="#facc15" /><p className="text-sm text-white">Лучший рейтинг: <span className="text-yellow-400 font-medium">АО «Мебель Центр» — 4.9★</span></p></div>
            <div className="flex items-center gap-2"><Icon name="Zap" size={14} color="#06b6d4" /><p className="text-sm text-white">Быстрее всех: <span className="text-cyan-400 font-medium">АО «Мебель Центр» — 7 дней</span></p></div>
          </div>
          <button onClick={() => showToast("✅ Победитель выбран, поставщик уведомлён")} className="btn-primary flex items-center justify-center gap-2"><Icon name="Award" size={18} />Выбрать победителя</button>
        </div>
      </div>
    );
  }

  if (view === "create") {
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        <ModuleHeader title="Новый запрос" onBack={() => setView("list")} />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Название запроса</label>
              <input className="input-field" placeholder="Например: Закупка оргтехники" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Описание</label>
              <textarea className="input-field resize-none" rows={4} placeholder="Подробное описание требований..." value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Категория</label>
              <input className="input-field" placeholder="Оборудование / Услуги / IT..." value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Срок приёма предложений</label>
              <input className="input-field" type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={saveDraft} className="btn-ghost flex-1" disabled={!form.title}>Сохранить черновик</button>
            <button onClick={publish} className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={!form.title || !form.desc}>
              <Icon name="Send" size={16} />Опубликовать
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── CABINET ──
  if (view === "cabinet") {
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl text-sm font-medium text-white animate-fade-up" style={{ background: 'rgba(139,92,246,0.9)', backdropFilter: 'blur(12px)' }}>{toast}</div>}
        <ModuleHeader title="Мой кабинет" onBack={() => setView("list")} icon="LayoutDashboard" iconColor="#8b5cf6" />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="glass rounded-2xl p-4 text-center"><div className="text-2xl font-bold text-white">{myRfps.length}</div><div className="text-xs text-white/40">Мои запросы</div></div>
            <div className="glass rounded-2xl p-4 text-center"><div className="text-2xl font-bold text-white">{myProposals.length}</div><div className="text-xs text-white/40">Мои предложения</div></div>
          </div>

          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider px-1">Созданные запросы</p>
          {myRfps.length > 0 ? myRfps.map(rfp => {
            const sc = STATUS_COLORS[rfp.status];
            return (
              <div key={rfp.id} className="glass rounded-2xl p-4">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="text-sm font-semibold text-white flex-1">{rfp.title}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-lg font-medium" style={{ background: sc.bg, color: sc.text }}>{rfp.status}</span>
                </div>
                <p className="text-xs text-white/40">до {rfp.deadline} · {rfp.proposals} предложений</p>
                <button onClick={() => { setSelectedRfp(rfp); setView("compare"); }} className="mt-2 text-xs text-blue-400 flex items-center gap-1"><Icon name="BarChart3" size={12} />Сравнить предложения</button>
              </div>
            );
          }) : <div className="text-center py-6 text-white/30 text-sm">Вы ещё не создавали запросы</div>}

          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider px-1">Отправленные предложения</p>
          {myProposals.length > 0 ? myProposals.map(p => (
            <div key={p.id} className="glass rounded-2xl p-4">
              <p className="text-xs text-white/40 mb-1">По запросу: {p.rfpTitle}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">{p.company}</span>
                <span className="text-sm font-semibold text-green-400">{p.price}</span>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-white/40">
                <span className="flex items-center gap-1"><Icon name="Clock" size={11} />{p.delivery}</span>
                <span className="flex items-center gap-1"><Icon name="Paperclip" size={11} />{p.file}</span>
                <span className="ml-auto">{p.date}</span>
              </div>
            </div>
          )) : <div className="text-center py-6 text-white/30 text-sm">Вы ещё не отправляли предложения</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl text-sm font-medium text-white animate-fade-up" style={{ background: 'rgba(139,92,246,0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(139,92,246,0.5)' }}>
          {toast}
        </div>
      )}
      <div className="glass border-b border-white/10 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/10 transition-colors flex-shrink-0"><Icon name="ArrowLeft" size={20} color="white" /></button>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)' }}><Icon name="FileSearch" size={16} color="#8b5cf6" /></div>
          <div className="flex-1"><h1 className="text-base font-bold text-white">Запрос предложений</h1><p className="text-xs text-white/40">{rfpList.length} запросов</p></div>
          <button onClick={() => setView("cabinet")} className="relative p-2 rounded-xl hover:bg-white/10 transition-colors">
            <Icon name="LayoutDashboard" size={18} color="#8b5cf6" />
            {myProposals.length > 0 && <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold" style={{ background: '#8b5cf6', fontSize: '9px' }}>{myProposals.length}</span>}
          </button>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
        <button onClick={() => setView("create")} className="btn-primary flex items-center justify-center gap-2 animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
          <Icon name="Plus" size={18} />Создать запрос предложений
        </button>
        <div className="space-y-3">
          {rfpList.map((rfp, i) => {
            const sc = STATUS_COLORS[rfp.status];
            return (
              <div key={rfp.id} className={`card-module animate-fade-up opacity-0`} style={{ animationDelay: `${0.1 + i * 0.07}s`, animationFillMode: 'forwards' }}>
                <div className="flex items-start justify-between mb-2">
                  <span className="tag text-xs">{rfp.category}</span>
                  <span className="text-xs px-2 py-1 rounded-lg font-medium" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>{rfp.status}</span>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{rfp.title}</h3>
                <p className="text-xs text-white/50 mb-3 line-clamp-2">{rfp.desc}</p>
                <div className="flex items-center justify-between text-xs text-white/40 mb-3">
                  <span className="flex items-center gap-1"><Icon name="Calendar" size={11} />до {rfp.deadline}</span>
                  <span className="flex items-center gap-1"><Icon name="FileText" size={11} />{rfp.proposals} предложений</span>
                </div>
                <div className="flex gap-2 pt-3 border-t border-white/8">
                  <button onClick={() => { setSelectedRfp(rfp); setView("upload"); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium text-white/60 hover:text-white transition-colors hover:bg-white/10 active:scale-95">
                    <Icon name="Upload" size={13} />Загрузить предложение
                  </button>
                  <button onClick={() => { setSelectedRfp(rfp); setView("compare"); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors active:scale-95" style={{ background: 'rgba(27,111,255,0.1)', border: '1px solid rgba(27,111,255,0.2)' }}>
                    <Icon name="BarChart3" size={13} />Сравнить
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}