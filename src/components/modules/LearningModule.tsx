import { useState } from "react";
import Icon from "@/components/ui/icon";
import ModuleHeader from "@/components/ModuleHeader";
import { useApp } from "@/context/AppContext";
import { usePersistentState } from "@/hooks/usePersistentState";
import SchoolAdmin from "./learning/SchoolAdmin";
import SchoolsModule from "./SchoolsModule";

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
  const { isAdmin } = useApp();
  const [view, setView] = useState<"list" | "course" | "lesson" | "test" | "cert">("list");
  const [school, setSchool] = useState(false); // режим администратора школы
  const [browseMode, setBrowseMode] = useState<"all" | "schools">("all"); // поиск по общему потоку / по школам
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
  const [, setAllEnrollments] = usePersistentState<Enrollment[]>("school_enrollments_all", []);

  // Режим администратора школы (конструктор курсов, ученики, проверка ДЗ, аналитика)
  if (school) return <SchoolAdmin onBack={() => setSchool(false)} />;

  // Просмотр курсов по школам (раздел «Школы» встроен в «Обучение»)
  if (view === "list" && browseMode === "schools") return <SchoolsModule embedded onBack={() => setBrowseMode("all")} />;

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
    const lessonName = activeLessonIdx === 0 ? "Введение в курс" : activeLessonIdx === 1 ? "Основные понятия" : activeLessonIdx === 2 ? "Практические примеры" : "Итоговые материалы";
    const lessonText = LESSON_TEXTS[Math.min(activeLessonIdx, LESSON_TEXTS.length - 1)];
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
                    <span className="text-xs flex-1 truncate" style={{ color: isCurrent ? 'white' : 'rgba(255,255,255,0.5)' }}>Урок {i + 1}</span>
                    <span className="text-xs" style={{ color: done ? '#10b981' : 'rgba(255,255,255,0.3)' }}>{done ? "Просмотрено" : isCurrent ? "Открыт" : "Не открыто"}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Видеоплеер с ускорением */}
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
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl text-sm font-medium text-white animate-fade-up" style={{ background: 'rgba(59,130,246,0.9)', backdropFilter: 'blur(12px)' }}>
            {toast}
          </div>
        )}
        <ModuleHeader title={selectedCourse.title} onBack={() => setView("list")} subtitle={`${selectedCourse.lessons} уроков`} />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
          <div className="glass rounded-2xl p-4">
            <div className="flex justify-between mb-2">
              <span className="text-xs text-white/50">Прогресс курса</span>
              <span className="text-sm font-bold text-blue-400">{selectedCourse.progress}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${selectedCourse.progress}%`, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)' }} />
            </div>
          </div>
          <div className="space-y-2">
            {Array.from({ length: selectedCourse.lessons }).map((_, i) => {
              const done = i < Math.floor(selectedCourse.lessons * selectedCourse.progress / 100);
              const current = i === Math.floor(selectedCourse.lessons * selectedCourse.progress / 100);
              const lessonNames = ["Введение в курс", "Основные понятия", "Практические примеры"];
              const name = i === selectedCourse.lessons - 1 ? "Итоговый тест" : lessonNames[i] || `Тема ${i + 1}`;
              return (
                <button
                  key={i}
                  disabled={!done && !current}
                  onClick={() => {
                    if (i === selectedCourse.lessons - 1) { setView("test"); setTestAnswers({}); setTestDone(false); }
                    else { setActiveLessonIdx(i); setView("lesson"); }
                  }}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all"
                  style={{ background: done ? 'rgba(59,130,246,0.08)' : current ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${done ? 'rgba(59,130,246,0.2)' : current ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`, opacity: !done && !current ? 0.4 : 1 }}
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: done ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.08)' }}>
                    <Icon name={done ? "CheckCircle" : current ? "Play" : "Lock"} size={16} color={done ? "#3b82f6" : current ? "white" : "rgba(255,255,255,0.4)"} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${done ? "text-white/60" : current ? "text-white" : "text-white/30"}`}>
                      Урок {i + 1}: {name}
                    </p>
                  </div>
                  {current && <span className="tag text-xs">Текущий</span>}
                  {done && <Icon name="Check" size={14} color="rgba(59,130,246,0.6)" />}
                </button>
              );
            })}
          </div>
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
          {/* Запись на курс — доступна любому пользователю */}
          <button onClick={() => { setEnrollFio(""); setEnrollPhone(""); setEnrollOpen(true); }} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-white" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
            <Icon name="UserPlus" size={16} />Записаться на курс
          </button>
          {selectedCourse.cert && (
            <button onClick={() => setView("cert")} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-yellow-400 transition-colors" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <Icon name="Award" size={16} color="#f59e0b" />Открыть сертификат
            </button>
          )}

          {/* Сдача домашнего задания */}
          <div className="glass rounded-2xl p-4">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2"><Icon name="PenSquare" size={13} color="#f59e0b" />Сдать домашнее задание</p>
            <textarea className="input-field text-sm resize-none mb-2" rows={3} placeholder="Ответ на задание..." value={hwText} onChange={e => setHwText(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={() => { setHwFile(hwFile ? "" : "моя_работа.pdf"); }} className="flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5" style={{ background: hwFile ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.06)', color: hwFile ? '#60a5fa' : 'rgba(255,255,255,0.6)' }}><Icon name="Paperclip" size={13} />{hwFile || "Прикрепить файл"}</button>
              <button onClick={() => { if (hwText.trim()) { showToast("✅ Задание отправлено на проверку"); setHwText(""); setHwFile(""); } }} disabled={!hwText.trim()} className="flex-1 py-2 rounded-xl text-xs font-medium text-white disabled:opacity-40 flex items-center justify-center gap-1.5" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}><Icon name="Send" size={13} />Отправить</button>
            </div>
          </div>

          {/* Встроенный чат курса (как в Skillspace) */}
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
                <button onClick={() => { if (enrollFio.trim() && enrollPhone.replace(/\D/g, "").length >= 10) { setAllEnrollments(prev => [{ id: Date.now(), courseId: selectedCourse.id, courseTitle: selectedCourse.title, fio: enrollFio, phone: enrollPhone, date: new Date().toLocaleDateString("ru-RU") }, ...prev]); setEnrollOpen(false); showToast("✅ Вы записаны на курс!"); } }} disabled={!enrollFio.trim() || enrollPhone.replace(/\D/g, "").length < 10} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2 disabled:opacity-40"><Icon name="Check" size={15} />Записаться</button>
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
          <div className="flex-1"><h1 className="text-base font-bold text-white">Обучение · Библиотека</h1><p className="text-xs text-white/40">{COURSES.length} курса</p></div>
          {isAdmin && <button onClick={() => setSchool(true)} className="px-3 h-9 rounded-xl flex items-center gap-1.5" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}><Icon name="Settings" size={15} color="white" /><span className="text-xs font-semibold text-white">Школа</span></button>}
        </div>
        {/* Переключатель: общий поток курсов / по школам */}
        <div className="max-w-2xl mx-auto mt-3 flex gap-2 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <button onClick={() => setBrowseMode("all")} className="flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-all" style={{ background: browseMode === "all" ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : 'transparent', color: browseMode === "all" ? 'white' : 'rgba(255,255,255,0.5)' }}><Icon name="LayoutGrid" size={15} color={browseMode === "all" ? "white" : "rgba(255,255,255,0.5)"} />Все курсы</button>
          <button onClick={() => setBrowseMode("schools")} className="flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-all" style={{ background: 'transparent', color: 'rgba(255,255,255,0.5)' }}><Icon name="School" size={15} color="rgba(255,255,255,0.5)" />По школам</button>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-3">
        {COURSES.map((course, i) => (
          <button key={course.id} onClick={() => { setSelectedCourse(course); setView("course"); }} className={`w-full text-left glass rounded-2xl overflow-hidden animate-fade-up opacity-0 hover:border-white/20 transition-all`} style={{ animationDelay: `${0.05 + i * 0.07}s`, animationFillMode: 'forwards' }}>
            {/* Изображение курса */}
            <div className="h-28 relative" style={{ background: 'linear-gradient(135deg,#1e3a8a,#3b82f6)' }}>
              {course.image && <img src={course.image} alt="" className="w-full h-full object-cover" loading="lazy" />}
              <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.25)' }} />
              <span className="absolute top-2 left-2 tag text-xs" style={{ background: course.progress === 100 ? 'rgba(16,185,129,0.85)' : 'rgba(27,111,255,0.85)', color: 'white' }}>{course.category}</span>
              {course.cert && <span className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}><Icon name="Award" size={16} color="#f59e0b" /></span>}
            </div>
            <div className="p-4">
              {/* Школа, добавившая курс */}
              <div className="flex items-center gap-1.5 mb-1.5"><Icon name="School" size={12} color="#6366f1" /><span className="text-xs text-indigo-300">{course.school}</span></div>
              <h3 className="text-sm font-semibold text-white mb-1.5">{course.title}</h3>
              {/* Описание курса */}
              <p className="text-xs text-white/50 mb-2 line-clamp-2">{course.description}</p>
              {/* Часы обучения и категория слушателей */}
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="text-xs px-2 py-0.5 rounded-lg flex items-center gap-1" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}><Icon name="Clock" size={11} />{course.hours}</span>
                <span className="text-xs px-2 py-0.5 rounded-lg flex items-center gap-1" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}><Icon name="Users" size={11} />{course.audience}</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
                <div className="h-full rounded-full" style={{ width: `${course.progress}%`, background: course.progress === 100 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #3b82f6, #8b5cf6)' }} />
              </div>
              <div className="flex justify-between text-xs text-white/40">
                <span>{course.lessons} уроков · {course.duration}</span>
                <span className="font-semibold" style={{ color: course.progress === 100 ? '#10b981' : '#4d8fff' }}>{course.progress}%</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}