import { useState } from "react";
import Icon from "@/components/ui/icon";
import ModuleHeader from "@/components/ModuleHeader";
import { useApp } from "@/context/AppContext";
import { usePersistentState } from "@/hooks/usePersistentState";

// ── Типы конструктора курсов ──
type LessonType = "lecture" | "test" | "assignment" | "webinar";

interface TestQuestion { id: number; question: string; answers: string[]; correct: number; }

interface Lesson {
  id: number;
  title: string;
  type: LessonType;
  content: string;          // текст лекции / описание задания
  videoUrl?: string;        // YouTube/Vimeo (лекция)
  images: string[];         // изображения для лекции (data-url)
  files: string[];          // прикреплённые файлы
  completion: string;       // условие завершения
  // Тест
  questions: TestQuestion[];
  // Задание
  criteria?: string;        // критерии оценки
  // Вебинар
  webinarUrl?: string;
  lecturerName?: string;
  lecturerInfo?: string;
  lecturerPhoto?: string;   // data-url
}

interface Module { id: number; title: string; lessons: Lesson[]; }

interface Course {
  id: number;
  title: string;
  modules: Module[];
  published: boolean;       // опубликован ли курс
  documentName: string;     // получаемый документ
  documentHow: string;      // способ получения документа
  certSample: string;       // образец сертификата (data-url)
}

interface Student {
  id: number;
  name: string;
  email: string;
  role: "student" | "curator";
  progress: number;
  avgScore: number;
  status: "not_started" | "dropped" | "completed" | "in_progress";
  groupId?: number | null;
  courseId?: number;        // к какому курсу привязан ученик
}

interface Homework {
  id: number;
  studentName: string;
  courseTitle: string;
  courseId?: number;        // к какому курсу привязано ДЗ
  lessonTitle: string;
  text: string;
  files: string[];
  grade: number | null;
  comment: string;
  date: string;
  status: "pending" | "graded";
}

interface Group { id: number; courseId: number; name: string; startDate: string; }
interface Lesson_Plan { id: number; groupId: number; courseTitle: string; title: string; date: string; time: string; }
interface Enrollment { id: number; courseId: number; courseTitle: string; fio: string; phone: string; date: string; ownerId?: number; schoolName?: string; }

const newLesson = (type: LessonType): Lesson => ({
  id: Date.now(), title: LESSON_TYPES[type].label, type, content: "", images: [], files: [], completion: "Посмотреть до конца",
  questions: type === "test" ? [{ id: Date.now() + 1, question: "", answers: ["", "", "", ""], correct: 0 }] : [],
  criteria: "", webinarUrl: "", lecturerName: "", lecturerInfo: "", lecturerPhoto: "",
});

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
    id: 1, title: "Охрана труда и техника безопасности", published: true, documentName: "Удостоверение о проверке знаний по охране труда", documentHow: "Выдаётся лично или почтой после прохождения 100% курса", certSample: "",
    modules: [
      { id: 11, title: "Модуль 1. Введение", lessons: [
        { id: 111, title: "Что такое охрана труда", type: "lecture", content: "Основные понятия и нормативная база.", videoUrl: "https://youtube.com/watch?v=demo", images: [], files: ["lecture1.pdf"], completion: "Посмотреть до конца", questions: [] },
        { id: 112, title: "Входной тест", type: "test", content: "Проверка базовых знаний.", images: [], files: [], completion: "Набрать ≥ 60%", questions: [{ id: 1, question: "Что такое инструктаж?", answers: ["Проверка", "Обучение по ТБ", "Медосмотр", "Аудит"], correct: 1 }] },
      ] },
    ]
  },
];

const INITIAL_STUDENTS: Student[] = [
  { id: 1, name: "Иван Петров", email: "ivan@mail.ru", role: "student", progress: 75, avgScore: 4.5, status: "in_progress", groupId: null },
  { id: 2, name: "Анна Козлова", email: "anna@mail.ru", role: "curator", progress: 100, avgScore: 5.0, status: "completed", groupId: null },
];

const INITIAL_HOMEWORK: Homework[] = [
  { id: 1, studentName: "Иван Петров", courseTitle: "Охрана труда и техника безопасности", lessonTitle: "Кейс: расследование инцидента", text: "Мой порядок действий: 1) оказать первую помощь...", files: ["ivan_hw.pdf"], grade: null, comment: "", date: "03.06.2026", status: "pending" },
  { id: 2, studentName: "Мария Иванова", courseTitle: "Охрана труда и техника безопасности", lessonTitle: "Кейс: расследование инцидента", text: "Прикладываю отчёт.", files: ["maria_hw.docx"], grade: 4, comment: "Хорошо, но не хватает деталей.", date: "01.06.2026", status: "graded" },
];

type Tab = "constructor" | "students" | "homework" | "groups" | "enroll" | "analytics" | "settings";

interface Props { onBack: () => void; initialTab?: Tab; initialCourseId?: number; }

