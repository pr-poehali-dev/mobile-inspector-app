import { useState } from "react";
import Icon from "@/components/ui/icon";
import ModuleHeader from "@/components/ModuleHeader";
import { useApp } from "@/context/AppContext";
import { useSharedState } from "@/hooks/useSharedState";
import SchoolsModule from "./SchoolsModule";
import type { PublishedCourse } from "./SchoolsModule";

interface Props { onBack: () => void; }

interface Enrollment { id: number; courseId: number; courseTitle: string; fio: string; phone: string; date: string; }

const COURSES = [
  { id: 1, title: "Охрана труда и техника безопасности", lessons: 8, duration: "3 ч 20 мин", progress: 75, category: "Обязательный", cert: false, image: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400", hours: "40 ч", audience: "Специалисты ОТ", description: "Базовый курс по охране труда и технике безопасности на производстве.", school: "Учебный центр «Безопасность»" },
  { id: 2, title: "Основы документооборота", lessons: 5, duration: "1 ч 45 мин", progress: 100, category: "Завершён", cert: true, image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400", hours: "16 ч", audience: "Делопроизводители", description: "Организация и ведение корпоративного документооборота.", school: "Академия Профразвития" },
  { id: 3, title: "Работа с корпоративной системой", lessons: 12, duration: "5 ч", progress: 0, category: "Новый", cert: false, image: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=400", hours: "24 ч", audience: "Все сотрудники", description: "Освоение корпоративной информационной системы предприятия.", school: "Учебный центр «Безопасность»" },
  { id: 4, title: "Управление проектами Agile", lessons: 10, duration: "4 ч 30 мин", progress: 30, category: "В процессе", cert: false, image: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400", hours: "72 ч", audience: "Менеджеры", description: "Гибкие методологии управления проектами Scrum и Kanban.", school: "Академия Профразвития" },
];

const QUESTIONS = [
  { id: 1, text: "Что такое инструктаж по охране труда?", options: ["Проверка оборудования", "Обязательное обучение по правилам безопасности", "Ежегодный медосмотр", "Аудит предприятия"], correct: 1 },
  { id: 2, text: "Как часто проводится повторный инструктаж?", options: ["Каждый месяц", "Каждые полгода", "Один раз в год", "По необходимости"], correct: 1 },
  { id: 3, text: "Что делать при обнаружении пожара?", options: ["Тушить самостоятельно", "Позвонить коллегам", "Немедленно покинуть помещение и вызвать 112", "Подождать руководителя"], correct: 2 },
];

export default function LearningModule({ onBack }: Props) {
  const { isAdmin, hasRole, currentUser, addRoleRequest, roleRequests } = useApp();
  const isSchool = isAdmin || hasRole("school");
  const mySchoolReq = roleRequests.filter(r => r.userId === currentUser.id && r.role === "school").slice(-1)[0];
  const [view, setView] = useState<"list" | "course" | "lesson" | "test" | "cert">("list");
  const [school, setSchool] = useState(false);
  const [browseMode, setBrowseMode] = useState<"all" | "schools" | "my-enrollments" | "my-courses">("all");
  const [selectedCourse, setSelectedCourse] = useState<typeof COURSES[0] | null>(null);
  const [testAnswers, setTestAnswers] = useState<Record<number, number>>({});
  const [testDone, setTestDone] = useState(false);
  const [activeLessonIdx, setActiveLessonIdx] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1); // скорость видео ученика
  const [hwText, setHwText] = useState("");
  const [hwFile, setHwFile] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatMsgs, setChatMsgs] = useState<{ author: string; text: string; me?: boolean; curator?: boolean }[]>([
    { author: "Анна (куратор)", text: "Добро пожаловать на курс! Задавайте вопросы здесь.", curator: true },
    { author: "Сергей", text: "Подскажите, где скачать методичку?" },
  ]);
  const [toast, setToast] = useState<string | null>(null);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollFio, setEnrollFio] = useState("");
  const [enrollPhone, setEnrollPhone] = useState("");
  const [allEnrollments, setAllEnrollments] = useSharedState<Enrollment[]>("school_enrollments_all", []);

  // Мои заявки (по userId или по fio — для обратной совместимости со старыми записями без userId)
  const myEnrollments = allEnrollments.filter(e => e.userId === currentUser.id);
  // Одобренные курсы — IDs курсов, на которые ученик получил доступ
  const approvedCourseIds = new Set(myEnrollments.filter(e => e.status === "approved").map(e => e.courseId));
  const [publishedCourses] = useSharedState<PublishedCourse[]>("published_courses_all", []);
  // Для просмотра уроков курса из конструктора — храним ownerId выбранного курса
  const [selectedCourseOwnerId, setSelectedCourseOwnerId] = useState<number | null>(null);
  // Читаем уроки конструктора владельца (по ownerId)
  const [ownerConstructorCourses] = useSharedState<{ id: number; modules: { id: number; title: string; lessons: { id: number; title: string; type: string; content: string; lectureType?: "pdf" | "text"; files: string[]; videoUrl?: string }[] }[] }[]>(
    selectedCourseOwnerId ? `school_courses_${selectedCourseOwnerId}` : "__none__",
    []
  );

  // Объединяем статические курсы + опубликованные курсы школ
  const allCourses = [
    ...COURSES,
    ...publishedCourses.map(p => ({
      id: p.id + 100000,   // смещаем ID чтобы не конфликтовал со статическими
      title: p.title,
      lessons: p.lessonsCount,
      duration: `${p.lessonsCount} уроков`,
      progress: 0,
      category: p.paid ? "Платный" : "Бесплатный",
      cert: p.cert,
      image: "",
      hours: `${p.lessonsCount} уроков`,
      audience: "",
      description: p.description,
      school: p.schoolName,
      price: p.price,
      paid: p.paid,
    })),
  ];

  // Кабинет школы — открываем SchoolsModule сразу на странице кабинета
  if (school) return <SchoolsModule onBack={() => setSchool(false)} initialView="cabinet" />;

  // Просмотр курсов по школам
  if (view === "list" && browseMode === "schools") return <SchoolsModule embedded onBack={() => setBrowseMode("all")} />;

  // ── МОИ ЗАПИСИ ──
  if (view === "list" && browseMode === "my-enrollments") {
    const statusMeta = {
      pending:  { label: "На рассмотрении", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: "Clock" },
      approved: { label: "Одобрено",         color: "#10b981", bg: "rgba(16,185,129,0.12)", icon: "CheckCircle" },
      rejected: { label: "Отклонено",        color: "#ef4444", bg: "rgba(239,68,68,0.08)",  icon: "XCircle" },
    } as const;
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl text-sm font-medium text-white animate-fade-up" style={{ background: 'rgba(59,130,246,0.9)', backdropFilter: 'blur(12px)' }}>{toast}</div>}
        <div className="glass border-b border-white/10 px-4 py-3 sticky top-0 z-20">
          <div className="max-w-2xl mx-auto flex items-center gap-2">
            <button onClick={() => setBrowseMode("all")} className="p-2 rounded-xl hover:bg-white/10 flex-shrink-0"><Icon name="ArrowLeft" size={20} color="white" /></button>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,158,11,0.2)' }}><Icon name="ClipboardList" size={16} color="#f59e0b" /></div>
            <div className="flex-1"><h1 className="text-base font-bold text-white">Мои записи</h1><p className="text-xs text-white/40">{myEnrollments.length} заявок</p></div>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-3">
          {myEnrollments.length === 0 && (
            <div className="text-center py-16 space-y-3">
              <Icon name="ClipboardList" size={36} color="rgba(255,255,255,0.2)" className="mx-auto" />
              <p className="text-white/40 text-sm">Вы ещё не записались ни на один курс</p>
              <button onClick={() => setBrowseMode("all")} className="btn-primary mx-auto flex items-center gap-2 px-6" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}>
                <Icon name="Search" size={16} />Посмотреть курсы
              </button>
            </div>
          )}
          {myEnrollments.map((en, i) => {
            const st = (en.status || "pending") as keyof typeof statusMeta;
            const meta = statusMeta[st];
            return (
              <div key={en.id} className="glass rounded-2xl p-4 animate-fade-up opacity-0" style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'forwards', border: `1px solid ${meta.bg}` }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white leading-snug">{en.courseTitle}</p>
                    <p className="text-xs text-white/40 mt-0.5">Заявка от {en.date}</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg flex-shrink-0 font-medium" style={{ background: meta.bg, color: meta.color }}>
                    <Icon name={meta.icon} size={11} color={meta.color} />{meta.label}
                  </span>
                </div>
                {st === "rejected" && en.rejectReason && (
                  <p className="text-xs text-red-300/70 px-1 mb-2">Причина: {en.rejectReason}</p>
                )}
                {st === "approved" && en.approvedAt && (
                  <p className="text-xs text-green-400/60 px-1 mb-2">Одобрено: {en.approvedAt}</p>
                )}
                {st === "approved" && (
                  <button
                    onClick={() => {
                      const course = allCourses.find(c => c.id === en.courseId);
                      if (course) { setSelectedCourse(course as typeof COURSES[0]); const pub = publishedCourses.find(p => p.id + 100000 === course.id); setSelectedCourseOwnerId(pub ? pub.ownerId : null); setView("course"); }
                    }}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 mt-1"
                    style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white' }}
                  >
                    <Icon name="Play" size={15} color="white" />Перейти к обучению
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── МОИ КУРСЫ (одобренные) ──
  if (view === "list" && browseMode === "my-courses") {
    const approvedEnrollments = myEnrollments.filter(e => e.status === "approved");
    const approvedCourses = approvedEnrollments.map(en => ({
      enrollment: en,
      course: allCourses.find(c => c.id === en.courseId),
    })).filter(x => x.course);
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl text-sm font-medium text-white animate-fade-up" style={{ background: 'rgba(59,130,246,0.9)', backdropFilter: 'blur(12px)' }}>{toast}</div>}
        <div className="glass border-b border-white/10 px-4 py-3 sticky top-0 z-20">
          <div className="max-w-2xl mx-auto flex items-center gap-2">
            <button onClick={() => setBrowseMode("all")} className="p-2 rounded-xl hover:bg-white/10 flex-shrink-0"><Icon name="ArrowLeft" size={20} color="white" /></button>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.2)' }}><Icon name="BookOpen" size={16} color="#10b981" /></div>
            <div className="flex-1"><h1 className="text-base font-bold text-white">Мои курсы</h1><p className="text-xs text-white/40">{approvedCourses.length} курсов с доступом</p></div>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-3">
          {approvedCourses.length === 0 && (
            <div className="text-center py-16 space-y-3">
              <Icon name="BookOpen" size={36} color="rgba(255,255,255,0.2)" className="mx-auto" />
              <p className="text-white/40 text-sm">Нет одобренных курсов</p>
              <p className="text-white/30 text-xs">Запишитесь на курс и дождитесь одобрения от владельца</p>
              <button onClick={() => setBrowseMode("all")} className="btn-primary mx-auto flex items-center gap-2 px-6" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}>
                <Icon name="Search" size={16} />Найти курс
              </button>
            </div>
          )}
          {approvedCourses.map(({ enrollment: en, course }, i) => {
            if (!course) return null;
            const pub = publishedCourses.find(p => p.id + 100000 === course.id);
            return (
              <div key={en.id} className="glass rounded-2xl p-4 animate-fade-up opacity-0" style={{ animationDelay: `${i * 0.06}s`, animationFillMode: 'forwards', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.15)' }}>
                    <Icon name="GraduationCap" size={20} color="#10b981" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white leading-snug">{course.title}</p>
                    {pub && <p className="text-xs text-white/40 mt-0.5 flex items-center gap-1"><Icon name="School" size={11} />{pub.schoolName}</p>}
                    <p className="text-xs text-green-400/70 mt-0.5">Доступ одобрен{en.approvedAt ? `: ${en.approvedAt}` : ""}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedCourse(course as typeof COURSES[0]);
                    setSelectedCourseOwnerId(pub ? pub.ownerId : null);
                    setView("course");
                  }}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white' }}
                >
                  <Icon name="Play" size={15} color="white" />Перейти к обучению
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const score = QUESTIONS.filter(q => testAnswers[q.id] === q.correct).length;
  const submitTest = () => setTestDone(true);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const LESSON_TEXTS = [
    "Охрана труда — система сохранения жизни и здоровья работников в процессе трудовой деятельности, включающая правовые, социально-экономические, организационно-технические меры.",
    "Основные понятия: рабочее место, вредный фактор, опасный фактор, средства индивидуальной защиты (СИЗ), нормативные требования охраны труда.",
    "На практике: каждый сотрудник обязан проходить инструктаж перед допуском к работе. Журнал инструктажей хранится у руководителя подразделения.",
    "Контрольные вопросы и задания по пройденному материалу. Убедитесь, что усвоили все основные понятия перед прохождением итогового теста.",
  ];

  if (view === "lesson" && selectedCourse) {
    // Проверка доступа к уроку
    const lessonIsPublishedCourse = selectedCourse.id > 100000;
    const lessonHasAccess = !lessonIsPublishedCourse || approvedCourseIds.has(selectedCourse.id);
    const lessonMyEnroll = myEnrollments.find(e => e.courseId === selectedCourse.id);

    // Реальный урок из конструктора (если курс из библиотеки школы)
    const realCourseId = selectedCourse.id - 100000;
    const realCourse = ownerConstructorCourses.find(c => c.id === realCourseId);
    const allRealLessons = realCourse ? realCourse.modules.flatMap(m => m.lessons) : [];
    const realLesson = allRealLessons[activeLessonIdx] || null;

    // Статические данные для курсов без конструктора
    const lessonName = realLesson?.title || (activeLessonIdx === 0 ? "Введение в курс" : activeLessonIdx === 1 ? "Основные понятия" : activeLessonIdx === 2 ? "Практические примеры" : "Итоговые материалы");
    const lessonText = LESSON_TEXTS[Math.min(activeLessonIdx, LESSON_TEXTS.length - 1)];

    const isPdfLesson = lessonHasAccess && realLesson?.lectureType === "pdf" && realLesson?.content?.startsWith("data:application/pdf");
    const isTextLesson = lessonHasAccess && realLesson && realLesson.type === "lecture" && !isPdfLesson && realLesson.content;

    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        <ModuleHeader title={`Урок ${activeLessonIdx + 1}`} onBack={() => setView("course")} subtitle={selectedCourse.title} />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
          {/* Боковое меню со структурой курса */}
          <div className="glass rounded-2xl p-3 animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 px-1">Структура курса</p>
            <div className="space-y-1">
              {Array.from({ length: selectedCourse.lessons }).map((_, i) => {
                const done = i < Math.floor(selectedCourse.lessons * selectedCourse.progress / 100);
                const isCurrent = i === activeLessonIdx;
                return (
                  <button key={i} onClick={() => setActiveLessonIdx(i)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left" style={{ background: isCurrent ? 'rgba(59,130,246,0.15)' : 'transparent' }}>
                    <Icon name={done ? "CheckCircle" : isCurrent ? "PlayCircle" : "Circle"} size={14} color={done ? "#10b981" : isCurrent ? "#3b82f6" : "rgba(255,255,255,0.3)"} />
                    <span className="text-xs flex-1 truncate" style={{ color: isCurrent ? 'white' : 'rgba(255,255,255,0.5)' }}>
                      {allRealLessons[i]?.title || `Урок ${i + 1}`}
                    </span>
                    <span className="text-xs" style={{ color: done ? '#10b981' : 'rgba(255,255,255,0.3)' }}>{done ? "Просмотрено" : isCurrent ? "Открыт" : ""}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Блокировка контента без доступа ── */}
          {!lessonHasAccess ? (
            <div className="glass rounded-2xl p-6 text-center space-y-4" style={{ border: '1px solid rgba(245,158,11,0.25)' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: 'rgba(245,158,11,0.12)' }}>
                <Icon name="Lock" size={28} color="#f59e0b" />
              </div>
              <div>
                <p className="text-base font-semibold text-white mb-2">Доступ к материалам закрыт</p>
                <p className="text-sm text-white/50 leading-relaxed">
                  Чтобы изучать материалы курса, запишитесь на курс и дождитесь одобрения заявки
                </p>
                {lessonMyEnroll?.status === "pending" && (
                  <p className="text-xs text-yellow-400/70 mt-3 flex items-center justify-center gap-1.5">
                    <Icon name="Clock" size={13} color="#f59e0b" />Заявка отправлена — ожидайте одобрения
                  </p>
                )}
                {lessonMyEnroll?.status === "rejected" && (
                  <p className="text-xs text-red-400/70 mt-3">
                    Заявка отклонена{lessonMyEnroll.rejectReason ? `: ${lessonMyEnroll.rejectReason}` : ""}
                  </p>
                )}
              </div>
              {!lessonMyEnroll && (
                <button
                  onClick={() => { setEnrollFio(""); setEnrollPhone(""); setView("course"); setEnrollOpen(true); }}
                  className="mx-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: 'white' }}
                >
                  <Icon name="UserPlus" size={15} color="white" />Записаться на курс
                </button>
              )}
              <button onClick={() => setView("course")} className="text-xs text-white/30 hover:text-white/50 transition-colors">
                ← Вернуться к курсу
              </button>
            </div>
          ) : null}

          {/* ── Контент урока (только при наличии доступа) ── */}
          {lessonHasAccess && isPdfLesson ? (
            <div className="glass-strong rounded-2xl p-4 animate-fade-up opacity-0 space-y-3" style={{ animationFillMode: 'forwards' }}>
              <div className="flex items-center gap-2 mb-1">
                <Icon name="FileText" size={16} color="#ef4444" />
                <h2 className="text-base font-bold text-white">{lessonName}</h2>
              </div>
              {/* Защищённый iframe */}
              <div
                style={{ position: 'relative', height: 560, borderRadius: 12, overflow: 'hidden' }}
                onContextMenu={e => e.preventDefault()}
              >
                {/* Прозрачный оверлей — блокирует прямое взаимодействие с PDF */}
                <div
                  style={{
                    position: 'absolute', inset: 0, zIndex: 2,
                    userSelect: 'none', WebkitUserSelect: 'none',
                    background: 'transparent',
                  }}
                  onContextMenu={e => e.preventDefault()}
                />
                {/* Блок печати — при @media print скрывает содержимое */}
                <style>{`@media print { .pdf-viewer-protected { display: none !important; } }`}</style>
                <div className="pdf-viewer-protected" style={{ width: '100%', height: '100%' }}>
                  <embed
                    src={`${realLesson!.content}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                    type="application/pdf"
                    width="100%"
                    height="100%"
                    style={{ display: 'block', pointerEvents: 'none' }}
                  />
                </div>
              </div>
              <p className="text-xs text-white/30 text-center">Файл: {realLesson!.files[0] || "lecture.pdf"} · Копирование и сохранение недоступны</p>
            </div>
          ) : lessonHasAccess && isTextLesson ? (
            /* Старый текстовый контент (обратная совместимость) */
            <div className="glass-strong rounded-2xl p-5 animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
              <h2 className="text-base font-bold text-white mb-3">{lessonName}</h2>
              <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">{realLesson!.content}</p>
            </div>
          ) : lessonHasAccess ? (
            /* Статический контент для демо-курсов без конструктора */
            <>
              <div className="rounded-2xl overflow-hidden relative animate-fade-up opacity-0" style={{ aspectRatio: '16/9', background: 'linear-gradient(135deg, #1e293b, #0f172a)', animationFillMode: 'forwards' }}>
                <div className="absolute inset-0 flex items-center justify-center"><div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.9)' }}><Icon name="Play" size={28} color="white" /></div></div>
                <div className="absolute bottom-2 right-2 flex gap-1">
                  {[1, 1.5, 2].map(rate => (
                    <button key={rate} onClick={() => { setPlaybackRate(rate); showToast(`Скорость ${rate}x`); }} className="px-2 py-1 rounded-lg text-xs font-medium" style={{ background: playbackRate === rate ? 'rgba(59,130,246,0.9)' : 'rgba(0,0,0,0.6)', color: 'white' }}>{rate}x</button>
                  ))}
                </div>
              </div>
              <div className="glass-strong rounded-2xl p-5 animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
                <h2 className="text-base font-bold text-white mb-3">{lessonName}</h2>
                <p className="text-sm text-white/70 leading-relaxed">{lessonText}</p>
              </div>
              <div className="glass rounded-2xl p-4 animate-fade-up opacity-0 delay-100" style={{ animationFillMode: 'forwards' }}>
                <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Ключевые тезисы</p>
                {["Изучите материал внимательно", "Сделайте заметки по ключевым моментам", "Ответьте на контрольные вопросы перед переходом к следующему уроку"].map((point, i) => (
                  <div key={i} className="flex items-start gap-2 mb-2">
                    <div className="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(59,130,246,0.2)' }}>
                      <span className="text-xs text-blue-400 font-bold">{i + 1}</span>
                    </div>
                    <p className="text-sm text-white/70">{point}</p>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {/* Кнопки навигации — только при наличии доступа */}
          {lessonHasAccess && (
            <div className="flex gap-3 animate-fade-up opacity-0 delay-200" style={{ animationFillMode: 'forwards' }}>
              {activeLessonIdx > 0 && (
                <button onClick={() => setActiveLessonIdx(i => i - 1)} className="btn-ghost flex-1 flex items-center justify-center gap-2 text-sm">
                  <Icon name="ArrowLeft" size={16} />Назад
                </button>
              )}
              <button
                onClick={() => { setView("course"); showToast("✅ Урок завершён!"); }}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <Icon name="CheckCircle" size={18} />Завершить урок
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === "cert" && selectedCourse) {
    return (
      <div className="min-h-screen relative z-10 animate-fade-in flex flex-col items-center justify-center px-6 text-center">
        <div className="animate-scale-in">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 glow" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <Icon name="Award" size={44} color="white" />
          </div>
          <div className="glass rounded-3xl p-8 max-w-sm mx-auto">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Получаемый документ</p>
            {/* Новый дизайн: в названии — получаемый по итогу документ */}
            <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Удостоверение о прохождении</h2>
            <p className="text-sm text-yellow-400 font-medium mb-3">«{selectedCourse.title}»</p>
            <p className="text-white/50 text-sm mb-4">выдаётся слушателю, успешно завершившему курс на 100%</p>
            <div className="py-3 border-t border-b border-white/10 mb-4">
              <p className="text-xs text-white/40">Дата выдачи: {new Date().toLocaleDateString("ru-RU")}</p>
              <p className="text-xs text-white/40 mt-1">Способ получения: лично или почтой</p>
            </div>
            <button onClick={() => showToast("📥 Документ загружается...")} className="btn-primary flex items-center justify-center gap-2 text-sm py-3">
              <Icon name="Download" size={16} />Скачать документ
            </button>
          </div>
          <button onClick={() => { setView("list"); setSelectedCourse(null); }} className="mt-4 text-white/40 text-sm hover:text-white/70 transition-colors">
            Вернуться к курсам
          </button>
        </div>
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl text-sm font-medium text-white animate-fade-up" style={{ background: 'rgba(245,158,11,0.9)', backdropFilter: 'blur(12px)' }}>
            {toast}
          </div>
        )}
      </div>
    );
  }

  if (view === "test") {
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        <ModuleHeader title="Тест" onBack={() => setView("course")} subtitle="Охрана труда и ТБ" />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
          {!testDone ? (
            <>
              {QUESTIONS.map((q, qi) => (
                <div key={q.id} className={`glass rounded-2xl p-4 animate-fade-up opacity-0`} style={{ animationDelay: `${qi * 0.08}s`, animationFillMode: 'forwards' }}>
                  <p className="text-sm font-semibold text-white mb-3">{qi + 1}. {q.text}</p>
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => (
                      <button key={oi} onClick={() => setTestAnswers(prev => ({ ...prev, [q.id]: oi }))} className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all text-sm" style={{ background: testAnswers[q.id] === oi ? 'rgba(27,111,255,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${testAnswers[q.id] === oi ? 'rgba(27,111,255,0.5)' : 'rgba(255,255,255,0.08)'}` }}>
                        <div className={`w-4 h-4 rounded-full flex-shrink-0 border-2 flex items-center justify-center ${testAnswers[q.id] === oi ? "border-blue-500" : "border-white/30"}`}>
                          {testAnswers[q.id] === oi && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                        </div>
                        <span className={testAnswers[q.id] === oi ? "text-white" : "text-white/70"}>{opt}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button onClick={submitTest} className="btn-primary flex items-center justify-center gap-2" disabled={Object.keys(testAnswers).length < QUESTIONS.length}>
                <Icon name="Send" size={18} />Завершить тест
              </button>
            </>
          ) : (
            <div className="text-center animate-scale-in pt-8">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 ${score >= 2 ? "glow" : ""}`} style={{ background: score >= 2 ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                <Icon name={score >= 2 ? "Trophy" : "XCircle"} size={36} color="white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{score >= 2 ? "Тест пройден!" : "Попробуйте снова"}</h2>
              <p className="text-white/60 mb-6">Правильных ответов: {score} из {QUESTIONS.length}</p>

              {/* Разбор ответов: правильные/неправильные */}
              <div className="space-y-3 text-left mb-6">
                {QUESTIONS.map((q, qi) => {
                  const userAns = testAnswers[q.id];
                  const isCorrect = userAns === q.correct;
                  return (
                    <div key={q.id} className="glass rounded-2xl p-4" style={{ border: `1px solid ${isCorrect ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                      <div className="flex items-start gap-2 mb-2">
                        <Icon name={isCorrect ? "CheckCircle" : "XCircle"} size={16} color={isCorrect ? "#10b981" : "#ef4444"} className="flex-shrink-0 mt-0.5" />
                        <p className="text-sm font-semibold text-white">{qi + 1}. {q.text}</p>
                      </div>
                      <div className="space-y-1 pl-6">
                        {q.options.map((opt, oi) => {
                          const isUser = userAns === oi;
                          const isRight = q.correct === oi;
                          return (
                            <div key={oi} className="flex items-center gap-2 text-sm" style={{ color: isRight ? '#10b981' : isUser ? '#ef4444' : 'rgba(255,255,255,0.4)' }}>
                              {isRight ? <Icon name="Check" size={13} color="#10b981" /> : isUser ? <Icon name="X" size={13} color="#ef4444" /> : <span className="w-3" />}
                              <span>{opt}{isRight && " — правильный ответ"}{isUser && !isRight && " — ваш ответ"}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {score >= 2 ? (
                <button onClick={() => { setView("cert"); }} className="btn-primary flex items-center justify-center gap-2 max-w-xs mx-auto">
                  <Icon name="Award" size={18} />Получить сертификат
                </button>
              ) : (
                <button onClick={() => { setTestAnswers({}); setTestDone(false); }} className="btn-primary flex items-center justify-center gap-2 max-w-xs mx-auto">
                  <Icon name="RefreshCw" size={18} />Пройти снова
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === "course" && selectedCourse) {
    // Для курсов из конструктора — проверяем одобренную заявку
    const isPublishedCourse = selectedCourse.id > 100000;
    const hasApprovedAccess = !isPublishedCourse || approvedCourseIds.has(selectedCourse.id);
    const myEnrollForThisCourse = myEnrollments.find(e => e.courseId === selectedCourse.id);

    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl text-sm font-medium text-white animate-fade-up" style={{ background: 'rgba(59,130,246,0.9)', backdropFilter: 'blur(12px)' }}>
            {toast}
          </div>
        )}
        <ModuleHeader title={selectedCourse.title} onBack={() => setView("list")} subtitle={`${selectedCourse.lessons} уроков · ${selectedCourse.school || ""}`} />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
          {/* Описание курса — видно всем */}
          <div className="glass rounded-2xl p-4 space-y-2">
            {selectedCourse.description && <p className="text-sm text-white/70 leading-relaxed">{selectedCourse.description}</p>}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-xs px-2 py-0.5 rounded-lg flex items-center gap-1" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}><Icon name="BookOpen" size={11} />{selectedCourse.lessons} уроков</span>
              <span className="text-xs px-2 py-0.5 rounded-lg flex items-center gap-1" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}><Icon name="Clock" size={11} />{selectedCourse.hours || selectedCourse.duration}</span>
              {selectedCourse.cert && <span className="text-xs px-2 py-0.5 rounded-lg flex items-center gap-1" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}><Icon name="Award" size={11} color="#f59e0b" />Документ по окончании</span>}
            </div>
            {hasApprovedAccess && (
              <div>
                <div className="flex justify-between text-xs text-white/40 mb-1">
                  <span>Прогресс</span><span className="font-semibold text-blue-400">{selectedCourse.progress}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${selectedCourse.progress}%`, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)' }} />
                </div>
              </div>
            )}
          </div>
          {/* Блок доступа — только для курсов из конструктора без одобрения */}
          {!hasApprovedAccess && (
            <div className="glass rounded-2xl p-5 space-y-3" style={{ border: `1px solid ${myEnrollForThisCourse?.status === "rejected" ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
              <div className="flex items-start gap-3">
                <Icon name={myEnrollForThisCourse?.status === "rejected" ? "XCircle" : "Lock"} size={22} color={myEnrollForThisCourse?.status === "rejected" ? "#ef4444" : "#f59e0b"} />
                <div>
                  <p className="text-sm font-semibold text-white">
                    {myEnrollForThisCourse?.status === "rejected" ? "Заявка отклонена" : myEnrollForThisCourse ? "Заявка на рассмотрении" : "Требуется запись на курс"}
                  </p>
                  <p className="text-xs text-white/50 mt-1">
                    {myEnrollForThisCourse?.status === "rejected"
                      ? (myEnrollForThisCourse.rejectReason ? `Причина: ${myEnrollForThisCourse.rejectReason}` : "Владелец курса отклонил вашу заявку")
                      : myEnrollForThisCourse
                      ? "Владелец курса рассмотрит вашу заявку. После одобрения уроки станут доступны."
                      : "Запишитесь на курс, чтобы получить доступ к урокам после одобрения."}
                  </p>
                  {myEnrollForThisCourse?.status === "pending" && (
                    <p className="text-xs text-white/30 mt-0.5">Заявка подана: {myEnrollForThisCourse.date}</p>
                  )}
                </div>
              </div>
              {!myEnrollForThisCourse && (
                <button onClick={() => { setEnrollFio(""); setEnrollPhone(""); setEnrollOpen(true); }} className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: 'white' }}>
                  <Icon name="UserPlus" size={15} color="white" />Записаться на курс
                </button>
              )}
            </div>
          )}

          {/* Структура курса — видна всем (предпросмотр) */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider px-1 mb-2">
              {hasApprovedAccess ? "Уроки курса" : "Структура курса (предпросмотр)"}
            </p>
            {Array.from({ length: selectedCourse.lessons }).map((_, i) => {
              const done = hasApprovedAccess && i < Math.floor(selectedCourse.lessons * selectedCourse.progress / 100);
              const current = hasApprovedAccess && i === Math.floor(selectedCourse.lessons * selectedCourse.progress / 100);
              const lessonNames = ["Введение в курс", "Основные понятия", "Практические примеры"];
              // Реальные названия из конструктора (если есть)
              const realCourseId = selectedCourse.id - 100000;
              const realCourse = ownerConstructorCourses.find(c => c.id === realCourseId);
              const allRealLessons = realCourse ? realCourse.modules.flatMap(m => m.lessons) : [];
              const name = allRealLessons[i]?.title || (i === selectedCourse.lessons - 1 ? "Итоговый тест" : lessonNames[i] || `Тема ${i + 1}`);
              const canOpen = hasApprovedAccess && (done || current);
              return (
                <button
                  key={i}
                  disabled={!canOpen}
                  onClick={() => {
                    if (!canOpen) return;
                    if (i === selectedCourse.lessons - 1) { setView("test"); setTestAnswers({}); setTestDone(false); }
                    else { setActiveLessonIdx(i); setView("lesson"); }
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                  style={{
                    background: done ? 'rgba(59,130,246,0.08)' : current ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${done ? 'rgba(59,130,246,0.2)' : current ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'}`,
                    opacity: !hasApprovedAccess ? 0.8 : !canOpen ? 0.4 : 1,
                    cursor: canOpen ? 'pointer' : 'default',
                  }}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: done ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)' }}>
                    <Icon
                      name={done ? "CheckCircle" : current ? "Play" : hasApprovedAccess ? "Lock" : "Eye"}
                      size={14}
                      color={done ? "#3b82f6" : current ? "white" : "rgba(255,255,255,0.35)"}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: done ? 'rgba(255,255,255,0.6)' : current ? 'white' : 'rgba(255,255,255,0.5)' }}>
                      {i + 1}. {name}
                    </p>
                  </div>
                  {current && hasApprovedAccess && <span className="tag text-xs flex-shrink-0">Текущий</span>}
                  {done && <Icon name="Check" size={13} color="rgba(59,130,246,0.6)" />}
                  {!hasApprovedAccess && <Icon name="Lock" size={13} color="rgba(255,255,255,0.2)" />}
                </button>
              );
            })}
          </div>
          {hasApprovedAccess && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const currentIdx = Math.floor(selectedCourse.lessons * selectedCourse.progress / 100);
                  setActiveLessonIdx(currentIdx);
                  setView("lesson");
                }}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <Icon name="Play" size={18} />Продолжить обучение
              </button>
              <button onClick={() => { setView("test"); setTestAnswers({}); setTestDone(false); }} className="btn-ghost px-4 flex items-center gap-2 text-sm">
                <Icon name="ClipboardCheck" size={16} />Тест
              </button>
            </div>
          )}
          {/* Кнопка «Записаться» — только если нет заявки и это курс из конструктора */}
          {hasApprovedAccess && !isPublishedCourse && (
            <button onClick={() => { setEnrollFio(""); setEnrollPhone(""); setEnrollOpen(true); }} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-white" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
              <Icon name="UserPlus" size={16} />Записаться на курс
            </button>
          )}
          {selectedCourse.cert && (
            <button onClick={() => setView("cert")} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-yellow-400 transition-colors" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <Icon name="Award" size={16} color="#f59e0b" />Открыть сертификат
            </button>
          )}

          {/* ДЗ и чат — только для одобренных */}
          {hasApprovedAccess && (
            <>
              <div className="glass rounded-2xl p-4">
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2"><Icon name="PenSquare" size={13} color="#f59e0b" />Сдать домашнее задание</p>
                <textarea className="input-field text-sm resize-none mb-2" rows={3} placeholder="Ответ на задание..." value={hwText} onChange={e => setHwText(e.target.value)} />
                <div className="flex gap-2">
                  <button onClick={() => { setHwFile(hwFile ? "" : "моя_работа.pdf"); }} className="flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5" style={{ background: hwFile ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.06)', color: hwFile ? '#60a5fa' : 'rgba(255,255,255,0.6)' }}><Icon name="Paperclip" size={13} />{hwFile || "Прикрепить файл"}</button>
                  <button onClick={() => { if (hwText.trim()) { showToast("✅ Задание отправлено на проверку"); setHwText(""); setHwFile(""); } }} disabled={!hwText.trim()} className="flex-1 py-2 rounded-xl text-xs font-medium text-white disabled:opacity-40 flex items-center justify-center gap-1.5" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}><Icon name="Send" size={13} />Отправить</button>
                </div>
              </div>
              <div className="glass rounded-2xl p-4">
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2"><Icon name="MessageSquare" size={13} color="#10b981" />Чат курса · куратор и ученики</p>
                <div className="space-y-2.5 mb-3 max-h-48 overflow-y-auto">
                  {chatMsgs.map((m, i) => (
                    <div key={i} className={`flex ${m.me ? "justify-end" : "justify-start"}`}>
                      <div className="max-w-[80%] px-3 py-2 rounded-2xl" style={{ background: m.me ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : 'rgba(255,255,255,0.06)' }}>
                        {!m.me && <p className="text-xs font-semibold mb-0.5" style={{ color: m.curator ? '#f59e0b' : '#94a3b8' }}>{m.author}{m.curator && " · Куратор"}</p>}
                        <p className="text-sm text-white">{m.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input className="input-field text-sm py-2.5 flex-1" placeholder="Сообщение в чат курса..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && chatInput.trim()) { setChatMsgs(prev => [...prev, { author: "Вы", text: chatInput, me: true }]); setChatInput(""); } }} />
                  <button onClick={() => { if (chatInput.trim()) { setChatMsgs(prev => [...prev, { author: "Вы", text: chatInput, me: true }]); setChatInput(""); } }} className="p-2.5 rounded-xl flex-shrink-0" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}><Icon name="Send" size={18} color="white" /></button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Модалка записи на курс */}
        {enrollOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setEnrollOpen(false)}>
            <div className="w-full max-w-md mx-4 mb-4 sm:mb-0 glass-strong rounded-3xl p-6 animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2 mb-4"><div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.2)' }}><Icon name="UserPlus" size={16} color="#3b82f6" /></div><h3 className="text-base font-bold text-white">Запись на курс</h3></div>
              <p className="text-xs text-white/40 mb-3">{selectedCourse.title}</p>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">ФИО</label>
              <input className="input-field mb-3" placeholder="Иванов Иван Иванович" value={enrollFio} onChange={e => setEnrollFio(e.target.value)} />
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Номер телефона</label>
              <input className="input-field mb-4" type="tel" placeholder="+7 (___) ___-__-__" value={enrollPhone} onChange={e => setEnrollPhone(e.target.value)} />
              {/* Информация о получаемом документе */}
              <div className="flex items-start gap-2 p-3 rounded-xl mb-4" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <Icon name="Award" size={14} color="#f59e0b" className="flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-200/80">По итогу курса выдаётся документ. Способ получения уточняется школой после прохождения.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEnrollOpen(false)} className="btn-ghost flex-1 text-sm">Отмена</button>
                <button onClick={() => {
                  if (enrollFio.trim() && enrollPhone.replace(/\D/g, "").length >= 10) {
                    const pub = publishedCourses.find(p => p.id + 100000 === selectedCourse.id);
                    setAllEnrollments(prev => [{
                      id: Date.now(),
                      courseId: selectedCourse.id,
                      courseTitle: selectedCourse.title,
                      fio: enrollFio,
                      phone: enrollPhone,
                      date: new Date().toLocaleDateString("ru-RU"),
                      userId: currentUser.id,
                      ownerId: pub?.ownerId,
                      status: "pending",
                    }, ...prev]);
                    setEnrollOpen(false);
                    showToast("✅ Заявка отправлена — ожидайте одобрения");
                  }
                }} disabled={!enrollFio.trim() || enrollPhone.replace(/\D/g, "").length < 10} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2 disabled:opacity-40"><Icon name="Check" size={15} />Записаться</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl text-sm font-medium text-white animate-fade-up" style={{ background: 'rgba(59,130,246,0.9)', backdropFilter: 'blur(12px)' }}>{toast}</div>}
      <div className="glass border-b border-white/10 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/10 transition-colors flex-shrink-0"><Icon name="ArrowLeft" size={20} color="white" /></button>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)' }}><Icon name="GraduationCap" size={16} color="#3b82f6" /></div>
          <div className="flex-1"><h1 className="text-base font-bold text-white">Обучение · Библиотека</h1><p className="text-xs text-white/40">{allCourses.length} курсов</p></div>
          {isSchool && <button onClick={() => setSchool(true)} className="px-3 h-9 rounded-xl flex items-center gap-1.5" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}><Icon name="School" size={15} color="white" /><span className="text-xs font-semibold text-white">Моя школа</span></button>}
        </div>
        {/* Переключатель вкладок */}
        <div className="max-w-2xl mx-auto mt-3 flex gap-1.5 overflow-x-auto pb-0.5">
          {([
            { k: "all",            icon: "LayoutGrid",  label: "Все курсы" },
            { k: "schools",        icon: "School",      label: "По школам" },
            { k: "my-enrollments", icon: "ClipboardList", label: "Мои записи", badge: myEnrollments.filter(e => !e.status || e.status === "pending").length },
            { k: "my-courses",     icon: "BookOpen",    label: "Мои курсы", badge: approvedCourseIds.size },
          ] as const).map(t => (
            <button key={t.k} onClick={() => setBrowseMode(t.k)} className="relative flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all" style={{ background: browseMode === t.k ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : 'rgba(255,255,255,0.06)', color: browseMode === t.k ? 'white' : 'rgba(255,255,255,0.5)' }}>
              <Icon name={t.icon} size={13} color={browseMode === t.k ? "white" : "rgba(255,255,255,0.5)"} />
              {t.label}
              {"badge" in t && t.badge > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-white font-bold flex items-center justify-center" style={{ background: t.k === "my-courses" ? '#10b981' : '#f59e0b', fontSize: '9px' }}>{t.badge}</span>}
            </button>
          ))}
        </div>
        {/* Заявка на роль «Школа» — прямо в библиотеке обучения */}
        {!isSchool && (
          <div className="max-w-2xl mx-auto mt-3">
            {mySchoolReq && mySchoolReq.status === "pending" ? (
              <div className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.1)', border: '1px dashed rgba(245,158,11,0.35)' }}><Icon name="Clock" size={16} color="#f59e0b" /><span className="text-sm font-medium text-white flex-1">Заявка на роль «Школа» на рассмотрении</span></div>
            ) : (
              <button onClick={() => { addRoleRequest("school", currentUser.phone); setToast("📩 Заявка на роль «Школа» отправлена администратору"); }} className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-left" style={{ background: 'rgba(99,102,241,0.12)', border: '1px dashed rgba(99,102,241,0.4)' }}>
                <Icon name="School" size={16} color="#6366f1" /><span className="text-sm font-medium text-white flex-1">Стать школой — заявка на роль «Школа» (бесплатно)</span><Icon name="ChevronRight" size={15} color="rgba(99,102,241,0.6)" />
              </button>
            )}
          </div>
        )}
      </div>
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-3">
        {allCourses.map((course, i) => {
          const pub = publishedCourses.find(p => p.id + 100000 === course.id);
          const isConstructorCourse = course.id > 100000;
          const myEnroll = myEnrollments.find(e => e.courseId === course.id);
          const isApproved = approvedCourseIds.has(course.id);
          const openCourse = () => {
            setSelectedCourse(course as typeof COURSES[0]);
            setSelectedCourseOwnerId(pub ? pub.ownerId : null);
            setView("course");
          };
          return (
          <div key={course.id} className="glass rounded-2xl overflow-hidden animate-fade-up opacity-0 hover:border-white/20 transition-all" style={{ animationDelay: `${0.05 + i * 0.07}s`, animationFillMode: 'forwards' }}>
            {/* Кликабельная верхняя часть → предпросмотр */}
            <button onClick={openCourse} className="w-full text-left">
              <div className="h-28 relative" style={{ background: 'linear-gradient(135deg,#1e3a8a,#3b82f6)' }}>
                {course.image && <img src={course.image} alt="" className="w-full h-full object-cover" loading="lazy" />}
                <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.25)' }} />
                <span className="absolute top-2 left-2 tag text-xs" style={{ background: course.progress === 100 ? 'rgba(16,185,129,0.85)' : 'rgba(27,111,255,0.85)', color: 'white' }}>{course.category}</span>
                {course.cert && <span className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}><Icon name="Award" size={16} color="#f59e0b" /></span>}
              </div>
              <div className="p-4 pb-3">
                <div className="flex items-center gap-1.5 mb-1.5"><Icon name="School" size={12} color="#6366f1" /><span className="text-xs text-indigo-300">{course.school}</span></div>
                <h3 className="text-sm font-semibold text-white mb-1.5">{course.title}</h3>
                <p className="text-xs text-white/50 mb-2 line-clamp-2">{course.description}</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded-lg flex items-center gap-1" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}><Icon name="BookOpen" size={11} />{course.lessons} уроков</span>
                  <span className="text-xs px-2 py-0.5 rounded-lg flex items-center gap-1" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}><Icon name="Clock" size={11} />{course.hours}</span>
                  {(course as { paid?: boolean }).paid && (course as { price?: number }).price ? (
                    <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>{((course as { price?: number }).price || 0).toLocaleString("ru-RU")} ₽</span>
                  ) : null}
                </div>
                {isApproved && (
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-1">
                    <div className="h-full rounded-full" style={{ width: `${course.progress}%`, background: 'linear-gradient(90deg,#3b82f6,#8b5cf6)' }} />
                  </div>
                )}
              </div>
            </button>
            {/* Кнопка действия */}
            <div className="px-4 pb-4">
              {isApproved ? (
                <button onClick={openCourse} className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white' }}>
                  <Icon name="Play" size={15} color="white" />Перейти к обучению
                </button>
              ) : myEnroll?.status === "pending" ? (
                <div className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 cursor-default" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
                  <Icon name="Clock" size={15} color="#f59e0b" />Заявка на рассмотрении
                </div>
              ) : myEnroll?.status === "rejected" ? (
                <div className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 cursor-default" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
                  <Icon name="XCircle" size={15} color="#ef4444" />Заявка отклонена
                </div>
              ) : isConstructorCourse ? (
                <button onClick={e => { e.stopPropagation(); setSelectedCourse(course as typeof COURSES[0]); setSelectedCourseOwnerId(pub ? pub.ownerId : null); setEnrollFio(""); setEnrollPhone(""); setEnrollOpen(true); }} className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: 'white' }}>
                  <Icon name="UserPlus" size={15} color="white" />Записаться на курс
                </button>
              ) : (
                <button onClick={openCourse} className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2" style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', color: '#60a5fa' }}>
                  <Icon name="Eye" size={15} color="#60a5fa" />Просмотреть курс
                </button>
              )}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}