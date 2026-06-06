import { useState, useRef, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import {
  AnswerValue, ChecklistData, Area, Sphere, ViewMode, QuestionState, HistoryRecord, INITIAL_SPHERES,
} from "./checklist/data";
import ChecklistAdminView from "./checklist/ChecklistAdminView";
import ChecklistSurveyView from "./checklist/ChecklistSurveyView";
import ChecklistBrowseViews from "./checklist/ChecklistBrowseViews";

interface Props { onBack: () => void; }

export default function ChecklistModule({ onBack }: Props) {
  const { isAdmin, currentUser } = useApp();
  const currentUserEmail = currentUser?.email || "";
  const [historyEmailToast, setHistoryEmailToast] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("spheres");
  const [spheres, setSpheres] = useState<Sphere[]>(INITIAL_SPHERES);
  const [selectedSphere, setSelectedSphere] = useState<Sphere | null>(null);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [selectedChecklist, setSelectedChecklist] = useState<ChecklistData | null>(null);
  const [questionStates, setQuestionStates] = useState<Record<number, QuestionState>>({});
  const [activeModal, setActiveModal] = useState<{ type: "req" | "hint" | "note" | "photo" | "result"; qId?: number } | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [emailInput, setEmailInput] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [objectName, setObjectName] = useState("");
  const [pendingChecklist, setPendingChecklist] = useState<ChecklistData | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [historyRecord, setHistoryRecord] = useState<HistoryRecord | null>(null);
  const photoQIdRef = useRef<number | null>(null);
  const photoFileRef = useRef<HTMLInputElement>(null);

  // Admin state
  const [adminView, setAdminView] = useState<"main" | "add-sphere" | "add-area" | "add-checklist">("main");
  const [adminSphereId, setAdminSphereId] = useState<number | null>(null);
  const [adminAreaId, setAdminAreaId] = useState<number | null>(null);
  const [newSphereTitle, setNewSphereTitle] = useState("");
  const [newAreaTitle, setNewAreaTitle] = useState("");
  const [newChecklistTitle, setNewChecklistTitle] = useState("");

  const getQState = (qId: number): QuestionState =>
    questionStates[qId] || { answer: null, note: "", photos: [] };

  const setAnswer = (qId: number, val: AnswerValue) => {
    setQuestionStates(prev => ({ ...prev, [qId]: { ...getQState(qId), answer: val } }));
  };

  const saveNote = (qId: number, text: string) => {
    setQuestionStates(prev => ({ ...prev, [qId]: { ...getQState(qId), note: text } }));
  };

  const addPhoto = (qId: number, url: string) => {
    setQuestionStates(prev => {
      const cur = getQState(qId);
      return { ...prev, [qId]: { ...cur, photos: [...cur.photos, url] } };
    });
  };

  const openSurvey = (cl: ChecklistData) => {
    setPendingChecklist(cl);
    setObjectName("");
    setView("object");
  };

  const startSurvey = () => {
    if (!objectName.trim() || !pendingChecklist) return;
    setSelectedChecklist(pendingChecklist);
    setCurrentQIndex(0);
    setQuestionStates({});
    setEmailSent(false);
    setShowEmailForm(false);
    setEmailInput("");
    setView("survey");
  };

  const handlePhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const qId = photoQIdRef.current;
    if (!file || qId === null) return;
    const reader = new FileReader();
    reader.onload = () => addPhoto(qId, reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const saveToHistory = () => {
    if (!selectedChecklist) return;
    const rec: HistoryRecord = {
      id: Date.now(),
      objectName: objectName || "Без названия",
      checklistTitle: selectedChecklist.title,
      sphereTitle: selectedSphere?.title || "",
      areaTitle: selectedArea?.title || "",
      date: new Date().toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      yes: selectedChecklist.questions.filter(q => getQState(q.id).answer === "yes").length,
      no: selectedChecklist.questions.filter(q => getQState(q.id).answer === "no").length,
      na: selectedChecklist.questions.filter(q => getQState(q.id).answer === "na").length,
      questions: selectedChecklist.questions.map(q => ({ text: q.text, answer: getQState(q.id).answer, note: getQState(q.id).note, photos: getQState(q.id).photos })),
    };
    setHistory(prev => [rec, ...prev]);
  };

  const downloadPhoto = (dataUrl: string, idx: number) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `photo_${idx + 1}.png`;
    a.click();
  };

  // Экспорт сохранённой записи истории проверок в PDF (через печать), как в модалке «Чек-лист завершён»
  const printHistory = (rec: HistoryRecord) => {
    const ANSWER_LABELS: Record<string, string> = { yes: "✅ Да", no: "❌ Нет", na: "➖ Не требуется" };
    const ANSWER_COLORS: Record<string, string> = { yes: "#16a34a", no: "#dc2626", na: "#ca8a04" };
    const rows = rec.questions.map((q, i) => {
      const ans = q.answer || "na";
      const color = ANSWER_COLORS[ans] || "#94a3b8";
      return `<tr style="border-bottom:1px solid #e2e8f0; ${ans === "no" ? "background:#fff5f5;" : ""}">
        <td style="padding:10px 12px; color:#64748b; font-size:13px; width:32px; text-align:center;">${i + 1}</td>
        <td style="padding:10px 12px; font-size:13px; line-height:1.5;">${q.text}</td>
        <td style="padding:10px 12px; text-align:center; font-weight:600; font-size:13px; white-space:nowrap;" width="110"><span style="color:${color}; background:${color}18; padding:3px 10px; border-radius:6px; border:1px solid ${color}44;">${ANSWER_LABELS[ans]}</span></td>
        <td style="padding:10px 12px; color:#64748b; font-size:12px; font-style:italic;">${q.note || "—"}</td>
      </tr>`;
    }).join("");
    const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"/><title>История проверки</title>
<style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:0;padding:32px;color:#1e293b;background:#fff}.header{border-bottom:3px solid #0891b2;padding-bottom:20px;margin-bottom:24px}.logo{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}h1{font-size:22px;color:#0f172a;margin:0 0 4px}.subtitle{font-size:13px;color:#64748b}.meta{display:flex;gap:24px;margin-bottom:24px;flex-wrap:wrap}.meta-item{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 16px}.meta-label{font-size:11px;color:#94a3b8;text-transform:uppercase}.meta-value{font-size:14px;font-weight:600;color:#1e293b;margin-top:2px}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}.stat{border-radius:12px;padding:16px;text-align:center;border:1px solid}.stat-num{font-size:28px;font-weight:700}.stat-label{font-size:12px;margin-top:4px}.stat-yes{background:#f0fdf4;border-color:#bbf7d0;color:#15803d}.stat-no{background:#fef2f2;border-color:#fecaca;color:#dc2626}.stat-na{background:#fefce8;border-color:#fef08a;color:#ca8a04}table{width:100%;border-collapse:collapse;font-size:13px}thead tr{background:#f1f5f9}th{padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;font-weight:600}.footer{margin-top:28px;padding-top:16px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:11px;color:#94a3b8}</style></head>
<body><div class="header"><div class="logo">Мобильный инспектор · История проверок</div><h1>${rec.checklistTitle}</h1><div class="subtitle">${rec.sphereTitle || ""}${rec.areaTitle ? " → " + rec.areaTitle : ""}</div></div>
<div class="meta"><div class="meta-item"><div class="meta-label">Наименование проверяемого объекта</div><div class="meta-value">${rec.objectName || "—"}</div></div><div class="meta-item"><div class="meta-label">Дата проверки</div><div class="meta-value">${rec.date}</div></div><div class="meta-item"><div class="meta-label">Всего вопросов</div><div class="meta-value">${rec.questions.length}</div></div></div>
<div class="stats"><div class="stat stat-yes"><div class="stat-num">${rec.yes}</div><div class="stat-label">✅ Да / Выполнено</div></div><div class="stat stat-no"><div class="stat-num">${rec.no}</div><div class="stat-label">❌ Нет / Нарушение</div></div><div class="stat stat-na"><div class="stat-num">${rec.na}</div><div class="stat-label">➖ Не применимо</div></div></div>
<table><thead><tr><th>#</th><th>Вопрос</th><th>Ответ</th><th>Примечание</th></tr></thead><tbody>${rows}</tbody></table>
<div class="footer"><span>Сформировано: ${rec.date}</span><span>Мобильный инспектор · mobile-inspector.ru</span></div></body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html); win.document.close(); win.focus();
    setTimeout(() => win.print(), 400);
  };

  const emailHistory = (rec: HistoryRecord) => {
    const to = currentUserEmail || window.prompt("Введите email для отправки отчёта:", currentUserEmail) || "";
    if (!to) return;
    setHistoryEmailToast(`✉️ История проверки «${rec.objectName}» отправлена на ${to}`);
    setTimeout(() => setHistoryEmailToast(null), 3000);
  };

  const generateAndPrintReport = useCallback(() => {
    if (!selectedChecklist) return;
    const now = new Date();
    const dateStr = now.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
    const timeStr = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

    const ANSWER_LABELS: Record<string, string> = { yes: "✅ Да", no: "❌ Нет", na: "➖ Не требуется" };
    const ANSWER_COLORS: Record<string, string> = { yes: "#16a34a", no: "#dc2626", na: "#ca8a04" };

    const yesCount = selectedChecklist.questions.filter(q => getQState(q.id).answer === "yes").length;
    const noCount = selectedChecklist.questions.filter(q => getQState(q.id).answer === "no").length;
    const naCount = selectedChecklist.questions.filter(q => getQState(q.id).answer === "na").length;
    const totalQ = selectedChecklist.questions.length;

    const rows = selectedChecklist.questions.map((q, i) => {
      const st = getQState(q.id);
      const ans = st.answer || "na";
      const color = ANSWER_COLORS[ans] || "#94a3b8";
      return `
        <tr style="border-bottom:1px solid #e2e8f0; ${ans === "no" ? "background:#fff5f5;" : ""}">
          <td style="padding:10px 12px; color:#64748b; font-size:13px; width:32px; text-align:center;">${i + 1}</td>
          <td style="padding:10px 12px; font-size:13px; line-height:1.5;">${q.text}</td>
          <td style="padding:10px 12px; text-align:center; font-weight:600; font-size:13px; white-space:nowrap;" width="110">
            <span style="color:${color}; background:${color}18; padding:3px 10px; border-radius:6px; border:1px solid ${color}44;">${ANSWER_LABELS[ans]}</span>
          </td>
          <td style="padding:10px 12px; color:#64748b; font-size:12px; font-style:italic;">${st.note || "—"}</td>
        </tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html lang="ru">
<head><meta charset="UTF-8"/><title>Отчёт по чек-листу</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Arial', sans-serif; margin: 0; padding: 32px; color: #1e293b; background: #fff; }
  .header { border-bottom: 3px solid #0891b2; padding-bottom: 20px; margin-bottom: 24px; }
  .logo { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  h1 { font-size: 22px; color: #0f172a; margin: 0 0 4px; }
  .subtitle { font-size: 13px; color: #64748b; }
  .meta { display: flex; gap: 24px; margin-bottom: 24px; flex-wrap: wrap; }
  .meta-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 16px; }
  .meta-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
  .meta-value { font-size: 14px; font-weight: 600; color: #1e293b; margin-top: 2px; }
  .stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 24px; }
  .stat { border-radius: 12px; padding: 16px; text-align: center; border: 1px solid; }
  .stat-num { font-size: 28px; font-weight: 700; }
  .stat-label { font-size: 12px; margin-top: 4px; }
  .stat-yes { background: #f0fdf4; border-color: #bbf7d0; color: #15803d; }
  .stat-no { background: #fef2f2; border-color: #fecaca; color: #dc2626; }
  .stat-na { background: #fefce8; border-color: #fef08a; color: #ca8a04; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  thead tr { background: #f1f5f9; }
  th { padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 600; }
  .footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; }
  @media print {
    body { padding: 16px; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">Мобильный инспектор · Отчёт по проверке</div>
    <h1>${selectedChecklist.title}</h1>
    <div class="subtitle">${selectedSphere?.title || ""}${selectedArea ? " → " + selectedArea.title : ""}</div>
  </div>
  <div class="meta">
    <div class="meta-item"><div class="meta-label">Наименование проверяемого объекта</div><div class="meta-value">${objectName || "—"}</div></div>
    <div class="meta-item"><div class="meta-label">Дата проверки</div><div class="meta-value">${dateStr}</div></div>
    <div class="meta-item"><div class="meta-label">Время</div><div class="meta-value">${timeStr}</div></div>
    <div class="meta-item"><div class="meta-label">Всего вопросов</div><div class="meta-value">${totalQ}</div></div>
  </div>
  <div class="stats">
    <div class="stat stat-yes"><div class="stat-num">${yesCount}</div><div class="stat-label">✅ Да / Выполнено</div></div>
    <div class="stat stat-no"><div class="stat-num">${noCount}</div><div class="stat-label">❌ Нет / Нарушение</div></div>
    <div class="stat stat-na"><div class="stat-num">${naCount}</div><div class="stat-label">➖ Не применимо</div></div>
  </div>
  <table>
    <thead>
      <tr><th>#</th><th>Вопрос</th><th>Ответ</th><th>Примечание</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">
    <span>Сформировано: ${dateStr} в ${timeStr}</span>
    <span>Мобильный инспектор · mobile-inspector.ru</span>
  </div>
</body></html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }, [selectedChecklist, selectedSphere, selectedArea, questionStates, objectName]);

  const handleSendEmail = () => {
    if (!emailInput.trim()) return;
    setSendingEmail(true);
    setTimeout(() => {
      setSendingEmail(false);
      setEmailSent(true);
      setShowEmailForm(false);
    }, 1500);
  };

  const answered = selectedChecklist ? selectedChecklist.questions.filter(q => getQState(q.id).answer !== null).length : 0;
  const total = selectedChecklist?.questions.length || 0;
  const progress = total > 0 ? Math.round((answered / total) * 100) : 0;

  const currentQ = selectedChecklist?.questions[currentQIndex];

  // Admin helpers
  const addSphere = () => {
    if (!newSphereTitle.trim()) return;
    setSpheres(prev => [...prev, { id: Date.now(), title: newSphereTitle, icon: "MoreHorizontal", color: "#64748b", areas: [] }]);
    setNewSphereTitle("");
    setAdminView("main");
  };

  const addArea = () => {
    if (!newAreaTitle.trim() || !adminSphereId) return;
    setSpheres(prev => prev.map(s => s.id !== adminSphereId ? s : { ...s, areas: [...s.areas, { id: Date.now(), title: newAreaTitle, checklists: [] }] }));
    setNewAreaTitle("");
    setAdminView("main");
  };

  const addChecklist = () => {
    if (!newChecklistTitle.trim() || !adminSphereId || !adminAreaId) return;
    setSpheres(prev => prev.map(s => s.id !== adminSphereId ? s : {
      ...s,
      areas: s.areas.map(a => a.id !== adminAreaId ? a : {
        ...a, checklists: [...a.checklists, { id: Date.now(), title: newChecklistTitle, questions: [] }]
      })
    }));
    setNewChecklistTitle("");
    setAdminView("main");
  };

  // ── ADMIN VIEW ──────────────────────────────────────────────────────────────
  if (view === "admin") {
    return (
      <ChecklistAdminView
        spheres={spheres}
        adminView={adminView}
        setAdminView={setAdminView}
        setView={setView}
        adminSphereId={adminSphereId}
        setAdminSphereId={setAdminSphereId}
        adminAreaId={adminAreaId}
        setAdminAreaId={setAdminAreaId}
        newSphereTitle={newSphereTitle}
        setNewSphereTitle={setNewSphereTitle}
        newAreaTitle={newAreaTitle}
        setNewAreaTitle={setNewAreaTitle}
        newChecklistTitle={newChecklistTitle}
        setNewChecklistTitle={setNewChecklistTitle}
        addSphere={addSphere}
        addArea={addArea}
        addChecklist={addChecklist}
        fileInputRef={fileInputRef}
      />
    );
  }

  // ── SURVEY VIEW ─────────────────────────────────────────────────────────────
  if (view === "survey" && selectedChecklist && currentQ) {
    return (
      <ChecklistSurveyView
        selectedChecklist={selectedChecklist}
        currentQ={currentQ}
        currentQIndex={currentQIndex}
        total={total}
        progress={progress}
        objectName={objectName}
        activeModal={activeModal}
        setActiveModal={setActiveModal}
        getQState={getQState}
        setQuestionStates={setQuestionStates}
        setAnswer={setAnswer}
        saveNote={saveNote}
        noteInput={noteInput}
        setNoteInput={setNoteInput}
        setCurrentQIndex={setCurrentQIndex}
        setView={setView}
        setSelectedChecklist={setSelectedChecklist}
        photoFileRef={photoFileRef}
        photoQIdRef={photoQIdRef}
        handlePhotoFile={handlePhotoFile}
        showEmailForm={showEmailForm}
        setShowEmailForm={setShowEmailForm}
        emailSent={emailSent}
        setEmailSent={setEmailSent}
        emailInput={emailInput}
        setEmailInput={setEmailInput}
        sendingEmail={sendingEmail}
        handleSendEmail={handleSendEmail}
        generateAndPrintReport={generateAndPrintReport}
        saveToHistory={saveToHistory}
      />
    );
  }

  // ── BROWSE VIEWS (object / history / historyDetail / checklists / areas / spheres) ──
  return (
    <>
    {historyEmailToast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-3 rounded-2xl text-sm font-medium text-white animate-fade-up" style={{ background: 'rgba(6,182,212,0.92)', backdropFilter: 'blur(12px)' }}>{historyEmailToast}</div>}
    <ChecklistBrowseViews
      view={view}
      onBack={onBack}
      isAdmin={isAdmin}
      spheres={spheres}
      selectedSphere={selectedSphere}
      selectedArea={selectedArea}
      setSelectedSphere={setSelectedSphere}
      setSelectedArea={setSelectedArea}
      setView={setView}
      setAdminView={setAdminView}
      history={history}
      historyRecord={historyRecord}
      setHistoryRecord={setHistoryRecord}
      pendingChecklist={pendingChecklist}
      objectName={objectName}
      setObjectName={setObjectName}
      startSurvey={startSurvey}
      openSurvey={openSurvey}
      downloadPhoto={downloadPhoto}
      printHistory={printHistory}
      emailHistory={emailHistory}
    />
    </>
  );
}