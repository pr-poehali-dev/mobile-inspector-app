import { RefObject } from "react";
import Icon from "@/components/ui/icon";
import { AnswerValue, ChecklistData, QuestionState } from "./data";

interface Props {
  selectedChecklist: ChecklistData;
  currentQ: { id: number; text: string; requirement: string; hint: string };
  currentQIndex: number;
  total: number;
  progress: number;
  objectName: string;
  activeModal: { type: "req" | "hint" | "note" | "photo" | "result"; qId?: number } | null;
  setActiveModal: (m: { type: "req" | "hint" | "note" | "photo" | "result"; qId?: number } | null) => void;
  getQState: (qId: number) => QuestionState;
  setQuestionStates: React.Dispatch<React.SetStateAction<Record<number, QuestionState>>>;
  setAnswer: (qId: number, val: AnswerValue) => void;
  saveNote: (qId: number, text: string) => void;
  noteInput: string;
  setNoteInput: (v: string) => void;
  setCurrentQIndex: React.Dispatch<React.SetStateAction<number>>;
  setView: (v: "checklists") => void;
  setSelectedChecklist: (c: ChecklistData | null) => void;
  photoFileRef: RefObject<HTMLInputElement>;
  photoQIdRef: React.MutableRefObject<number | null>;
  handlePhotoFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showEmailForm: boolean;
  setShowEmailForm: (v: boolean) => void;
  emailSent: boolean;
  setEmailSent: (v: boolean) => void;
  emailInput: string;
  setEmailInput: (v: string) => void;
  sendingEmail: boolean;
  handleSendEmail: () => void;
  generateAndPrintReport: () => void;
  saveToHistory: () => void;
}

