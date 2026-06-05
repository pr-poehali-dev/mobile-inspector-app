import { useState } from "react";
import Icon from "@/components/ui/icon";
import ModuleHeader from "@/components/ModuleHeader";

interface Props { onBack: () => void; }

// ── Типы конструктора курсов ──
type LessonType = "lecture" | "test" | "assignment" | "webinar";

interface Lesson {
  id: number;
  title: string;
  type: LessonType;
  content: string;       // текст лекции / описание задания
  videoUrl?: string;     // YouTube/Vimeo
  files: string[];       // PDF/DOCX
  completion: string;    // условие завершения
}

interface Module {
  id: number;
  title: string;
  lessons: Lesson[];
}

interface Course {
  id: number;
  title: string;
  modules: Module[];
}

interface Student {
  id: number;
  name: string;
  email: string;
  role: "student" | "curator";
  progress: number;      // %
  avgScore: number;      // средний балл
  status: "not_started" | "dropped" | "completed" | "in_progress";
}

interface Homework {
  id: number;
  studentName: string;
  lessonTitle: string;
  text: string;
  files: string[];
  grade: number | null;
  comment: string;
  date: string;
}

const LESSON_TYPES: Record<LessonType, { label: string; icon: string; color: string }> = {
  lecture: { label: "Лекция", icon: "BookOpen", color: "#3b82f6" },
  test: { label: "Тест", icon: "ClipboardCheck", color: "#10b981" },
  assignment: { label: "Задание", icon: "PenSquare", color: "#f59e0b" },
  webinar: { label: "Вебинар", icon: "Video", color: "#ef4444" },
};

const STATUS_META: Record<Student["status"], { label: string; color: string }> = {
  not_started: { label: "Не начинал", color: "#94a3b8" },
  dropped: { label: "Бросил", color: "#ef4444" },
  in_progress: { label: "Проходит", color: "#3b82f6" },
  completed: { label: "Завершил", color: "#10b981" },
};

const INITIAL_COURSES: Course[] = [
  {
    id: 1, title: "Охрана труда и техника безопасности", modules: [
      { id: 11, title: "Модуль 1. Введение", lessons: [
        { id: 111, title: "Что такое охрана труда", type: "lecture", content: "Основные понятия и нормативная база.", videoUrl: "https://youtube.com/watch?v=demo", files: ["lecture1.pdf"], completion: "Посмотреть до конца" },
        { id: 112, title: "Входной тест", type: "test", content: "5 вопросов на проверку базовых знаний.", files: [], completion: "Набрать ≥ 60%" },
      ] },
      { id: 12, title: "Модуль 2. Практика", lessons: [
        { id: 121, title: "Кейс: расследование инцидента", type: "assignment", content: "Опишите порядок действий при несчастном случае.", files: ["template.docx"], completion: "Сдать ДЗ на проверку" },
        { id: 122, title: "Вебинар с экспертом", type: "webinar", content: "Онлайн-разбор сложных случаев.", files: [], completion: "Присутствовать на трансляции" },
      ] },
    ]
  },
];

const INITIAL_STUDENTS: Student[] = [
  { id: 1, name: "Иван Петров", email: "ivan@mail.ru", role: "student", progress: 75, avgScore: 4.5, status: "in_progress" },
  { id: 2, name: "Анна Козлова", email: "anna@mail.ru", role: "curator", progress: 100, avgScore: 5.0, status: "completed" },
  { id: 3, name: "Сергей Смирнов", email: "sergey@mail.ru", role: "student", progress: 0, avgScore: 0, status: "not_started" },
  { id: 4, name: "Мария Иванова", email: "maria@mail.ru", role: "student", progress: 20, avgScore: 3.0, status: "dropped" },
];

