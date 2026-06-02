import { useState } from "react";
import Icon from "@/components/ui/icon";
import ModuleHeader from "@/components/ModuleHeader";

interface Props { onBack: () => void; }

type DocAction = { docName: string; type: "send" } | null;

const DOCS = [
  { id: 1, name: "Договор поставки №245-2026", type: "PDF", category: "Договоры", direction: "Входящий", dept: "Отдел закупок", date: "01.06.2026", size: "1.2 МБ" },
  { id: 2, name: "Акт приёмки-передачи оборудования", type: "DOCX", category: "Акты", direction: "Внутренний", dept: "Склад", date: "30.05.2026", size: "340 КБ" },
  { id: 3, name: "Приказ №18 о назначении ответственных", type: "PDF", category: "Приказы", direction: "Внутренний", dept: "Руководство", date: "28.05.2026", size: "450 КБ" },
  { id: 4, name: "Инструкция по охране труда 2024", type: "PDF", category: "Инструкции", direction: "Внутренний", dept: "ОТиТБ", date: "25.05.2026", size: "2.1 МБ" },
  { id: 5, name: "Ежеквартальный отчёт Q1 2026", type: "XLSX", category: "Отчёты", direction: "Исходящий", dept: "Финансы", date: "20.05.2026", size: "560 КБ" },
  { id: 6, name: "Коммерческое предложение для ООО «Альфа»", type: "PDF", category: "Договоры", direction: "Исходящий", dept: "Продажи", date: "18.05.2026", size: "890 КБ" },
];

const FILE_ICONS: Record<string, { icon: string; color: string }> = {
  PDF: { icon: "FileText", color: "#ef4444" },
  DOCX: { icon: "FileType", color: "#3b82f6" },
  XLSX: { icon: "Table", color: "#10b981" },
};

const CATEGORIES = ["Все", "Договоры", "Акты", "Приказы", "Инструкции", "Отчёты"];
const DIRECTIONS = ["Все", "Входящий", "Исходящий", "Внутренний"];

export default function DocumentsModule({ onBack }: Props) {
  const [catFilter, setCatFilter] = useState("Все");
  const [dirFilter, setDirFilter] = useState("Все");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [docAction, setDocAction] = useState<DocAction>(null);
  const [sendEmail, setSendEmail] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleDownload = (docName: string) => showToast(`📥 Загружается: ${docName}`);
  const handlePrint = (docName: string) => { window.print(); showToast(`🖨️ Отправлено на печать: ${docName}`); };

  const filtered = DOCS.filter(d =>
    (catFilter === "Все" || d.category === catFilter) &&
    (dirFilter === "Все" || d.direction === dirFilter) &&
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl text-sm font-medium text-white animate-fade-up" style={{ background: 'rgba(27,111,255,0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(27,111,255,0.5)' }}>
          {toast}
        </div>
      )}
      {/* Send modal */}
      {docAction && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} onClick={() => setDocAction(null)}>
          <div className="w-full max-w-2xl animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }} onClick={e => e.stopPropagation()}>
            <div className="glass-strong rounded-t-3xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white">Отправить документ</h3>
              <p className="text-xs text-white/50 truncate">{docAction.docName}</p>
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">Email или получатель</label>
                <input className="input-field" placeholder="email@company.ru" value={sendEmail} onChange={e => setSendEmail(e.target.value)} autoFocus />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setDocAction(null)} className="btn-ghost flex-1 text-sm">Отмена</button>
                <button className="btn-primary flex-1 text-sm flex items-center justify-center gap-2" onClick={() => { setDocAction(null); setSendEmail(""); showToast(`✉️ Документ отправлен на ${sendEmail || "адрес"}`); }} disabled={!sendEmail}>
                  <Icon name="Send" size={15} />Отправить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ModuleHeader title="Документооборот" onBack={onBack} subtitle={`${DOCS.length} документов`} icon="FolderOpen" iconColor="#10b981" />
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
        <div className="animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
          <div className="relative">
            <Icon name="Search" size={16} color="rgba(255,255,255,0.3)" className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input className="input-field pl-10" placeholder="Поиск по названию..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 animate-fade-up opacity-0 delay-100" style={{ animationFillMode: 'forwards' }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCatFilter(cat)} className={`px-3 py-1.5 rounded-xl text-xs font-medium flex-shrink-0 transition-all ${catFilter === cat ? "text-white" : "text-white/50"}`} style={{ background: catFilter === cat ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.05)', border: `1px solid ${catFilter === cat ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.08)'}` }}>
              {cat}
            </button>
          ))}
        </div>

        <div className="flex gap-2 animate-fade-up opacity-0 delay-150" style={{ animationFillMode: 'forwards' }}>
          {DIRECTIONS.map(dir => (
            <button key={dir} onClick={() => setDirFilter(dir)} className={`px-3 py-1.5 rounded-xl text-xs font-medium flex-shrink-0 transition-all ${dirFilter === dir ? "text-white" : "text-white/50"}`} style={{ background: dirFilter === dir ? 'rgba(27,111,255,0.25)' : 'rgba(255,255,255,0.05)', border: `1px solid ${dirFilter === dir ? 'rgba(27,111,255,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
              {dir}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.map((doc, i) => {
            const fi = FILE_ICONS[doc.type] || { icon: "File", color: "#94a3b8" };
            return (
              <div key={doc.id} className={`glass rounded-2xl p-4 animate-fade-up opacity-0`} style={{ animationDelay: `${0.15 + i * 0.05}s`, animationFillMode: 'forwards' }}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${fi.color}15`, border: `1px solid ${fi.color}30` }}>
                    <Icon name={fi.icon} size={20} color={fi.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white leading-snug mb-1">{doc.name}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-white/40">
                      <span className="flex items-center gap-1"><Icon name="Building2" size={11} />{doc.dept}</span>
                      <span className="flex items-center gap-1"><Icon name="Calendar" size={11} />{doc.date}</span>
                      <span>{doc.size}</span>
                    </div>
                    <div className="flex gap-2 mt-1.5">
                      <span className="tag text-xs">{doc.category}</span>
                      <span className="tag text-xs" style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>{doc.direction}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-white/8">
                  <button onClick={() => handleDownload(doc.name)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white transition-colors hover:bg-white/10 active:scale-95">
                    <Icon name="Download" size={13} />Скачать
                  </button>
                  <button onClick={() => setDocAction({ docName: doc.name, type: "send" })} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white transition-colors hover:bg-white/10 active:scale-95">
                    <Icon name="Mail" size={13} />Отправить
                  </button>
                  <button onClick={() => handlePrint(doc.name)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white transition-colors hover:bg-white/10 active:scale-95">
                    <Icon name="Printer" size={13} />Печать
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