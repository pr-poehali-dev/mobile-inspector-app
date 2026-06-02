import { useState } from "react";
import Icon from "@/components/ui/icon";
import ModuleHeader from "@/components/ModuleHeader";

interface Props { onBack: () => void; }

const COURSES = [
  { id: 1, title: "Охрана труда и техника безопасности", lessons: 8, duration: "3 ч 20 мин", progress: 75, category: "Обязательный", cert: false },
  { id: 2, title: "Основы документооборота", lessons: 5, duration: "1 ч 45 мин", progress: 100, category: "Завершён", cert: true },
  { id: 3, title: "Работа с корпоративной системой", lessons: 12, duration: "5 ч", progress: 0, category: "Новый", cert: false },
  { id: 4, title: "Управление проектами Agile", lessons: 10, duration: "4 ч 30 мин", progress: 30, category: "В процессе", cert: false },
];

const QUESTIONS = [
  { id: 1, text: "Что такое инструктаж по охране труда?", options: ["Проверка оборудования", "Обязательное обучение по правилам безопасности", "Ежегодный медосмотр", "Аудит предприятия"], correct: 1 },
  { id: 2, text: "Как часто проводится повторный инструктаж?", options: ["Каждый месяц", "Каждые полгода", "Один раз в год", "По необходимости"], correct: 1 },
  { id: 3, text: "Что делать при обнаружении пожара?", options: ["Тушить самостоятельно", "Позвонить коллегам", "Немедленно покинуть помещение и вызвать 112", "Подождать руководителя"], correct: 2 },
];

export default function LearningModule({ onBack }: Props) {
  const [view, setView] = useState<"list" | "course" | "lesson" | "test" | "cert">("list");
  const [selectedCourse, setSelectedCourse] = useState<typeof COURSES[0] | null>(null);
  const [testAnswers, setTestAnswers] = useState<Record<number, number>>({});
  const [testDone, setTestDone] = useState(false);
  const [activeLessonIdx, setActiveLessonIdx] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

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
            <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Сертификат об окончании</p>
            <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>{selectedCourse.title}</h2>
            <p className="text-white/50 text-sm mb-4">Иван Петров успешно завершил курс</p>
            <div className="py-3 border-t border-b border-white/10 mb-4">
              <p className="text-xs text-white/40">Дата: {new Date().toLocaleDateString("ru-RU")}</p>
            </div>
            <button onClick={() => showToast("📥 Сертификат загружается...")} className="btn-primary flex items-center justify-center gap-2 text-sm py-3">
              <Icon name="Download" size={16} />Скачать сертификат
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
          {selectedCourse.cert && (
            <button onClick={() => setView("cert")} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-yellow-400 transition-colors" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <Icon name="Award" size={16} color="#f59e0b" />Открыть сертификат
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      <ModuleHeader title="Обучение" onBack={onBack} subtitle={`${COURSES.length} курса`} icon="GraduationCap" iconColor="#3b82f6" />
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-3">
        {COURSES.map((course, i) => (
          <button key={course.id} onClick={() => { setSelectedCourse(course); setView("course"); }} className={`w-full text-left card-module animate-fade-up opacity-0`} style={{ animationDelay: `${0.05 + i * 0.07}s`, animationFillMode: 'forwards' }}>
            <div className="flex items-start justify-between mb-3">
              <span className="tag text-xs" style={{ background: course.progress === 100 ? 'rgba(16,185,129,0.15)' : 'rgba(27,111,255,0.15)', borderColor: course.progress === 100 ? 'rgba(16,185,129,0.3)' : 'rgba(27,111,255,0.3)', color: course.progress === 100 ? '#10b981' : '#4d8fff' }}>{course.category}</span>
              {course.cert && <Icon name="Award" size={18} color="#f59e0b" />}
            </div>
            <h3 className="text-sm font-semibold text-white mb-3">{course.title}</h3>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
              <div className="h-full rounded-full" style={{ width: `${course.progress}%`, background: course.progress === 100 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #3b82f6, #8b5cf6)' }} />
            </div>
            <div className="flex justify-between text-xs text-white/40">
              <span>{course.lessons} уроков · {course.duration}</span>
              <span className="font-semibold" style={{ color: course.progress === 100 ? '#10b981' : '#4d8fff' }}>{course.progress}%</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}