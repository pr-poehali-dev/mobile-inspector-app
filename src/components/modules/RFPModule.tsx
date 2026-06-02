import { useState } from "react";
import Icon from "@/components/ui/icon";
import ModuleHeader from "@/components/ModuleHeader";

interface Props { onBack: () => void; }

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
  const [view, setView] = useState<"list" | "create" | "compare" | "upload">("list");
  const [selectedRfp, setSelectedRfp] = useState<typeof RFPS[0] | null>(null);
  const [form, setForm] = useState({ title: "", desc: "", deadline: "", category: "" });
  const [rfpList, setRfpList] = useState(RFPS);
  const [toast, setToast] = useState<string | null>(null);
  const [uploadCompany, setUploadCompany] = useState("");
  const [uploadPrice, setUploadPrice] = useState("");
  const [uploadFile, setUploadFile] = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const saveDraft = () => {
    if (!form.title) return;
    setRfpList(prev => [...prev, { id: Date.now(), title: form.title, desc: form.desc, category: form.category || "Без категории", deadline: form.deadline || "—", status: "Черновик" as Status, proposals: 0 }]);
    setForm({ title: "", desc: "", deadline: "", category: "" });
    setView("list");
    showToast("💾 Черновик сохранён");
  };

  const publish = () => {
    if (!form.title) return;
    setRfpList(prev => [...prev, { id: Date.now(), title: form.title, desc: form.desc, category: form.category || "Без категории", deadline: form.deadline || "—", status: "Активен" as Status, proposals: 0 }]);
    setForm({ title: "", desc: "", deadline: "", category: "" });
    setView("list");
    showToast("🚀 Запрос опубликован");
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
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Файл предложения</label>
            <div className="border-2 border-dashed border-white/15 rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer hover:border-violet-500/50 transition-colors" onClick={() => setUploadFile("proposal.pdf")}>
              <Icon name="Upload" size={24} color={uploadFile ? "#8b5cf6" : "rgba(255,255,255,0.3)"} />
              <span className="text-xs" style={{ color: uploadFile ? '#a78bfa' : 'rgba(255,255,255,0.4)' }}>
                {uploadFile ? `✓ ${uploadFile}` : "Нажмите для выбора PDF/DOCX"}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setView("list")} className="btn-ghost flex-1 text-sm">Отмена</button>
            <button className="btn-primary flex-1 text-sm flex items-center justify-center gap-2" disabled={!uploadCompany || !uploadPrice}
              onClick={() => { setView("list"); showToast("📎 Предложение загружено и отправлено заказчику"); setUploadCompany(""); setUploadPrice(""); setUploadFile(""); }}>
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
                  <tr key={p.id} className={`border-t border-white/8 ${i === 1 ? "opacity-60" : ""}`}>
                    <td className="py-3 pr-4">
                      <div className="font-medium text-white">{p.company}</div>
                      <button className="text-xs text-blue-400 flex items-center gap-1 mt-0.5"><Icon name="Paperclip" size={11} />{p.file}</button>
                    </td>
                    <td className="py-3 pr-4 font-semibold" style={{ color: i === 1 ? '#10b981' : 'white' }}>{p.price}</td>
                    <td className="py-3 pr-4 text-white/70">{p.delivery}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-1 text-yellow-400 text-xs font-semibold">
                        <Icon name="Star" size={12} color="#facc15" />{p.rating}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="text-xs text-white/40 mb-1">Рекомендация системы</p>
            <p className="text-sm text-white font-medium">Лучшая цена: <span className="text-green-400">ИП Сидоров А.В. — 720 000 ₽</span></p>
            <p className="text-sm text-white/70 mt-1">Лучший рейтинг: АО «Мебель Центр» — 4.9★</p>
          </div>
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

  return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl text-sm font-medium text-white animate-fade-up" style={{ background: 'rgba(139,92,246,0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(139,92,246,0.5)' }}>
          {toast}
        </div>
      )}
      <ModuleHeader title="Запрос предложений" onBack={onBack} subtitle={`${rfpList.length} запросов`} icon="FileSearch" iconColor="#8b5cf6" />
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