const INITIAL_HOMEWORK: Homework[] = [
  { id: 1, studentName: "Иван Петров", lessonTitle: "Кейс: расследование инцидента", text: "Мой порядок действий: 1) оказать первую помощь...", files: ["ivan_hw.pdf"], grade: null, comment: "", date: "03.06.2026" },
  { id: 2, studentName: "Мария Иванова", lessonTitle: "Кейс: расследование инцидента", text: "Прикладываю отчёт.", files: ["maria_hw.docx"], grade: 4, comment: "Хорошо, но не хватает деталей.", date: "01.06.2026" },
];

type Tab = "constructor" | "students" | "homework" | "analytics" | "settings";

export default function SchoolAdmin({ onBack }: Props) {
  const [tab, setTab] = useState<Tab>("constructor");
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [homework, setHomework] = useState<Homework[]>(INITIAL_HOMEWORK);
  const [activeCourseId, setActiveCourseId] = useState<number>(INITIAL_COURSES[0].id);
  const [toast, setToast] = useState<string | null>(null);
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [hwFilter, setHwFilter] = useState("");
  const [certDesign, setCertDesign] = useState("classic");
  const [deadlineDays, setDeadlineDays] = useState("14");
  const [testTimer, setTestTimer] = useState("30");
  const [editingLesson, setEditingLesson] = useState<{ moduleId: number; lesson: Lesson } | null>(null);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2200); };
  const activeCourse = courses.find(c => c.id === activeCourseId) || courses[0];

  // ── Конструктор: операции ──
  const addModule = () => {
    setCourses(prev => prev.map(c => c.id === activeCourseId ? { ...c, modules: [...c.modules, { id: Date.now(), title: `Новый модуль ${c.modules.length + 1}`, lessons: [] }] } : c));
    showToast("Модуль добавлен");
  };
  const addLesson = (moduleId: number, type: LessonType) => {
    setCourses(prev => prev.map(c => c.id !== activeCourseId ? c : { ...c, modules: c.modules.map(m => m.id !== moduleId ? m : { ...m, lessons: [...m.lessons, { id: Date.now(), title: `${LESSON_TYPES[type].label}`, type, content: "", files: [], completion: "Посмотреть до конца" }] }) }));
    showToast(`${LESSON_TYPES[type].label} добавлен`);
  };
  const deleteLesson = (moduleId: number, lessonId: number) => setCourses(prev => prev.map(c => c.id !== activeCourseId ? c : { ...c, modules: c.modules.map(m => m.id !== moduleId ? m : { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) }) }));
  const deleteModule = (moduleId: number) => setCourses(prev => prev.map(c => c.id !== activeCourseId ? c : { ...c, modules: c.modules.filter(m => m.id !== moduleId) }));
  // Сортировка (drag-n-drop эмулируется кнопками вверх/вниз)
  const moveLesson = (moduleId: number, idx: number, dir: -1 | 1) => setCourses(prev => prev.map(c => c.id !== activeCourseId ? c : { ...c, modules: c.modules.map(m => {
    if (m.id !== moduleId) return m;
    const arr = [...m.lessons]; const ni = idx + dir;
    if (ni < 0 || ni >= arr.length) return m;
    [arr[idx], arr[ni]] = [arr[ni], arr[idx]];
    return { ...m, lessons: arr };
  }) }));
  const saveLesson = () => {
    if (!editingLesson) return;
    setCourses(prev => prev.map(c => c.id !== activeCourseId ? c : { ...c, modules: c.modules.map(m => m.id !== editingLesson.moduleId ? m : { ...m, lessons: m.lessons.map(l => l.id === editingLesson.lesson.id ? editingLesson.lesson : l) }) }));
    setEditingLesson(null);
    showToast("Урок сохранён");
  };

  const addStudent = () => {
    if (!newStudentEmail.includes("@")) return;
    setStudents(prev => [...prev, { id: Date.now(), name: newStudentEmail.split("@")[0], email: newStudentEmail, role: "student", progress: 0, avgScore: 0, status: "not_started" }]);
    setNewStudentEmail("");
    showToast("Студент добавлен");
  };
  const toggleCurator = (id: number) => setStudents(prev => prev.map(s => s.id === id ? { ...s, role: s.role === "curator" ? "student" : "curator" } : s));
  const gradeHw = (id: number, grade: number, comment: string) => { setHomework(prev => prev.map(h => h.id === id ? { ...h, grade, comment } : h)); showToast("Оценка выставлена"); };

  const filteredHw = homework.filter(h => h.studentName.toLowerCase().includes(hwFilter.toLowerCase()));
  const groupAvg = students.length ? (students.reduce((s, x) => s + x.avgScore, 0) / students.length).toFixed(1) : "0";

  const TABS = [
    { k: "constructor", label: "Конструктор", icon: "LayoutGrid" },
    { k: "students", label: "Ученики", icon: "Users" },
    { k: "homework", label: "Проверка ДЗ", icon: "ClipboardCheck", badge: homework.filter(h => h.grade === null).length },
    { k: "analytics", label: "Аналитика", icon: "BarChart3" },
    { k: "settings", label: "Доступ", icon: "Settings" },
  ] as const;

  // ── Lesson editor ──
  if (editingLesson) {
    const L = editingLesson.lesson;
    const meta = LESSON_TYPES[L.type];
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        {toast && <Toast msg={toast} />}
        <ModuleHeader title="Редактор урока" onBack={() => setEditingLesson(null)} icon={meta.icon} iconColor={meta.color} subtitle={meta.label} />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
          <Field label="Название урока" value={L.title} onChange={v => setEditingLesson(e => e && { ...e, lesson: { ...e.lesson, title: v } })} />
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Тип занятия</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(LESSON_TYPES) as LessonType[]).map(t => (
                <button key={t} onClick={() => setEditingLesson(e => e && { ...e, lesson: { ...e.lesson, type: t } })} className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ background: L.type === t ? `${LESSON_TYPES[t].color}20` : 'rgba(255,255,255,0.04)', border: `1px solid ${L.type === t ? LESSON_TYPES[t].color : 'rgba(255,255,255,0.1)'}`, color: L.type === t ? LESSON_TYPES[t].color : 'rgba(255,255,255,0.6)' }}>
                  <Icon name={LESSON_TYPES[t].icon} size={15} color={L.type === t ? LESSON_TYPES[t].color : 'rgba(255,255,255,0.5)'} />{LESSON_TYPES[t].label}
                </button>
              ))}
            </div>
          </div>
          <Field label="Содержимое (текстовый редактор)" value={L.content} onChange={v => setEditingLesson(e => e && { ...e, lesson: { ...e.lesson, content: v } })} textarea />
          <Field label="Видео (YouTube / Vimeo)" value={L.videoUrl || ""} onChange={v => setEditingLesson(e => e && { ...e, lesson: { ...e.lesson, videoUrl: v } })} placeholder="https://youtube.com/watch?v=..." />
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Файлы (PDF / DOCX)</label>
            <div className="flex flex-wrap gap-2 mb-2">{L.files.map((f, i) => <span key={i} className="text-xs px-2 py-1 rounded-lg flex items-center gap-1" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}><Icon name="Paperclip" size={11} />{f}<button onClick={() => setEditingLesson(e => e && { ...e, lesson: { ...e.lesson, files: e.lesson.files.filter((_, idx) => idx !== i) } })}><Icon name="X" size={11} color="#60a5fa" /></button></span>)}</div>
            <button onClick={() => setEditingLesson(e => e && { ...e, lesson: { ...e.lesson, files: [...e.lesson.files, `файл_${e.lesson.files.length + 1}.pdf`] } })} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}>+ Прикрепить файл</button>
          </div>
          <Field label="Условие завершения урока" value={L.completion} onChange={v => setEditingLesson(e => e && { ...e, lesson: { ...e.lesson, completion: v } })} placeholder="Например: посмотреть до конца" />
          <button onClick={saveLesson} className="btn-primary flex items-center justify-center gap-2"><Icon name="Check" size={18} />Сохранить урок</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      {toast && <Toast msg={toast} />}
      <ModuleHeader title="Школа · Управление" onBack={onBack} icon="GraduationCap" iconColor="#3b82f6" subtitle="Режим администратора" />
      <div className="max-w-2xl mx-auto px-4 pt-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} className="relative flex-shrink-0 px-3.5 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5" style={{ background: tab === t.k ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : 'rgba(255,255,255,0.06)', border: `1px solid ${tab === t.k ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.1)'}`, color: tab === t.k ? 'white' : 'rgba(255,255,255,0.5)' }}>
              <Icon name={t.icon} size={15} color={tab === t.k ? 'white' : 'rgba(255,255,255,0.5)'} />{t.label}
              {"badge" in t && t.badge ? <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold" style={{ background: '#f59e0b', fontSize: '9px' }}>{t.badge}</span> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8">
        {/* ── КОНСТРУКТОР ── */}
        {tab === "constructor" && (
          <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {courses.map(c => <button key={c.id} onClick={() => setActiveCourseId(c.id)} className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium" style={{ background: activeCourseId === c.id ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.05)', border: `1px solid ${activeCourseId === c.id ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.08)'}`, color: activeCourseId === c.id ? '#60a5fa' : 'rgba(255,255,255,0.5)' }}>{c.title}</button>)}
              <button onClick={() => { const id = Date.now(); setCourses(prev => [...prev, { id, title: `Новый курс ${prev.length + 1}`, modules: [] }]); setActiveCourseId(id); showToast("Курс создан"); }} className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium" style={{ background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)' }}>+ Курс</button>
            </div>
            <p className="text-xs text-white/30 px-1">Перетаскивание уроков — стрелками ↑↓. Каждый урок: лекция, тест, задание или вебинар.</p>
            {activeCourse.modules.map(m => (
              <div key={m.id} className="glass rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="Folder" size={16} color="#3b82f6" />
                  <input className="bg-transparent text-sm font-semibold text-white flex-1 outline-none border-b border-transparent focus:border-white/20" value={m.title} onChange={e => setCourses(prev => prev.map(c => c.id !== activeCourseId ? c : { ...c, modules: c.modules.map(x => x.id === m.id ? { ...x, title: e.target.value } : x) }))} />
                  <button onClick={() => deleteModule(m.id)} className="p-1.5 rounded-lg hover:bg-white/10"><Icon name="Trash2" size={14} color="rgba(239,68,68,0.7)" /></button>
                </div>
                <div className="space-y-2 mb-3">
                  {m.lessons.map((l, idx) => {
                    const meta = LESSON_TYPES[l.type];
                    return (
                      <div key={l.id} className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <div className="flex flex-col">
                          <button onClick={() => moveLesson(m.id, idx, -1)} className="hover:text-white text-white/30"><Icon name="ChevronUp" size={13} /></button>
                          <button onClick={() => moveLesson(m.id, idx, 1)} className="hover:text-white text-white/30"><Icon name="ChevronDown" size={13} /></button>
                        </div>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${meta.color}18` }}><Icon name={meta.icon} size={14} color={meta.color} /></div>
                        <div className="flex-1 min-w-0"><p className="text-sm text-white truncate">{l.title}</p><p className="text-xs" style={{ color: meta.color }}>{meta.label}</p></div>
                        <button onClick={() => setEditingLesson({ moduleId: m.id, lesson: l })} className="p-1.5 rounded-lg hover:bg-white/10"><Icon name="Pencil" size={13} color="rgba(255,255,255,0.6)" /></button>
                        <button onClick={() => deleteLesson(m.id, l.id)} className="p-1.5 rounded-lg hover:bg-white/10"><Icon name="Trash2" size={13} color="rgba(239,68,68,0.7)" /></button>
                      </div>
                    );
                  })}
                  {m.lessons.length === 0 && <p className="text-xs text-white/30 text-center py-2">Нет уроков</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(LESSON_TYPES) as LessonType[]).map(t => <button key={t} onClick={() => addLesson(m.id, t)} className="text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1" style={{ background: `${LESSON_TYPES[t].color}15`, color: LESSON_TYPES[t].color }}><Icon name="Plus" size={11} color={LESSON_TYPES[t].color} />{LESSON_TYPES[t].label}</button>)}
                </div>
              </div>
            ))}
            <button onClick={addModule} className="btn-primary flex items-center justify-center gap-2"><Icon name="FolderPlus" size={18} />Добавить модуль</button>
          </div>
        )}

        {/* ── УЧЕНИКИ ── */}
        {tab === "students" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input className="input-field text-sm py-2.5 flex-1" placeholder="email студента..." value={newStudentEmail} onChange={e => setNewStudentEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && addStudent()} />
              <button onClick={addStudent} className="px-4 rounded-xl flex items-center gap-1" style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)', color: '#60a5fa' }}><Icon name="UserPlus" size={16} />Добавить</button>
            </div>
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider px-1">Ученики курса ({students.length})</p>
            {students.map(s => {
              const st = STATUS_META[s.status];
              return (
                <div key={s.id} className="glass rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white" style={{ background: s.role === "curator" ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#3b82f6,#7c3aed)' }}>{s.name[0].toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2"><p className="text-sm font-semibold text-white">{s.name}</p>{s.role === "curator" && <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>Куратор</span>}</div>
                      <p className="text-xs text-white/40">{s.email}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: `${st.color}18`, color: st.color }}>{st.label}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex-1"><div className="h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${s.progress}%`, background: 'linear-gradient(90deg,#3b82f6,#8b5cf6)' }} /></div></div>
                    <span className="text-xs text-white/50">{s.progress}%</span>
                    <button onClick={() => toggleCurator(s.id)} className="text-xs px-2.5 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}>{s.role === "curator" ? "Снять куратора" : "Назначить куратором"}</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── ПРОВЕРКА ДЗ ── */}
        {tab === "homework" && (
          <div className="space-y-3">
            <input className="input-field text-sm py-2.5" placeholder="Фильтр по студенту..." value={hwFilter} onChange={e => setHwFilter(e.target.value)} />
            {filteredHw.map(h => <HwCard key={h.id} hw={h} onGrade={gradeHw} />)}
            {filteredHw.length === 0 && <div className="text-center py-12 text-white/30 text-sm">Нет работ на проверку</div>}
          </div>
        )}

        {/* ── АНАЛИТИКА ── */}
        {tab === "analytics" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="glass rounded-2xl p-4 text-center"><div className="text-2xl font-bold text-white">{groupAvg}</div><div className="text-xs text-white/40">Средний балл группы</div></div>
              <div className="glass rounded-2xl p-4 text-center"><div className="text-2xl font-bold text-green-400">{students.filter(s => s.status === "completed").length}/{students.length}</div><div className="text-xs text-white/40">Завершили курс</div></div>
            </div>
            <div className="glass rounded-2xl p-4">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Прогресс студентов</p>
              {(["not_started", "dropped", "in_progress", "completed"] as Student["status"][]).map(st => {
                const arr = students.filter(s => s.status === st);
                const meta = STATUS_META[st];
                const pct = students.length ? Math.round(arr.length / students.length * 100) : 0;
                return (
                  <div key={st} className="mb-3 last:mb-0">
                    <div className="flex items-center justify-between mb-1"><span className="text-sm text-white/70">{meta.label}</span><span className="text-sm font-semibold" style={{ color: meta.color }}>{arr.length}</span></div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: meta.color }} /></div>
                  </div>
                );
              })}
            </div>
            <div className="glass rounded-2xl p-4">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Успеваемость (средний балл)</p>
              <div className="flex items-end gap-2 h-28">
                {students.map(s => (
                  <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t-lg" style={{ height: `${s.avgScore / 5 * 100}%`, minHeight: '4px', background: 'linear-gradient(180deg,#3b82f6,#7c3aed)' }} />
                    <span className="text-xs text-white/40 truncate w-full text-center">{s.name.split(" ")[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── ДОСТУП / СЕРТИФИКАТЫ ── */}
        {tab === "settings" && (
          <div className="space-y-4">
            <div className="glass rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Дедлайны и таймеры</p>
              <Field label="Дедлайн на сдачу ДЗ (дней)" value={deadlineDays} onChange={setDeadlineDays} placeholder="14" />
              <Field label="Таймер на тест (минут)" value={testTimer} onChange={setTestTimer} placeholder="30" />
            </div>
            <div className="glass rounded-2xl p-4">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Дизайн сертификата</p>
              <p className="text-xs text-white/40 mb-3">Выдаётся автоматически при 100% прохождении курса.</p>
              <div className="grid grid-cols-3 gap-2">
                {[{ k: "classic", label: "Классический", c: "#f59e0b" }, { k: "modern", label: "Современный", c: "#3b82f6" }, { k: "elegant", label: "Элегантный", c: "#10b981" }].map(d => (
                  <button key={d.k} onClick={() => setCertDesign(d.k)} className="p-3 rounded-xl text-center" style={{ background: certDesign === d.k ? `${d.c}18` : 'rgba(255,255,255,0.04)', border: `1px solid ${certDesign === d.k ? d.c : 'rgba(255,255,255,0.1)'}` }}>
                    <Icon name="Award" size={22} color={d.c} className="mx-auto mb-1" />
                    <span className="text-xs" style={{ color: certDesign === d.k ? d.c : 'rgba(255,255,255,0.5)' }}>{d.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => showToast("✅ Настройки сохранены")} className="btn-primary flex items-center justify-center gap-2"><Icon name="Check" size={18} />Сохранить настройки</button>
          </div>
        )}
      </div>
    </div>
  );
}

function HwCard({ hw, onGrade }: { hw: Homework; onGrade: (id: number, grade: number, comment: string) => void }) {
  const [grade, setGrade] = useState(hw.grade ?? 0);
  const [comment, setComment] = useState(hw.comment);
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div><p className="text-sm font-semibold text-white">{hw.studentName}</p><p className="text-xs text-white/40">{hw.lessonTitle} · {hw.date}</p></div>
        {hw.grade !== null ? <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>Оценено: {hw.grade}</span> : <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>На проверке</span>}
      </div>
      <p className="text-sm text-white/70 mb-2">{hw.text}</p>
      <div className="flex flex-wrap gap-2 mb-3">{hw.files.map((f, i) => <button key={i} className="text-xs px-2 py-1 rounded-lg flex items-center gap-1" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}><Icon name="Paperclip" size={11} />{f}</button>)}</div>
      <textarea className="input-field text-sm resize-none mb-2" rows={2} placeholder="Комментарий преподавателя..." value={comment} onChange={e => setComment(e.target.value)} />
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 flex-1">
          {[1, 2, 3, 4, 5].map(n => <button key={n} onClick={() => setGrade(n)}><Icon name="Star" size={18} color={n <= grade ? "#facc15" : "rgba(255,255,255,0.2)"} /></button>)}
        </div>
        <button onClick={() => onGrade(hw.id, grade, comment)} disabled={!grade} className="px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-40" style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#10b981' }}>Поставить оценку</button>
      </div>
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

function Toast({ msg }: { msg: string }) {
  return <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl text-sm font-medium text-white animate-fade-up" style={{ background: 'rgba(59,130,246,0.92)', backdropFilter: 'blur(12px)', animationFillMode: 'forwards' }}>{msg}</div>;
}