export default function ChecklistSurveyView(props: Props) {
  const {
    selectedChecklist, currentQ, currentQIndex, total, progress, objectName,
    activeModal, setActiveModal, getQState, setQuestionStates, setAnswer, saveNote,
    noteInput, setNoteInput, setCurrentQIndex, setView, setSelectedChecklist,
    photoFileRef, photoQIdRef, handlePhotoFile,
    showEmailForm, setShowEmailForm, emailSent, setEmailSent, emailInput, setEmailInput,
    sendingEmail, handleSendEmail, generateAndPrintReport, saveToHistory,
  } = props;

  const qState = getQState(currentQ.id);
  const isLast = currentQIndex === selectedChecklist.questions.length - 1;

  const goNext = () => {
    if (isLast) {
      setActiveModal({ type: "result" });
    } else {
      setCurrentQIndex(i => i + 1);
    }
  };

  const goPrev = () => {
    if (currentQIndex > 0) setCurrentQIndex(i => i - 1);
  };

  return (
    <div className="min-h-screen relative z-10 animate-fade-in flex flex-col">
      {/* Modal overlay */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setActiveModal(null)}>
          <div className="w-full max-w-2xl animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }} onClick={e => e.stopPropagation()}>
            <div className="glass-strong rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto">
              {activeModal.type === "req" && (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.2)' }}><Icon name="BookOpen" size={16} color="#ef4444" /></div>
                    <h3 className="text-base font-bold text-white">Нормативное требование</h3>
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed">{currentQ.requirement}</p>
                </>
              )}
              {activeModal.type === "hint" && (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.2)' }}><Icon name="Lightbulb" size={16} color="#f59e0b" /></div>
                    <h3 className="text-base font-bold text-white">Подсказка</h3>
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed">{currentQ.hint}</p>
                </>
              )}
              {activeModal.type === "note" && activeModal.qId !== undefined && (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.2)' }}><Icon name="StickyNote" size={16} color="#06b6d4" /></div>
                    <h3 className="text-base font-bold text-white">Примечание</h3>
                  </div>
                  <textarea
                    className="input-field resize-none mb-4"
                    rows={4}
                    placeholder="Введите примечание к данному вопросу..."
                    defaultValue={getQState(activeModal.qId).note}
                    onChange={e => setNoteInput(e.target.value)}
                    onFocus={() => setNoteInput(getQState(activeModal.qId!).note)}
                  />
                  <button className="btn-primary text-sm py-3 flex items-center justify-center gap-2" onClick={() => {
                    saveNote(activeModal.qId!, noteInput || getQState(activeModal.qId!).note);
                    setActiveModal(null);
                  }}>
                    <Icon name="Check" size={16} />Сохранить примечание
                  </button>
                </>
              )}
              {activeModal.type === "photo" && activeModal.qId !== undefined && (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.2)' }}><Icon name="Camera" size={16} color="#8b5cf6" /></div>
                    <h3 className="text-base font-bold text-white">Фотоотчёт</h3>
                  </div>
                  {getQState(activeModal.qId).photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {getQState(activeModal.qId).photos.map((p, i) => (
                        <div key={i} className="aspect-square rounded-xl overflow-hidden relative group" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
                          {p.startsWith("data:") ? <img src={p} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Icon name="ImageIcon" size={20} color="rgba(139,92,246,0.6)" /></div>}
                          <button onClick={() => setQuestionStates(prev => ({ ...prev, [activeModal.qId!]: { ...getQState(activeModal.qId!), photos: getQState(activeModal.qId!).photos.filter((_, idx) => idx !== i) } }))} className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}><Icon name="X" size={11} color="white" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <input ref={photoFileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoFile} />
                  <div className="grid grid-cols-2 gap-3">
                    <button className="flex flex-col items-center gap-2 py-5 rounded-2xl transition-colors hover:bg-white/10" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                      onClick={() => { photoQIdRef.current = activeModal.qId!; photoFileRef.current?.setAttribute("capture", "environment"); photoFileRef.current?.click(); }}>
                      <Icon name="Camera" size={24} color="rgba(255,255,255,0.6)" />
                      <span className="text-xs text-white/60">Сфотографировать</span>
                    </button>
                    <button className="flex flex-col items-center gap-2 py-5 rounded-2xl transition-colors hover:bg-white/10" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                      onClick={() => { photoQIdRef.current = activeModal.qId!; photoFileRef.current?.removeAttribute("capture"); photoFileRef.current?.click(); }}>
                      <Icon name="Upload" size={24} color="rgba(255,255,255,0.6)" />
                      <span className="text-xs text-white/60">Загрузить файл</span>
                    </button>
                  </div>
                </>
              )}
              {activeModal.type === "result" && (
                <>
                  {/* Header */}
                  <div className="text-center mb-5">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 glow" style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>
                      <Icon name="CheckCircle" size={32} color="white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">Чек-лист завершён!</h3>
                    <p className="text-white/50 text-sm">{selectedChecklist.title}</p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {([
                      { v: "yes" as AnswerValue, label: "Да", icon: "Check", color: "#22c55e" },
                      { v: "no" as AnswerValue, label: "Нет", icon: "X", color: "#ef4444" },
                      { v: "na" as AnswerValue, label: "Не прим.", icon: "Minus", color: "#f59e0b" },
                    ]).map(({ v, label, icon, color }) => {
                      const count = selectedChecklist.questions.filter(q => getQState(q.id).answer === v).length;
                      return (
                        <div key={v!} className="text-center py-4 rounded-2xl" style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
                          <div className="text-2xl font-bold mb-0.5" style={{ color }}>{count}</div>
                          <div className="text-xs" style={{ color }}>{label}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Violations alert */}
                  {selectedChecklist.questions.filter(q => getQState(q.id).answer === "no").length > 0 && (
                    <div className="flex items-start gap-2 p-3 rounded-xl mb-4" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                      <Icon name="AlertTriangle" size={15} color="#ef4444" className="flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-300 leading-relaxed">
                        Обнаружено <strong>{selectedChecklist.questions.filter(q => getQState(q.id).answer === "no").length}</strong> нарушений. Рекомендуется принять корректирующие меры и провести повторную проверку.
                      </p>
                    </div>
                  )}

                  {/* Email form */}
                  {showEmailForm ? (
                    <div className="space-y-3 mb-4 animate-scale-in">
                      <div>
                        <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Email получателя</label>
                        <input
                          className="input-field text-sm"
                          placeholder="example@company.ru"
                          type="email"
                          value={emailInput}
                          onChange={e => setEmailInput(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleSendEmail()}
                          autoFocus
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setShowEmailForm(false)} className="btn-ghost flex-1 text-sm">Отмена</button>
                        <button onClick={handleSendEmail} disabled={!emailInput.trim() || sendingEmail} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>
                          {sendingEmail
                            ? <><Icon name="Loader2" size={15} className="animate-spin" />Отправка...</>
                            : <><Icon name="Send" size={15} />Отправить</>
                          }
                        </button>
                      </div>
                    </div>
                  ) : emailSent ? (
                    <div className="flex items-center gap-2 p-3 rounded-xl mb-4" style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)' }}>
                      <Icon name="CheckCircle" size={15} color="#06b6d4" />
                      <p className="text-xs text-cyan-300">Отчёт отправлен на <strong>{emailInput}</strong></p>
                    </div>
                  ) : null}

                  {/* Action buttons */}
                  <div className="space-y-2">
                    <button
                      onClick={generateAndPrintReport}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold text-white transition-all active:scale-98"
                      style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)', boxShadow: '0 4px 20px rgba(6,182,212,0.35)' }}
                    >
                      <Icon name="FileText" size={17} />Сформировать PDF-отчёт
                    </button>
                    {!showEmailForm && !emailSent && (
                      <button
                        onClick={() => setShowEmailForm(true)}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all"
                        style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.3)', color: '#06b6d4' }}
                      >
                        <Icon name="Mail" size={17} color="#06b6d4" />Отправить отчёт на почту
                      </button>
                    )}
                    {emailSent && (
                      <button
                        onClick={() => { setEmailSent(false); setShowEmailForm(true); setEmailInput(""); }}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium text-white/50 transition-all hover:text-white/70"
                      >
                        <Icon name="RefreshCw" size={14} />Отправить на другой адрес
                      </button>
                    )}
                    <button
                      onClick={() => { saveToHistory(); setActiveModal(null); setView("checklists"); setSelectedChecklist(null); }}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold text-white"
                      style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', color: '#a78bfa' }}
                    >
                      <Icon name="Save" size={16} color="#a78bfa" />Сохранить в историю проверок
                    </button>
                    <button
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium text-white/50 transition-all hover:text-white/70"
                      onClick={() => setActiveModal(null)}
                    >
                      <Icon name="ArrowLeft" size={15} />Вернуться к чек-листу
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Survey Header */}
      <div className="glass border-b border-white/10 px-4 py-4 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => { setView("checklists"); setSelectedChecklist(null); }} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
              <Icon name="ArrowLeft" size={20} color="white" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-cyan-400 truncate flex items-center gap-1"><Icon name="MapPin" size={11} color="#06b6d4" />{objectName}</p>
              <p className="text-sm font-semibold text-white truncate">{selectedChecklist.title}</p>
            </div>
            <span className="text-sm font-bold text-cyan-400 flex-shrink-0">{currentQIndex + 1}/{total}</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #06b6d4, #3b82f6)' }} />
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 pt-5 pb-8 flex flex-col gap-4">
        <div className="glass-strong rounded-2xl p-5 animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
          <div className="flex items-start gap-3 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(6,182,212,0.2)' }}>
              <span className="text-xs font-bold text-cyan-400">{currentQIndex + 1}</span>
            </div>
            <p className="text-sm font-medium text-white leading-relaxed">{currentQ.text}</p>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-4 gap-2 mb-5">
            {[
              { type: "req", label: "Требования", icon: "BookOpen", color: "#ef4444" },
              { type: "hint", label: "Подсказка", icon: "Lightbulb", color: "#f59e0b" },
              { type: "note", label: "Примечание", icon: "StickyNote", color: "#06b6d4" },
              { type: "photo", label: "Фото", icon: "Camera", color: "#8b5cf6" },
            ].map(btn => {
              const hasNote = btn.type === "note" && qState.note;
              const hasPhoto = btn.type === "photo" && qState.photos.length > 0;
              return (
                <button
                  key={btn.type}
                  onClick={() => setActiveModal({ type: btn.type as "req" | "hint" | "note" | "photo", qId: currentQ.id })}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all hover:scale-105 relative"
                  style={{ background: `${btn.color}12`, border: `1px solid ${btn.color}25` }}
                >
                  <Icon name={btn.icon} size={18} color={btn.color} />
                  <span className="text-xs leading-none" style={{ color: btn.color }}>{btn.label}</span>
                  {(hasNote || hasPhoto) && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: btn.color }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Answer buttons */}
          <div className="grid grid-cols-3 gap-3">
            {([
              { val: "yes", label: "Да", icon: "Check", color: "#22c55e", bg: "rgba(34,197,94," },
              { val: "no", label: "Нет", icon: "X", color: "#ef4444", bg: "rgba(239,68,68," },
              { val: "na", label: "Не требуется", icon: "Minus", color: "#f59e0b", bg: "rgba(245,158,11," },
            ] as const).map(opt => {
              const active = qState.answer === opt.val;
              return (
                <button
                  key={opt.val}
                  onClick={() => setAnswer(currentQ.id, opt.val)}
                  className="flex flex-col items-center gap-2 py-4 rounded-2xl transition-all"
                  style={{
                    background: active ? `${opt.bg}0.2)` : 'rgba(255,255,255,0.04)',
                    border: `2px solid ${active ? opt.color : 'rgba(255,255,255,0.08)'}`,
                    transform: active ? 'scale(1.03)' : 'scale(1)',
                    boxShadow: active ? `0 0 20px ${opt.bg}0.3)` : 'none',
                  }}
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: active ? `${opt.bg}0.25)` : 'rgba(255,255,255,0.06)' }}>
                    <Icon name={opt.icon} size={18} color={active ? opt.color : "rgba(255,255,255,0.4)"} />
                  </div>
                  <span className="text-xs font-semibold leading-tight text-center" style={{ color: active ? opt.color : "rgba(255,255,255,0.5)" }}>
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Note preview */}
        {qState.note && (
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl animate-fade-in" style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}>
            <Icon name="StickyNote" size={14} color="#06b6d4" className="flex-shrink-0 mt-0.5" />
            <p className="text-xs text-cyan-300/80">{qState.note}</p>
          </div>
        )}

        {/* Photos preview */}
        {qState.photos.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl animate-fade-in" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
            <Icon name="ImageIcon" size={14} color="#8b5cf6" />
            <p className="text-xs text-purple-300/80">{qState.photos.length} фото прикреплено</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-auto">
          <button onClick={goPrev} disabled={currentQIndex === 0} className="btn-ghost flex-shrink-0 px-5 flex items-center gap-2 disabled:opacity-30">
            <Icon name="ArrowLeft" size={16} />Назад
          </button>
          <button
            onClick={goNext}
            disabled={qState.answer === null}
            className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {isLast ? <><Icon name="CheckCircle" size={18} />Завершить</> : <><Icon name="ArrowRight" size={18} />Далее</>}
          </button>
        </div>
      </div>
    </div>
  );
}