export default function SchoolAdmin({ onBack, initialTab, initialCourseId }: Props) {
  const { users, currentUser } = useApp();

  const [tab, setTab] = useState<Tab>(initialTab || "constructor");
  const [courses, setCourses] = usePersistentState<Course[]>(`school_courses_${currentUser.id}`, INITIAL_COURSES);
  const [students, setStudents] = usePersistentState<Student[]>(`school_students_${currentUser.id}`, INITIAL_STUDENTS);
  const [homework, setHomework] = usePersistentState<Homework[]>(`school_homework_${currentUser.id}`, INITIAL_HOMEWORK);
  const [groups, setGroups] = usePersistentState<Group[]>(`school_groups_${currentUser.id}`, []);
  const [plans, setPlans] = usePersistentState<Lesson_Plan[]>(`school_plans_${currentUser.id}`, []);
  // Записи на курсы — глобальный store (заполняется учениками из раздела «Обучение»)
  const [enrollments] = usePersistentState<Enrollment[]>(`school_enrollments_all`, []);

  // Если передан initialCourseId — используем его, иначе первый курс
  const resolvedCourseId = initialCourseId && courses.find(c => c.id === initialCourseId) ? initialCourseId : courses[0]?.id || 0;
  const [activeCourseId, setActiveCourseId] = useState<number>(resolvedCourseId);
  const [toast, setToast] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [hwFilter, setHwFilter] = useState("");
  const [deadlineDays, setDeadlineDays] = useState("14");
  const [testTimer, setTestTimer] = useState("30");
  const [editingLesson, setEditingLesson] = useState<{ moduleId: number; lesson: Lesson } | null>(null);
  const [calMode, setCalMode] = useState<"month" | "week" | "day">("month");
  const [newGroup, setNewGroup] = useState({ name: "", startDate: "", courseId: 0 });
  const [newPlan, setNewPlan] = useState({ groupId: 0, title: "", date: "", time: "" });

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2200); };
  const activeCourse = courses.find(c => c.id === activeCourseId) || courses[0];
  // Записи на курсы этой школы (по ownerId владельца). Старые записи без ownerId показываем тоже.
  const myEnrollments = enrollments.filter(e => e.ownerId === undefined || e.ownerId === currentUser.id);

  // ── Конструктор: операции ──
  const addCourse = () => { const id = Date.now(); setCourses(prev => [...prev, { id, title: "", modules: [], published: false, documentName: "", documentHow: "", certSample: "" }]); setActiveCourseId(id); showToast("Курс создан — задайте название"); };
  const renameCourse = (title: string) => setCourses(prev => prev.map(c => c.id === activeCourseId ? { ...c, title } : c));
  const addModule = () => setCourses(prev => prev.map(c => c.id === activeCourseId ? { ...c, modules: [...c.modules, { id: Date.now(), title: `Новый модуль ${c.modules.length + 1}`, lessons: [] }] } : c));
  const deleteModule = (moduleId: number) => setCourses(prev => prev.map(c => c.id !== activeCourseId ? c : { ...c, modules: c.modules.filter(m => m.id !== moduleId) }));
  const addLesson = (moduleId: number, type: LessonType) => setCourses(prev => prev.map(c => c.id !== activeCourseId ? c : { ...c, modules: c.modules.map(m => m.id !== moduleId ? m : { ...m, lessons: [...m.lessons, newLesson(type)] }) }));
  const deleteLesson = (moduleId: number, lessonId: number) => setCourses(prev => prev.map(c => c.id !== activeCourseId ? c : { ...c, modules: c.modules.map(m => m.id !== moduleId ? m : { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) }) }));
  const moveLesson = (moduleId: number, idx: number, dir: -1 | 1) => setCourses(prev => prev.map(c => c.id !== activeCourseId ? c : { ...c, modules: c.modules.map(m => {
    if (m.id !== moduleId) return m;
    const arr = [...m.lessons]; const ni = idx + dir; if (ni < 0 || ni >= arr.length) return m;
    [arr[idx], arr[ni]] = [arr[ni], arr[idx]]; return { ...m, lessons: arr };
  }) }));
  const saveLesson = () => {
    if (!editingLesson) return;
    setCourses(prev => prev.map(c => c.id !== activeCourseId ? c : { ...c, modules: c.modules.map(m => m.id !== editingLesson.moduleId ? m : { ...m, lessons: m.lessons.map(l => l.id === editingLesson.lesson.id ? editingLesson.lesson : l) }) }));
    setEditingLesson(null); showToast("Урок сохранён");
  };
  const updateCourse = (patch: Partial<Course>) => setCourses(prev => prev.map(c => c.id === activeCourseId ? { ...c, ...patch } : c));
  const togglePublish = () => { updateCourse({ published: !activeCourse.published }); showToast(activeCourse.published ? "Курс снят с публикации" : "✅ Курс опубликован — виден ученикам"); };

  const readImage = (file: File, cb: (url: string) => void) => { const r = new FileReader(); r.onload = () => cb(r.result as string); r.readAsDataURL(file); };

  // Студенты
  const enrolledNames = new Set(students.map(s => s.email));
  const candidates = users.filter(u => !enrolledNames.has(u.email) && (u.name.toLowerCase().includes(studentSearch.toLowerCase()) || u.email.toLowerCase().includes(studentSearch.toLowerCase())));
  // Данные, отфильтрованные по текущему активному курсу
  const courseStudents = students.filter(s => !s.courseId || s.courseId === activeCourseId);
  const courseHomework = homework.filter(h => !h.courseId || h.courseId === activeCourseId);
  const courseGroups = groups.filter(g => g.courseId === activeCourseId);
  const courseEnrollments = myEnrollments.filter(e => e.courseId === activeCourseId);

  const addStudentFromUser = (u: typeof users[0]) => {
    setStudents(prev => [...prev, { id: u.id, name: u.name, email: u.email, role: "student", progress: 0, avgScore: 0, status: "not_started", groupId: null, courseId: activeCourseId }]);
    showToast(`${u.name} записан на курс`);
  };
  const toggleCurator = (id: number) => setStudents(prev => prev.map(s => s.id === id ? { ...s, role: s.role === "curator" ? "student" : "curator" } : s));
  const assignGroup = (studentId: number, groupId: number | null) => setStudents(prev => prev.map(s => s.id === studentId ? { ...s, groupId } : s));

  const gradeHw = (id: number, grade: number, comment: string) => { setHomework(prev => prev.map(h => h.id === id ? { ...h, grade, comment, status: "graded" } : h)); showToast("Оценка выставлена"); };

  const filteredHw = courseHomework.filter(h => h.studentName.toLowerCase().includes(hwFilter.toLowerCase()) || h.courseTitle.toLowerCase().includes(hwFilter.toLowerCase()));
  const groupAvg = courseStudents.length ? (courseStudents.reduce((s, x) => s + x.avgScore, 0) / courseStudents.length).toFixed(1) : "0";

  const TABS = [
    { k: "constructor", label: "Конструктор", icon: "LayoutGrid" },
    { k: "students", label: "Ученики", icon: "Users" },
    { k: "homework", label: "Проверка ДЗ", icon: "ClipboardCheck", badge: courseHomework.filter(h => h.status === "pending").length },
    { k: "groups", label: "Группы", icon: "CalendarDays" },
    { k: "enroll", label: "Записи", icon: "UserPlus", badge: courseEnrollments.length },
    { k: "analytics", label: "Аналитика", icon: "BarChart3" },
    { k: "settings", label: "Доступ", icon: "Settings" },
  ] as const;

  // ── LESSON EDITOR (формы по типам) ──
  if (editingLesson) {
    const L = editingLesson.lesson;
    const meta = LESSON_TYPES[L.type];
    const setL = (patch: Partial<Lesson>) => setEditingLesson(e => e && { ...e, lesson: { ...e.lesson, ...patch } });
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        {toast && <Toast msg={toast} />}
        <ModuleHeader title="Редактор урока" onBack={() => setEditingLesson(null)} icon={meta.icon} iconColor={meta.color} subtitle={meta.label} />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
          <Field label="Название урока" value={L.title} onChange={v => setL({ title: v })} />
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Тип занятия</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(LESSON_TYPES) as LessonType[]).map(t => (
                <button key={t} onClick={() => setL({ type: t })} className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ background: L.type === t ? `${LESSON_TYPES[t].color}20` : 'rgba(255,255,255,0.04)', border: `1px solid ${L.type === t ? LESSON_TYPES[t].color : 'rgba(255,255,255,0.1)'}`, color: L.type === t ? LESSON_TYPES[t].color : 'rgba(255,255,255,0.6)' }}>
                  <Icon name={LESSON_TYPES[t].icon} size={15} color={L.type === t ? LESSON_TYPES[t].color : 'rgba(255,255,255,0.5)'} />{LESSON_TYPES[t].label}
                </button>
              ))}
            </div>
          </div>

          {/* ── ЛЕКЦИЯ: загрузка PDF ── */}
          {L.type === "lecture" && (
            <div className="glass rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Загрузка лекции (PDF)</p>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                id="lecture-pdf-input"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.type !== "application/pdf") { showToast("Поддерживается только PDF"); e.target.value = ""; return; }
                  if (f.size > 50 * 1024 * 1024) { showToast("Файл слишком большой — максимум 50 МБ"); e.target.value = ""; return; }
                  const reader = new FileReader();
                  reader.onload = () => setL({ content: reader.result as string, files: [f.name] });
                  reader.readAsDataURL(f);
                  e.target.value = "";
                }}
              />
              {L.content && L.content.startsWith("data:application/pdf") ? (
                <div className="space-y-3">
                  {/* Имя файла + кнопка замены */}
                  <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                    <Icon name="FileText" size={20} color="#ef4444" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{L.files[0] || "lecture.pdf"}</p>
                      <p className="text-xs text-white/40">PDF · загружен</p>
                    </div>
                    <button
                      onClick={() => document.getElementById("lecture-pdf-input")?.click()}
                      className="text-xs px-3 py-1.5 rounded-lg flex-shrink-0"
                      style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
                    >Заменить</button>
                    <button
                      onClick={() => setL({ content: "", files: [] })}
                      className="p-1.5 rounded-lg hover:bg-white/10"
                    ><Icon name="X" size={15} color="rgba(239,68,68,0.7)" /></button>
                  </div>
                  {/* Встроенный просмотрщик PDF без возможности копирования */}
                  <div
                    className="rounded-xl overflow-hidden"
                    style={{ height: 480, position: 'relative' }}
                    onContextMenu={e => e.preventDefault()}
                  >
                    <div style={{ position: 'absolute', inset: 0, zIndex: 1, userSelect: 'none', WebkitUserSelect: 'none' }} onContextMenu={e => e.preventDefault()} />
                    <embed
                      src={`${L.content}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                      type="application/pdf"
                      width="100%"
                      height="100%"
                      style={{ pointerEvents: 'none', display: 'block' }}
                    />
                  </div>
                  <p className="text-xs text-white/30">Предпросмотр PDF. Копирование текста отключено.</p>
                </div>
              ) : (
                <button
                  onClick={() => document.getElementById("lecture-pdf-input")?.click()}
                  className="w-full flex flex-col items-center gap-3 py-8 rounded-xl transition-all"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '2px dashed rgba(255,255,255,0.15)' }}
                >
                  <Icon name="FileText" size={32} color="rgba(239,68,68,0.6)" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-white/70">Загрузить PDF-файл</p>
                    <p className="text-xs text-white/30 mt-1">Только PDF · до 50 МБ</p>
                  </div>
                </button>
              )}
              <Field label="Видео (YouTube / Vimeo)" value={L.videoUrl || ""} onChange={v => setL({ videoUrl: v })} placeholder="https://youtube.com/watch?v=..." />
            </div>
          )}

          {/* ── ТЕСТ: вопросы + 4 варианта + правильный ── */}
          {L.type === "test" && (
            <div className="space-y-3">
              {L.questions.map((q, qi) => (
                <div key={q.id} className="glass rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-white/40">Вопрос {qi + 1}</span><button onClick={() => setL({ questions: L.questions.filter(x => x.id !== q.id) })} className="p-1 rounded hover:bg-white/10"><Icon name="Trash2" size={13} color="rgba(239,68,68,0.7)" /></button></div>
                  <input className="input-field text-sm mb-2" placeholder="Текст вопроса" value={q.question} onChange={e => setL({ questions: L.questions.map(x => x.id === q.id ? { ...x, question: e.target.value } : x) })} />
                  <div className="space-y-2">
                    {q.answers.map((a, ai) => (
                      <div key={ai} className="flex items-center gap-2">
                        <button onClick={() => setL({ questions: L.questions.map(x => x.id === q.id ? { ...x, correct: ai } : x) })} className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0" style={{ borderColor: q.correct === ai ? '#10b981' : 'rgba(255,255,255,0.3)' }}>{q.correct === ai && <div className="w-2.5 h-2.5 rounded-full bg-green-500" />}</button>
                        <input className="input-field text-sm py-2 flex-1" placeholder={`Вариант ${ai + 1}`} value={a} onChange={e => setL({ questions: L.questions.map(x => x.id === q.id ? { ...x, answers: x.answers.map((y, yi) => yi === ai ? e.target.value : y) } : x) })} />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-white/30 mt-2">Отметьте кружком правильный вариант ответа.</p>
                </div>
              ))}
              <button onClick={() => setL({ questions: [...L.questions, { id: Date.now(), question: "", answers: ["", "", "", ""], correct: 0 }] })} className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}><Icon name="Plus" size={15} color="#10b981" />Добавить вопрос</button>
            </div>
          )}

          {/* ── ЗАДАНИЕ: текст + файлы + критерии ── */}
          {L.type === "assignment" && (
            <div className="glass rounded-2xl p-4 space-y-3">
              <Field label="Текст задания" value={L.content} onChange={v => setL({ content: v })} textarea />
              <div>
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Файлы к заданию</label>
                <div className="flex flex-wrap gap-2 mb-2">{L.files.map((f, i) => <span key={i} className="text-xs px-2 py-1 rounded-lg flex items-center gap-1" style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}><Icon name="Paperclip" size={11} />{f}<button onClick={() => setL({ files: L.files.filter((_, idx) => idx !== i) })}><Icon name="X" size={11} color="#fbbf24" /></button></span>)}</div>
                <label className="text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1 cursor-pointer" style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24' }}><Icon name="Upload" size={13} color="#fbbf24" />Прикрепить файл<input type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setL({ files: [...L.files, f.name] }); e.target.value = ""; }} /></label>
              </div>
              <Field label="Критерии оценки" value={L.criteria || ""} onChange={v => setL({ criteria: v })} textarea placeholder="Например: полнота ответа, оформление, сроки..." />
            </div>
          )}

          {/* ── ВЕБИНАР: ссылка + лектор ── */}
          {L.type === "webinar" && (
            <div className="glass rounded-2xl p-4 space-y-3">
              <Field label="Ссылка на вебинар (трансляция)" value={L.webinarUrl || ""} onChange={v => setL({ webinarUrl: v })} placeholder="https://..." />
              <div className="flex items-center gap-3">
                <label className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 cursor-pointer overflow-hidden" style={{ background: 'rgba(239,68,68,0.12)' }}>
                  {L.lecturerPhoto ? <img src={L.lecturerPhoto} alt="" className="w-full h-full object-cover" /> : <Icon name="UserPlus" size={22} color="#ef4444" />}
                  <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) readImage(f, url => setL({ lecturerPhoto: url })); e.target.value = ""; }} />
                </label>
                <p className="text-xs text-white/40">Фото лектора</p>
              </div>
              <Field label="Имя лектора" value={L.lecturerName || ""} onChange={v => setL({ lecturerName: v })} />
              <Field label="О лекторе" value={L.lecturerInfo || ""} onChange={v => setL({ lecturerInfo: v })} textarea />
            </div>
          )}

          <Field label="Условие завершения урока" value={L.completion} onChange={v => setL({ completion: v })} placeholder="Например: посмотреть до конца" />
          <button onClick={saveLesson} className="btn-primary flex items-center justify-center gap-2"><Icon name="Check" size={18} />Сохранить урок</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      {toast && <Toast msg={toast} />}
      <ModuleHeader
        title={activeCourse?.title || "Школа · Управление"}
        onBack={onBack}
        icon="GraduationCap"
        iconColor="#3b82f6"
        subtitle="Управление курсом"
      />
      <div className="max-w-2xl mx-auto px-4 pt-3 space-y-2">
        {/* Переключатель курсов — виден на всех вкладках */}
        {courses.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {courses.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveCourseId(c.id)}
                className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium"
                style={{
                  background: activeCourseId === c.id ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${activeCourseId === c.id ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`,
                  color: activeCourseId === c.id ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
                }}
              >
                {c.title || "Без названия"}
              </button>
            ))}
          </div>
        )}
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
        {tab === "constructor" && !activeCourse && (
          <div className="text-center py-16 space-y-4">
            <Icon name="GraduationCap" size={40} color="rgba(255,255,255,0.2)" className="mx-auto" />
            <p className="text-white/40">Нет курсов. Создайте первый курс.</p>
            <button onClick={addCourse} className="btn-primary flex items-center justify-center gap-2 mx-auto px-8" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
              <Icon name="Plus" size={18} />Создать курс
            </button>
          </div>
        )}
        {tab === "constructor" && activeCourse && (
          <div className="space-y-4">
            {/* Кнопка добавить курс */}
            <div className="flex justify-end">
              <button onClick={addCourse} className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1" style={{ background: 'rgba(99,102,241,0.12)', border: '1px dashed rgba(99,102,241,0.4)', color: '#818cf8' }}>
                <Icon name="Plus" size={13} color="#818cf8" />Новый курс
              </button>
            </div>

            {/* Название курса (исправлено: рабочее поле) */}
            <div className="glass rounded-2xl p-4 space-y-3">
              <Field label="Название курса" value={activeCourse.title} onChange={renameCourse} placeholder="Введите название курса..." />
              <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: activeCourse.published ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${activeCourse.published ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}` }}>
                <div className="flex items-center gap-2"><Icon name={activeCourse.published ? "Globe" : "EyeOff"} size={16} color={activeCourse.published ? "#10b981" : "rgba(255,255,255,0.5)"} /><span className="text-sm text-white/80">{activeCourse.published ? "Опубликован — виден ученикам" : "Черновик (не опубликован)"}</span></div>
                <button onClick={togglePublish} disabled={!activeCourse.title.trim()} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-40" style={{ background: activeCourse.published ? 'rgba(239,68,68,0.7)' : 'linear-gradient(135deg,#10b981,#059669)' }}>{activeCourse.published ? "Снять" : "Опубликовать курс"}</button>
              </div>
            </div>

            <p className="text-xs text-white/30 px-1">Перетаскивание уроков — стрелками ↑↓. Каждый урок имеет свою форму ввода по типу.</p>
            {activeCourse.modules.map(m => (
              <div key={m.id} className="glass rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="Folder" size={16} color="#3b82f6" />
                  <input className="bg-transparent text-sm font-semibold text-white flex-1 outline-none border-b border-transparent focus:border-white/20" value={m.title} onChange={e => setCourses(prev => prev.map(c => c.id !== activeCourseId ? c : { ...c, modules: c.modules.map(x => x.id === m.id ? { ...x, title: e.target.value } : x) }))} />
                  <button onClick={() => deleteModule(m.id)} className="p-1.5 rounded-lg hover:bg-white/10"><Icon name="Trash2" size={14} color="rgba(239,68,68,0.7)" /></button>
                </div>
                <div className="space-y-2 mb-3">
                  {m.lessons.map((l, idx) => {
                    const lm = LESSON_TYPES[l.type];
                    return (
                      <div key={l.id} className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <div className="flex flex-col"><button onClick={() => moveLesson(m.id, idx, -1)} className="hover:text-white text-white/30"><Icon name="ChevronUp" size={13} /></button><button onClick={() => moveLesson(m.id, idx, 1)} className="hover:text-white text-white/30"><Icon name="ChevronDown" size={13} /></button></div>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${lm.color}18` }}><Icon name={lm.icon} size={14} color={lm.color} /></div>
                        <div className="flex-1 min-w-0"><p className="text-sm text-white truncate">{l.title}</p><p className="text-xs" style={{ color: lm.color }}>{lm.label}</p></div>
                        <button onClick={() => setEditingLesson({ moduleId: m.id, lesson: l })} className="p-1.5 rounded-lg hover:bg-white/10"><Icon name="Pencil" size={13} color="rgba(255,255,255,0.6)" /></button>
                        <button onClick={() => deleteLesson(m.id, l.id)} className="p-1.5 rounded-lg hover:bg-white/10"><Icon name="Trash2" size={13} color="rgba(239,68,68,0.7)" /></button>
                      </div>
                    );
                  })}
                  {m.lessons.length === 0 && <p className="text-xs text-white/30 text-center py-2">Нет уроков</p>}
                </div>
                <div className="flex flex-wrap gap-2">{(Object.keys(LESSON_TYPES) as LessonType[]).map(t => <button key={t} onClick={() => addLesson(m.id, t)} className="text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1" style={{ background: `${LESSON_TYPES[t].color}15`, color: LESSON_TYPES[t].color }}><Icon name="Plus" size={11} color={LESSON_TYPES[t].color} />{LESSON_TYPES[t].label}</button>)}</div>
              </div>
            ))}
            <button onClick={addModule} className="btn-primary flex items-center justify-center gap-2"><Icon name="FolderPlus" size={18} />Добавить модуль</button>
          </div>
        )}

        {/* ── УЧЕНИКИ (поиск по зарегистрированным + добавление) ── */}
        {tab === "students" && (
          <div className="space-y-3">
            <div className="glass rounded-2xl p-4">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Найти зарегистрированного пользователя</p>
              <div className="relative mb-2"><Icon name="Search" size={15} color="rgba(255,255,255,0.3)" className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" /><input className="input-field pl-9 py-2.5 text-sm" placeholder="Имя или email..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} /></div>
              {studentSearch && (
                <div className="space-y-1">
                  {candidates.slice(0, 6).map(u => (
                    <div key={u.id} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg,#3b82f6,#7c3aed)' }}>{u.name[0]}</div>
                      <div className="flex-1 min-w-0"><p className="text-sm text-white truncate">{u.name}</p><p className="text-xs text-white/40">{u.email}</p></div>
                      <button onClick={() => addStudentFromUser(u)} className="text-xs px-2.5 py-1 rounded-lg" style={{ background: 'rgba(59,130,246,0.2)', color: '#60a5fa' }}>Добавить в группу</button>
                    </div>
                  ))}
                  {candidates.length === 0 && <p className="text-xs text-white/30 text-center py-2">Не найдено</p>}
                </div>
              )}
            </div>
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider px-1">Ученики курса «{activeCourse?.title || "—"}» ({courseStudents.length})</p>
            {courseStudents.map(s => {
              const st = STATUS_META[s.status];
              const grp = courseGroups.find(g => g.id === s.groupId);
              return (
                <div key={s.id} className="glass rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white" style={{ background: s.role === "curator" ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#3b82f6,#7c3aed)' }}>{s.name[0].toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2"><p className="text-sm font-semibold text-white">{s.name}</p>{s.role === "curator" && <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>Куратор</span>}</div>
                      <p className="text-xs text-white/40">{s.email}{grp ? ` · ${grp.name}` : ""}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: `${st.color}18`, color: st.color }}>{st.label}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex-1"><div className="h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${s.progress}%`, background: 'linear-gradient(90deg,#3b82f6,#8b5cf6)' }} /></div></div>
                    <span className="text-xs text-white/50">{s.progress}%</span>
                    {courseGroups.length > 0 && <select value={s.groupId || ""} onChange={e => assignGroup(s.id, e.target.value ? Number(e.target.value) : null)} className="text-xs rounded-lg px-2 py-1" style={{ background: 'rgba(255,255,255,0.06)', color: 'white' }}><option value="" style={{ background: '#1a1a2e' }}>Без группы</option>{courseGroups.map(g => <option key={g.id} value={g.id} style={{ background: '#1a1a2e' }}>{g.name}</option>)}</select>}
                    <button onClick={() => toggleCurator(s.id)} className="text-xs px-2.5 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}>{s.role === "curator" ? "Снять" : "Куратор"}</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── ПРОВЕРКА ДЗ (курс + урок + атрибуты) ── */}
        {tab === "homework" && (
          <div className="space-y-3">
            <input className="input-field text-sm py-2.5" placeholder="Фильтр по студенту или курсу..." value={hwFilter} onChange={e => setHwFilter(e.target.value)} />
            {filteredHw.map(h => <HwCard key={h.id} hw={h} onGrade={gradeHw} />)}
            {filteredHw.length === 0 && <div className="text-center py-12 text-white/30 text-sm">Нет работ на проверку</div>}
          </div>
        )}

        {/* ── ГРУППЫ + КАЛЕНДАРЬ ── */}
        {tab === "groups" && (
          <div className="space-y-4">
            <div className="glass rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Создать группу</p>
              <input className="input-field text-sm py-2.5" placeholder="Название группы (напр. ОТ-2026/1)" value={newGroup.name} onChange={e => setNewGroup(g => ({ ...g, name: e.target.value }))} />
              <div className="flex gap-2">
                <input className="input-field text-sm py-2.5 flex-1" type="date" value={newGroup.startDate} onChange={e => setNewGroup(g => ({ ...g, startDate: e.target.value }))} />
                <div className="flex-1 px-3 py-2.5 rounded-xl text-sm text-white/60 truncate" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {activeCourse?.title || "Выберите курс"}
                </div>
              </div>
              <button onClick={() => { if (newGroup.name) { setGroups(prev => [...prev, { id: Date.now(), courseId: activeCourseId, name: newGroup.name, startDate: newGroup.startDate || "—" }]); setNewGroup({ name: "", startDate: "", courseId: 0 }); showToast("Группа создана"); } }} className="btn-primary text-sm flex items-center justify-center gap-2"><Icon name="Plus" size={16} />Создать группу</button>
            </div>

            {courseGroups.length === 0 && <p className="text-center text-white/30 text-sm py-4">Нет групп для этого курса</p>}
            {courseGroups.map(g => <div key={g.id} className="glass rounded-2xl p-3 flex items-center gap-3"><Icon name="Users" size={16} color="#3b82f6" /><div className="flex-1"><p className="text-sm text-white">{g.name}</p><p className="text-xs text-white/40">Начало: {g.startDate} · {activeCourse?.title || "—"}</p></div><button onClick={() => setGroups(prev => prev.filter(x => x.id !== g.id))} className="p-1.5 rounded-lg hover:bg-white/10"><Icon name="Trash2" size={13} color="rgba(239,68,68,0.7)" /></button></div>)}

            {/* Планирование занятия */}
            <div className="glass rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Запланировать занятие</p>
              <select className="input-field text-sm py-2.5" value={newPlan.groupId || ""} onChange={e => setNewPlan(p => ({ ...p, groupId: Number(e.target.value) }))} style={{ background: 'rgba(255,255,255,0.06)' }}><option value="" style={{ background: '#1a1a2e' }}>Выберите группу</option>{courseGroups.map(g => <option key={g.id} value={g.id} style={{ background: '#1a1a2e' }}>{g.name}</option>)}</select>
              <input className="input-field text-sm py-2.5" placeholder="Название занятия" value={newPlan.title} onChange={e => setNewPlan(p => ({ ...p, title: e.target.value }))} />
              <div className="flex gap-2"><input className="input-field text-sm py-2.5 flex-1" type="date" value={newPlan.date} onChange={e => setNewPlan(p => ({ ...p, date: e.target.value }))} /><input className="input-field text-sm py-2.5 flex-1" type="time" value={newPlan.time} onChange={e => setNewPlan(p => ({ ...p, time: e.target.value }))} /></div>
              <button onClick={() => { const g = courseGroups.find(x => x.id === newPlan.groupId); if (g && newPlan.title && newPlan.date) { setPlans(prev => [...prev, { id: Date.now(), groupId: g.id, courseTitle: activeCourse?.title || "—", title: newPlan.title, date: newPlan.date, time: newPlan.time }]); setNewPlan({ groupId: 0, title: "", date: "", time: "" }); showToast("Занятие запланировано"); } }} className="btn-primary text-sm flex items-center justify-center gap-2"><Icon name="CalendarPlus" size={16} />Добавить в календарь</button>
            </div>

            {/* Календарь */}
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Календарь занятий</p>
                <div className="flex gap-1">{(["month", "week", "day"] as const).map(m => <button key={m} onClick={() => setCalMode(m)} className="text-xs px-2.5 py-1 rounded-lg" style={{ background: calMode === m ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.06)', color: calMode === m ? '#60a5fa' : 'rgba(255,255,255,0.5)' }}>{m === "month" ? "Месяц" : m === "week" ? "Неделя" : "День"}</button>)}</div>
              </div>
              <CalendarView mode={calMode} plans={plans} groups={groups} onDelete={id => setPlans(prev => prev.filter(p => p.id !== id))} />
            </div>
          </div>
        )}

        {/* ── ЗАПИСИ НА КУРС ── */}
        {tab === "enroll" && (
          <div className="space-y-3">
            <p className="text-xs text-white/40 px-1">Записи на курс «{activeCourse?.title || "—"}» поступают от пользователей через раздел «Обучение».</p>
            {courseEnrollments.length === 0 && <div className="text-center py-10 text-white/30 text-sm">Пока нет записей на этот курс</div>}
            {courseEnrollments.map(en => (
              <div key={en.id} className="glass rounded-2xl p-4">
                <div className="flex items-center justify-between mb-1"><p className="text-sm font-semibold text-white">{en.fio}</p><span className="text-xs text-white/40">{en.date}</span></div>
                <p className="text-xs text-white/50 flex items-center gap-1"><Icon name="Phone" size={11} />{en.phone}</p>
                <p className="text-xs text-white/50 flex items-center gap-1 mt-1"><Icon name="GraduationCap" size={11} color="#3b82f6" />Курс: {en.courseTitle}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── АНАЛИТИКА ── */}
        {tab === "analytics" && (
          <div className="space-y-4">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider px-1">Аналитика курса «{activeCourse?.title || "—"}»</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="glass rounded-2xl p-4 text-center"><div className="text-2xl font-bold text-white">{groupAvg}</div><div className="text-xs text-white/40">Средний балл</div></div>
              <div className="glass rounded-2xl p-4 text-center"><div className="text-2xl font-bold text-green-400">{courseStudents.filter(s => s.status === "completed").length}/{courseStudents.length}</div><div className="text-xs text-white/40">Завершили</div></div>
              <div className="glass rounded-2xl p-4 text-center"><div className="text-2xl font-bold text-blue-400">{courseEnrollments.length}</div><div className="text-xs text-white/40">Записей</div></div>
              <div className="glass rounded-2xl p-4 text-center"><div className="text-2xl font-bold text-violet-400">{courseGroups.length}</div><div className="text-xs text-white/40">Групп</div></div>
            </div>
            <div className="glass rounded-2xl p-4">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Прогресс студентов</p>
              {courseStudents.length === 0 && <p className="text-center text-white/30 text-sm py-4">Нет учеников на этом курсе</p>}
              {(["not_started", "dropped", "in_progress", "completed"] as Student["status"][]).map(st => {
                const arr = courseStudents.filter(s => s.status === st); const meta = STATUS_META[st]; const pct = courseStudents.length ? Math.round(arr.length / courseStudents.length * 100) : 0;
                return (<div key={st} className="mb-3 last:mb-0"><div className="flex items-center justify-between mb-1"><span className="text-sm text-white/70">{meta.label}</span><span className="text-sm font-semibold" style={{ color: meta.color }}>{arr.length}</span></div><div className="h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: meta.color }} /></div></div>);
              })}
            </div>
          </div>
        )}

        {/* ── ДОСТУП / СЕРТИФИКАТ ── */}
        {tab === "settings" && activeCourse && (
          <div className="space-y-4">
            <div className="glass rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Дедлайны и таймеры</p>
              <Field label="Дедлайн на сдачу ДЗ (дней)" value={deadlineDays} onChange={setDeadlineDays} />
              <Field label="Таймер на тест (минут)" value={testTimer} onChange={setTestTimer} />
            </div>

            {/* Сертификат / документ */}
            <div className="glass rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Документ по итогу курса «{activeCourse.title || "—"}»</p>
              <Field label="Получаемый документ" value={activeCourse.documentName} onChange={v => updateCourse({ documentName: v })} placeholder="Напр.: Удостоверение о повышении квалификации" />
              <Field label="Способ получения" value={activeCourse.documentHow} onChange={v => updateCourse({ documentHow: v })} textarea placeholder="Напр.: выдаётся лично/почтой после 100% прохождения" />
              <div>
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Образец сертификата (загрузить для курса)</label>
                {activeCourse.certSample ? (
                  <div className="rounded-xl overflow-hidden relative"><img src={activeCourse.certSample} alt="" className="w-full max-h-56 object-contain" style={{ background: '#fff' }} /><button onClick={() => updateCourse({ certSample: "" })} className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}><Icon name="X" size={15} color="white" /></button></div>
                ) : (
                  <label className="w-full flex items-center gap-3 p-4 rounded-xl cursor-pointer" style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)' }}><Icon name="Upload" size={18} color="rgba(255,255,255,0.4)" /><span className="text-sm text-white/40">Загрузить образец документа</span><input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) readImage(f, url => updateCourse({ certSample: url })); e.target.value = ""; }} /></label>
                )}
              </div>
              <p className="text-xs text-white/30">Выдаётся автоматически при выполнении 100% курса.</p>
            </div>
            <button onClick={() => showToast("✅ Настройки сохранены")} className="btn-primary flex items-center justify-center gap-2"><Icon name="Check" size={18} />Сохранить настройки</button>
          </div>
        )}
      </div>
    </div>
  );
}

function CalendarView({ mode, plans, groups, onDelete }: { mode: "month" | "week" | "day"; plans: Lesson_Plan[]; groups: Group[]; onDelete: (id: number) => void }) {
  const sorted = [...plans].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const today = new Date().toISOString().slice(0, 10);
  let visible = sorted;
  if (mode === "day") visible = sorted.filter(p => p.date === today);
  else if (mode === "week") { const wk = new Date(); const end = new Date(wk.getTime() + 7 * 86400000).toISOString().slice(0, 10); visible = sorted.filter(p => p.date >= today && p.date <= end); }
  const label = mode === "month" ? "Все занятия месяца" : mode === "week" ? "Ближайшая неделя" : "Сегодня";
  return (
    <div>
      <p className="text-xs text-white/40 mb-2">{label}</p>
      {visible.length === 0 ? <p className="text-center py-6 text-white/30 text-sm">Нет запланированных занятий</p> : (
        <div className="space-y-2">
          {visible.map(p => {
            const g = groups.find(x => x.id === p.groupId);
            return (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <div className="text-center flex-shrink-0"><div className="text-sm font-bold text-blue-400">{p.date.slice(8, 10)}.{p.date.slice(5, 7)}</div><div className="text-xs text-white/40">{p.time}</div></div>
                <div className="flex-1 min-w-0"><p className="text-sm text-white truncate">{p.title}</p><p className="text-xs text-white/40">{g?.name || "—"} · {p.courseTitle}</p></div>
                <button onClick={() => onDelete(p.id)} className="p-1.5 rounded-lg hover:bg-white/10"><Icon name="Trash2" size={13} color="rgba(239,68,68,0.7)" /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HwCard({ hw, onGrade }: { hw: Homework; onGrade: (id: number, grade: number, comment: string) => void }) {
  const [grade, setGrade] = useState(hw.grade ?? 0);
  const [comment, setComment] = useState(hw.comment);
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2"><div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg,#3b82f6,#7c3aed)' }}>{hw.studentName[0]}</div><div><p className="text-sm font-semibold text-white">{hw.studentName}</p><p className="text-xs text-white/40">Сдано: {hw.date}</p></div></div>
        {hw.status === "graded" ? <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>Оценено: {hw.grade}</span> : <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>На проверке</span>}
      </div>
      {/* Атрибуты: курс и урок */}
      <div className="flex flex-wrap gap-2 mb-2">
        <span className="text-xs px-2 py-0.5 rounded-lg flex items-center gap-1" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}><Icon name="GraduationCap" size={11} color="#60a5fa" />Курс: {hw.courseTitle}</span>
        <span className="text-xs px-2 py-0.5 rounded-lg flex items-center gap-1" style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}><Icon name="BookOpen" size={11} color="#a78bfa" />Урок: {hw.lessonTitle}</span>
      </div>
      <p className="text-sm text-white/70 mb-2">{hw.text}</p>
      <div className="flex flex-wrap gap-2 mb-3">{hw.files.map((f, i) => <button key={i} className="text-xs px-2 py-1 rounded-lg flex items-center gap-1" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}><Icon name="Paperclip" size={11} />{f}</button>)}</div>
      <textarea className="input-field text-sm resize-none mb-2" rows={2} placeholder="Комментарий преподавателя..." value={comment} onChange={e => setComment(e.target.value)} />
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 flex-1">{[1, 2, 3, 4, 5].map(n => <button key={n} onClick={() => setGrade(n)}><Icon name="Star" size={18} color={n <= grade ? "#facc15" : "rgba(255,255,255,0.2)"} /></button>)}</div>
        <button onClick={() => onGrade(hw.id, grade, comment)} disabled={!grade} className="px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-40" style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#10b981' }}>Поставить оценку</button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, textarea }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean }) {
  return (
    <div>
      <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">{label}</label>
      {textarea ? <textarea className="input-field resize-none" rows={3} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} /> : <input className="input-field" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />}
    </div>
  );
}

function Toast({ msg }: { msg: string }) {
  return <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl text-sm font-medium text-white animate-fade-up" style={{ background: 'rgba(59,130,246,0.92)', backdropFilter: 'blur(12px)', animationFillMode: 'forwards' }}>{msg}</div>;
}