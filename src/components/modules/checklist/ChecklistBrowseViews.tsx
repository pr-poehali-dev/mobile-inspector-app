import Icon from "@/components/ui/icon";
import ModuleHeader from "@/components/ModuleHeader";
import { Area, ChecklistData, HistoryRecord, Sphere, ViewMode } from "./data";

interface Props {
  view: ViewMode;
  onBack: () => void;
  isAdmin: boolean;
  spheres: Sphere[];
  selectedSphere: Sphere | null;
  selectedArea: Area | null;
  setSelectedSphere: (s: Sphere) => void;
  setSelectedArea: (a: Area) => void;
  setView: (v: ViewMode) => void;
  setAdminView: (v: "main") => void;
  history: HistoryRecord[];
  historyRecord: HistoryRecord | null;
  setHistoryRecord: (r: HistoryRecord) => void;
  pendingChecklist: ChecklistData | null;
  objectName: string;
  setObjectName: (v: string) => void;
  startSurvey: () => void;
  openSurvey: (cl: ChecklistData) => void;
  downloadPhoto: (dataUrl: string, idx: number) => void;
}

export default function ChecklistBrowseViews(props: Props) {
  const {
    view, onBack, isAdmin, spheres, selectedSphere, selectedArea,
    setSelectedSphere, setSelectedArea, setView, setAdminView,
    history, historyRecord, setHistoryRecord, pendingChecklist,
    objectName, setObjectName, startSurvey, openSurvey, downloadPhoto,
  } = props;

  // ── OBJECT NAME VIEW ────────────────────────────────────────────────────────
  if (view === "object" && pendingChecklist) {
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        <ModuleHeader title="Проверяемый объект" onBack={() => setView("checklists")} icon="MapPin" iconColor="#06b6d4" />
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-8 space-y-4">
          <div className="glass-strong rounded-2xl p-5 space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(6,182,212,0.2)' }}><Icon name="ClipboardCheck" size={24} color="#06b6d4" /></div>
              <div>
                <p className="text-sm font-semibold text-white">{pendingChecklist.title}</p>
                <p className="text-xs text-white/40">{selectedSphere?.title} → {selectedArea?.title}</p>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Наименование проверяемого объекта *</label>
              <input className="input-field" placeholder="Например: Склад №3, ул. Промышленная 12" value={objectName} onChange={e => setObjectName(e.target.value)} onKeyDown={e => e.key === "Enter" && startSurvey()} autoFocus />
              <p className="text-xs text-white/30 mt-2">Это название будет указано в отчёте и истории проверок</p>
            </div>
            <button onClick={startSurvey} className="btn-primary flex items-center justify-center gap-2" disabled={!objectName.trim()} style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>
              <Icon name="Play" size={18} />Начать проверку
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── HISTORY LIST ──────────────────────────────────────────────────────────
  if (view === "history") {
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        <ModuleHeader title="История проверок" onBack={() => setView("spheres")} icon="History" iconColor="#06b6d4" subtitle={`${history.length} проверок`} />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-3">
          {history.map((rec, i) => (
            <button key={rec.id} onClick={() => { setHistoryRecord(rec); setView("historyDetail"); }} className="w-full text-left glass rounded-2xl p-4 animate-fade-up opacity-0 hover:border-white/20 transition-all" style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'forwards' }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(6,182,212,0.15)' }}><Icon name="MapPin" size={18} color="#06b6d4" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{rec.objectName}</p>
                  <p className="text-xs text-white/40 truncate">{rec.checklistTitle}</p>
                  <p className="text-xs text-white/30 mt-0.5">{rec.date}</p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <span className="text-xs px-1.5 py-0.5 rounded-md font-semibold" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>{rec.yes}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-md font-semibold" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>{rec.no}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-md font-semibold" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>{rec.na}</span>
                </div>
              </div>
            </button>
          ))}
          {history.length === 0 && (
            <div className="text-center py-14">
              <Icon name="History" size={36} color="rgba(255,255,255,0.15)" className="mx-auto mb-3" />
              <p className="text-white/30 text-sm">История проверок пуста</p>
              <p className="text-white/20 text-xs mt-1">Завершите чек-лист и сохраните результат</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── HISTORY DETAIL ────────────────────────────────────────────────────────
  if (view === "historyDetail" && historyRecord) {
    const ANS_LABEL: Record<string, { label: string; color: string }> = { yes: { label: "Да", color: "#22c55e" }, no: { label: "Нет", color: "#ef4444" }, na: { label: "Не требуется", color: "#f59e0b" } };
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        <ModuleHeader title={historyRecord.objectName} onBack={() => setView("history")} subtitle={historyRecord.checklistTitle} />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 text-xs text-white/40 mb-3"><Icon name="Calendar" size={12} />{historyRecord.date}</div>
            <div className="grid grid-cols-3 gap-2">
              {[{ k: "yes", v: historyRecord.yes }, { k: "no", v: historyRecord.no }, { k: "na", v: historyRecord.na }].map(s => (
                <div key={s.k} className="text-center py-3 rounded-xl" style={{ background: `${ANS_LABEL[s.k].color}12` }}><div className="text-xl font-bold" style={{ color: ANS_LABEL[s.k].color }}>{s.v}</div><div className="text-xs" style={{ color: ANS_LABEL[s.k].color }}>{ANS_LABEL[s.k].label}</div></div>
              ))}
            </div>
          </div>
          {historyRecord.questions.map((q, i) => (
            <div key={i} className="glass rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm text-white/80 flex-1">{i + 1}. {q.text}</p>
                <span className="text-xs px-2 py-1 rounded-lg font-semibold flex-shrink-0" style={{ background: `${ANS_LABEL[q.answer || "na"].color}18`, color: ANS_LABEL[q.answer || "na"].color }}>{ANS_LABEL[q.answer || "na"].label}</span>
              </div>
              {q.note && <p className="text-xs text-white/50 italic mb-2">📝 {q.note}</p>}
              {q.photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {q.photos.map((p, pi) => (
                    <div key={pi} className="aspect-square rounded-xl overflow-hidden relative" style={{ background: 'rgba(139,92,246,0.15)' }}>
                      {p.startsWith("data:") ? <img src={p} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Icon name="ImageIcon" size={18} color="rgba(139,92,246,0.6)" /></div>}
                      {p.startsWith("data:") && <button onClick={() => downloadPhoto(p, pi)} className="absolute bottom-1 right-1 w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}><Icon name="Download" size={12} color="white" /></button>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── CHECKLISTS VIEW ──────────────────────────────────────────────────────────
  if (view === "checklists" && selectedArea) {
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        <ModuleHeader title={selectedArea.title} onBack={() => setView("areas")} subtitle={selectedSphere?.title} icon="ClipboardList" iconColor="#06b6d4" />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-3">
          {selectedArea.checklists.length === 0 ? (
            <div className="text-center py-16 text-white/30">
              <Icon name="ClipboardList" size={36} color="rgba(255,255,255,0.15)" className="mx-auto mb-3" />
              <p className="text-sm">Чек-листы не добавлены</p>
              <p className="text-xs mt-1">Администратор добавит их через панель управления</p>
            </div>
          ) : (
            selectedArea.checklists.map((cl, i) => (
              <button
                key={cl.id}
                onClick={() => openSurvey(cl)}
                className={`w-full text-left card-module animate-fade-up opacity-0`}
                style={{ animationDelay: `${i * 0.06}s`, animationFillMode: 'forwards' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.25)' }}>
                    <Icon name="ClipboardCheck" size={20} color="#06b6d4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{cl.title}</p>
                    <p className="text-xs text-white/40 mt-0.5">{cl.questions.length} вопросов</p>
                  </div>
                  <Icon name="ChevronRight" size={16} color="rgba(255,255,255,0.25)" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // ── AREAS VIEW ───────────────────────────────────────────────────────────────
  if (view === "areas" && selectedSphere) {
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        <ModuleHeader
          title={selectedSphere.title}
          onBack={() => setView("spheres")}
          icon={selectedSphere.icon}
          iconColor={selectedSphere.color}
          subtitle="Выберите область"
        />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-3">
          {selectedSphere.areas.length === 0 ? (
            <div className="text-center py-16 text-white/30">
              <Icon name="FolderOpen" size={36} color="rgba(255,255,255,0.15)" className="mx-auto mb-3" />
              <p className="text-sm">Области не добавлены</p>
            </div>
          ) : (
            selectedSphere.areas.map((area, i) => (
              <button
                key={area.id}
                onClick={() => { setSelectedArea(area); setView("checklists"); }}
                className={`w-full text-left card-module animate-fade-up opacity-0`}
                style={{ animationDelay: `${i * 0.06}s`, animationFillMode: 'forwards' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${selectedSphere.color}15`, border: `1px solid ${selectedSphere.color}25` }}>
                    <Icon name="Layers" size={20} color={selectedSphere.color} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{area.title}</p>
                    <p className="text-xs text-white/40 mt-0.5">{area.checklists.length} чек-листов</p>
                  </div>
                  <Icon name="ChevronRight" size={16} color="rgba(255,255,255,0.25)" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // ── SPHERES LIST ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      <div className="glass border-b border-white/10 px-4 py-4 sticky top-0 z-20">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
              <Icon name="ArrowLeft" size={20} color="white" />
            </button>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.2)', border: '1px solid rgba(6,182,212,0.3)' }}>
              <Icon name="CheckSquare" size={18} color="#06b6d4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Чек-листы</h1>
              <p className="text-xs text-white/40">Выберите сферу деятельности</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setView("history")}
              className="relative p-2 rounded-xl hover:bg-white/10 transition-colors"
              title="История проверок"
            >
              <Icon name="History" size={18} color="rgba(255,255,255,0.6)" />
              {history.length > 0 && <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold" style={{ background: '#06b6d4', fontSize: '9px' }}>{history.length}</span>}
            </button>
            {isAdmin && (
              <button
                onClick={() => { setView("admin"); setAdminView("main"); }}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                title="Администрирование"
              >
                <Icon name="Settings" size={18} color="rgba(255,255,255,0.5)" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8">
        <button onClick={() => setView("history")} className="w-full flex items-center gap-3 p-4 rounded-2xl text-left mb-4" style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(6,182,212,0.15)' }}><Icon name="History" size={20} color="#06b6d4" /></div>
          <div className="flex-1"><p className="text-sm font-semibold text-white">История проверок объектов</p><p className="text-xs text-white/40">{history.length} сохранённых проверок</p></div>
          <Icon name="ChevronRight" size={16} color="rgba(255,255,255,0.3)" />
        </button>
        <div className="grid grid-cols-2 gap-3">
          {spheres.map((sphere, i) => (
            <button
              key={sphere.id}
              onClick={() => { setSelectedSphere(sphere); setView("areas"); }}
              className={`card-module text-left animate-fade-up opacity-0`}
              style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'forwards' }}
            >
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3" style={{ background: `${sphere.color}15`, border: `1px solid ${sphere.color}25` }}>
                <Icon name={sphere.icon} size={22} color={sphere.color} />
              </div>
              <p className="text-sm font-semibold text-white leading-snug mb-1">{sphere.title}</p>
              <p className="text-xs" style={{ color: sphere.color + "99" }}>
                {sphere.areas.length > 0
                  ? `${sphere.areas.length} ${sphere.areas.length === 1 ? "область" : sphere.areas.length < 5 ? "области" : "областей"}`
                  : "Нет областей"}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
