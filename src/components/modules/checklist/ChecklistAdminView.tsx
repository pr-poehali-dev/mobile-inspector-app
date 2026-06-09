import { RefObject, useState } from "react";
import Icon from "@/components/ui/icon";
import ModuleHeader from "@/components/ModuleHeader";
import { Sphere } from "./data";

interface Props {
  spheres: Sphere[];
  adminView: "main" | "add-sphere" | "add-area" | "add-checklist";
  setAdminView: (v: "main" | "add-sphere" | "add-area" | "add-checklist") => void;
  setView: (v: "spheres") => void;
  adminSphereId: number | null;
  setAdminSphereId: (id: number) => void;
  adminAreaId: number | null;
  setAdminAreaId: (id: number) => void;
  newSphereTitle: string;
  setNewSphereTitle: (v: string) => void;
  newAreaTitle: string;
  setNewAreaTitle: (v: string) => void;
  newChecklistTitle: string;
  setNewChecklistTitle: (v: string) => void;
  addSphere: () => void;
  addArea: () => void;
  addChecklist: () => void;
  fileInputRef: RefObject<HTMLInputElement>;
}

export default function ChecklistAdminView(props: Props) {
  const {
    spheres, adminView, setAdminView, setView,
    adminSphereId, setAdminSphereId, adminAreaId, setAdminAreaId,
    newSphereTitle, setNewSphereTitle, newAreaTitle, setNewAreaTitle,
    newChecklistTitle, setNewChecklistTitle, addSphere, addArea, addChecklist, fileInputRef,
  } = props;

  // Форма загрузки файла: выбор сферы → области → названия → файл
  const [uploadStep, setUploadStep] = useState<"closed" | "sphere" | "area" | "name" | "file">("closed");
  const [uploadSphereId, setUploadSphereId] = useState<number | null>(null);
  const [uploadAreaId, setUploadAreaId] = useState<number | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFileName, setUploadFileName] = useState("");
  const uploadSphere = spheres.find(s => s.id === uploadSphereId);
  const uploadArea = uploadSphere?.areas.find(a => a.id === uploadAreaId);

  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setUploadFileName(f.name);
      setUploadStep("file");
    }
    e.target.value = "";
  };

  const resetUpload = () => {
    setUploadStep("closed");
    setUploadSphereId(null);
    setUploadAreaId(null);
    setUploadTitle("");
    setUploadFileName("");
  };

  const handleUploadSave = () => {
    if (!uploadSphereId || !uploadAreaId || !uploadTitle.trim()) return;
    setAdminSphereId(uploadSphereId);
    setAdminAreaId(uploadAreaId);
    setNewChecklistTitle(uploadTitle.trim());
    addChecklist();
    resetUpload();
  };

  return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      <ModuleHeader title="Администрирование чек-листов" onBack={() => setView("spheres")} icon="Settings" iconColor="#06b6d4" />
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
        {adminView === "main" && (
          <>
            {/* Upload Excel — с выбором сферы, области и названия */}
            <div className="glass-strong rounded-2xl p-5 animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.2)' }}>
                  <Icon name="FileSpreadsheet" size={20} color="#10b981" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Загрузить чек-листы из Excel</p>
                  <p className="text-xs text-white/40">Формат: .xlsx, .xls</p>
                </div>
              </div>

              {uploadStep === "closed" && (
                <button
                  onClick={() => setUploadStep("sphere")}
                  className="w-full border-2 border-dashed border-white/15 rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-cyan-500/50 transition-colors"
                >
                  <Icon name="Upload" size={28} color="rgba(255,255,255,0.3)" />
                  <p className="text-sm text-white/50 text-center">Нажмите для загрузки файла</p>
                </button>
              )}

              {/* Шаг 1: выбор сферы */}
              {uploadStep === "sphere" && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-white">Шаг 1 из 3 — Выберите сферу деятельности</p>
                  <div className="space-y-2">
                    {spheres.map(s => (
                      <button key={s.id} onClick={() => { setUploadSphereId(s.id); setUploadAreaId(null); setUploadStep("area"); }} className="w-full flex items-center gap-3 p-3 rounded-xl text-left" style={{ background: uploadSphereId === s.id ? `${s.color}18` : 'rgba(255,255,255,0.04)', border: `1px solid ${uploadSphereId === s.id ? `${s.color}50` : 'rgba(255,255,255,0.08)'}` }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${s.color}20` }}><Icon name={s.icon} size={15} color={s.color} /></div>
                        <span className="text-sm text-white">{s.title}</span>
                      </button>
                    ))}
                  </div>
                  <button onClick={resetUpload} className="btn-ghost w-full text-sm">Отмена</button>
                </div>
              )}

              {/* Шаг 2: выбор области */}
              {uploadStep === "area" && uploadSphere && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-white">Шаг 2 из 3 — Выберите область</p>
                  <p className="text-xs text-white/40">Сфера: {uploadSphere.title}</p>
                  <div className="space-y-2">
                    {uploadSphere.areas.map(a => (
                      <button key={a.id} onClick={() => { setUploadAreaId(a.id); setUploadStep("name"); }} className="w-full flex items-center gap-2 p-3 rounded-xl text-left" style={{ background: uploadAreaId === a.id ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${uploadAreaId === a.id ? 'rgba(6,182,212,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
                        <Icon name="ChevronRight" size={14} color="rgba(255,255,255,0.3)" />
                        <span className="text-sm text-white">{a.title}</span>
                        <span className="text-xs text-white/30 ml-auto">{a.checklists.length} чек-листов</span>
                      </button>
                    ))}
                    {uploadSphere.areas.length === 0 && <p className="text-xs text-white/30 text-center py-2">Нет областей — сначала добавьте область в эту сферу</p>}
                  </div>
                  <button onClick={() => setUploadStep("sphere")} className="btn-ghost w-full text-sm">← Назад</button>
                </div>
              )}

              {/* Шаг 3: название чек-листа + файл */}
              {(uploadStep === "name" || uploadStep === "file") && uploadSphere && uploadArea && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-white">Шаг 3 из 3 — Название и файл</p>
                  <p className="text-xs text-white/40">{uploadSphere.title} → {uploadArea.title}</p>
                  <div>
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Наименование чек-листа *</label>
                    <input className="input-field" placeholder="Название чек-листа..." value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} autoFocus />
                  </div>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUploadFile} />
                  <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-3 p-3.5 rounded-xl" style={{ background: uploadFileName ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)', border: uploadFileName ? '1px solid rgba(16,185,129,0.4)' : '2px dashed rgba(255,255,255,0.15)' }}>
                    <Icon name={uploadFileName ? "FileCheck" : "Upload"} size={20} color={uploadFileName ? "#10b981" : "rgba(255,255,255,0.3)"} />
                    <span className="text-sm flex-1 text-left" style={{ color: uploadFileName ? '#10b981' : 'rgba(255,255,255,0.5)' }}>{uploadFileName ? `✓ ${uploadFileName}` : "Выбрать .xlsx / .xls файл"}</span>
                  </button>
                  <p className="text-xs text-white/30">Файл должен содержать листы: Вопросы, Требования, Подсказки</p>
                  <div className="flex gap-2">
                    <button onClick={() => setUploadStep("area")} className="btn-ghost flex-1 text-sm">← Назад</button>
                    <button onClick={handleUploadSave} disabled={!uploadTitle.trim()} className="btn-primary flex-1 text-sm flex items-center justify-center gap-1.5 disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)' }}>
                      <Icon name="Plus" size={15} />Создать чек-лист
                    </button>
                  </div>
                </div>
              )}

              {uploadStep === "closed" && <p className="text-xs text-white/30 mt-3 text-center">Файл должен содержать листы: Вопросы, Требования, Подсказки</p>}
            </div>

            {/* Spheres list */}
            <div className="animate-fade-up opacity-0 delay-100" style={{ animationFillMode: 'forwards' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Сферы деятельности ({spheres.length})</p>
                <button onClick={() => setAdminView("add-sphere")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-cyan-400 transition-colors" style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)' }}>
                  <Icon name="Plus" size={13} color="#06b6d4" />Добавить сферу
                </button>
              </div>
              <div className="space-y-2">
                {spheres.map(s => (
                  <div key={s.id} className="glass rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}20` }}>
                        <Icon name={s.icon} size={16} color={s.color} />
                      </div>
                      <span className="text-sm font-medium text-white flex-1">{s.title}</span>
                      <span className="text-xs text-white/30">{s.areas.length} областей</span>
                      <button
                        onClick={() => { setAdminSphereId(s.id); setAdminView("add-area"); }}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors ml-1"
                      >
                        <Icon name="Plus" size={14} color="rgba(255,255,255,0.5)" />
                      </button>
                    </div>
                    {s.areas.length > 0 && (
                      <div className="border-t border-white/5 px-4 py-2 space-y-1">
                        {s.areas.map(a => (
                          <div key={a.id} className="flex items-center gap-2 py-1.5">
                            <Icon name="ChevronRight" size={12} color="rgba(255,255,255,0.25)" />
                            <span className="text-xs text-white/60 flex-1">{a.title}</span>
                            <span className="text-xs text-white/25">{a.checklists.length} чек-листов</span>
                            <button
                              onClick={() => { setAdminSphereId(s.id); setAdminAreaId(a.id); setAdminView("add-checklist"); }}
                              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                            >
                              <Icon name="Plus" size={13} color="rgba(255,255,255,0.4)" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {adminView === "add-sphere" && (
          <div className="glass-strong rounded-2xl p-5 animate-scale-in space-y-4">
            <h3 className="text-base font-bold text-white">Новая сфера деятельности</h3>
            <input className="input-field" placeholder="Название сферы..." value={newSphereTitle} onChange={e => setNewSphereTitle(e.target.value)} autoFocus />
            <div className="flex gap-3">
              <button onClick={() => setAdminView("main")} className="btn-ghost flex-1 text-sm">Отмена</button>
              <button onClick={addSphere} className="btn-primary flex-1 text-sm flex items-center justify-center gap-1"><Icon name="Plus" size={15} />Создать</button>
            </div>
          </div>
        )}

        {adminView === "add-area" && (
          <div className="glass-strong rounded-2xl p-5 animate-scale-in space-y-4">
            <h3 className="text-base font-bold text-white">Новая область</h3>
            <p className="text-xs text-white/40">Сфера: {spheres.find(s => s.id === adminSphereId)?.title}</p>
            <input className="input-field" placeholder="Название области..." value={newAreaTitle} onChange={e => setNewAreaTitle(e.target.value)} autoFocus />
            <div className="flex gap-3">
              <button onClick={() => setAdminView("main")} className="btn-ghost flex-1 text-sm">Отмена</button>
              <button onClick={addArea} className="btn-primary flex-1 text-sm flex items-center justify-center gap-1"><Icon name="Plus" size={15} />Создать</button>
            </div>
          </div>
        )}

        {adminView === "add-checklist" && (
          <div className="glass-strong rounded-2xl p-5 animate-scale-in space-y-4">
            <h3 className="text-base font-bold text-white">Новый чек-лист</h3>
            <p className="text-xs text-white/40">
              {spheres.find(s => s.id === adminSphereId)?.title} → {spheres.find(s => s.id === adminSphereId)?.areas.find(a => a.id === adminAreaId)?.title}
            </p>
            <input className="input-field" placeholder="Название чек-листа..." value={newChecklistTitle} onChange={e => setNewChecklistTitle(e.target.value)} autoFocus />
            <div className="glass rounded-2xl p-3 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => fileInputRef.current?.click()}>
              <Icon name="FileSpreadsheet" size={18} color="#10b981" />
              <span className="text-sm text-white/60">Загрузить вопросы из Excel</span>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setAdminView("main")} className="btn-ghost flex-1 text-sm">Отмена</button>
              <button onClick={addChecklist} className="btn-primary flex-1 text-sm flex items-center justify-center gap-1"><Icon name="Plus" size={15} />Создать</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}