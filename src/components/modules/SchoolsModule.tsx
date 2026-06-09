import { useState, useRef } from "react";
import Icon from "@/components/ui/icon";
import ModuleHeader from "@/components/ModuleHeader";
import { useApp } from "@/context/AppContext";
import { usePersistentState } from "@/hooks/usePersistentState";
import SchoolAdmin from "./learning/SchoolAdmin";

// Типы из SchoolAdmin (дублируем минимум для чтения)
interface ConstructorCourse {
  id: number;
  title: string;
  modules: { id: number; title: string; lessons: { id: number; title: string; type: string }[] }[];
  published: boolean;
  documentName: string;
  documentHow: string;
  certSample: string;
  paid?: boolean;
  price?: number;
}

// Опубликованный курс в общем потоке (читается LearningModule и витриной школы)
export interface PublishedCourse {
  id: number;           // course.id из конструктора
  ownerId: number;      // userId школы
  schoolName: string;   // название школы
  title: string;
  description: string;
  lessonsCount: number;
  modulesCount: number;
  paid: boolean;
  price: number;
  cert: boolean;
}

// ── Структура данных школы (готова к переносу на сервер) ──
interface SchoolCourse { id: number; title: string; hours: string; audience: string; description?: string; }
interface Enrollment { id: number; courseId: number; courseTitle: string; fio: string; phone: string; date: string; ownerId?: number; schoolName?: string; }
interface School {
  id: number;
  ownerId: number;
  name: string;
  banner: string;        // data-url
  city: string;
  address: string;
  about: string;
  license: string;       // информация о лицензии
  contacts: string;
  courses: SchoolCourse[];
  visible: boolean;
}

const SEED_SCHOOLS: School[] = [
  { id: 7001, ownerId: -1, name: "Учебный центр «Безопасность»", banner: "", city: "Москва", address: "ул. Профсоюзная, 5", about: "Аккредитованный центр по охране труда и промбезопасности.", license: "Лицензия №Л035-01298 от 12.01.2024", contacts: "+7 (495) 500-10-20, edu@safety.ru", visible: true, courses: [{ id: 1, title: "Охрана труда", hours: "40 ч", audience: "Специалисты ОТ" }, { id: 2, title: "Пожарно-технический минимум", hours: "16 ч", audience: "Руководители" }] },
  { id: 7002, ownerId: -1, name: "Академия Профразвития", banner: "", city: "Санкт-Петербург", address: "Лиговский пр., 30", about: "Повышение квалификации и переподготовка кадров.", license: "Лицензия №78Л03-00567", contacts: "+7 (812) 600-20-30", visible: true, courses: [{ id: 1, title: "Управление проектами", hours: "72 ч", audience: "Менеджеры" }] },
];

type ViewMode = "list" | "profile" | "request" | "cabinet" | "constructor" | "editCourse" | "myCourses" | "courseDetail";

interface Props { onBack: () => void; embedded?: boolean; initialView?: ViewMode; }

export default function SchoolsModule({ onBack, embedded, initialView }: Props) {
  const { currentUser, hasRole, isAdmin, addRoleRequest, roleRequests } = useApp();

  const [schools, setSchools] = usePersistentState<School[]>("schools_list", SEED_SCHOOLS);
  const [, setAllEnrollments] = usePersistentState<Enrollment[]>("school_enrollments_all", []);
  const [view, setView] = useState<ViewMode>(initialView || "list");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [requestPhone, setRequestPhone] = useState(currentUser.phone || "");
  const [requestAgreed, setRequestAgreed] = useState(false);
  const [editingCourse, setEditingCourse] = useState<SchoolCourse | null>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  // Запись на курс школы (с витрины)
  const [enrollCourse, setEnrollCourse] = useState<SchoolCourse | null>(null);
  const [enrollFio, setEnrollFio] = useState("");
  const [enrollPhone, setEnrollPhone] = useState("");

  // Курсы из конструктора SchoolAdmin (тот же ключ хранилища)
  const [constructorCourses, setConstructorCourses] = usePersistentState<ConstructorCourse[]>(`school_courses_${currentUser.id}`, []);
  // Глобальный store опубликованных курсов (читается в LearningModule)
  const [publishedCourses, setPublishedCourses] = usePersistentState<PublishedCourse[]>("published_courses_all", []);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [courseDetailTab, setCourseDetailTab] = useState<"students" | "homework" | "groups" | "enroll" | "analytics" | "access">("students");
  const [pricingCourseId, setPricingCourseId] = useState<number | null>(null);
  const [priceInput, setPriceInput] = useState("");

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  // Синхронизация опубликованных курсов в глобальный store
  const syncPublished = (courses: ConstructorCourse[]) => {
    const schoolName = mySchool?.name || schools.find(s => s.ownerId === currentUser.id)?.name || "Моя школа";
    setPublishedCourses(prev => {
      // Убираем все курсы этого owner
      const others = prev.filter(p => p.ownerId !== currentUser.id);
      // Добавляем опубликованные
      const mine: PublishedCourse[] = courses
        .filter(c => c.published && c.title)
        .map(c => ({
          id: c.id,
          ownerId: currentUser.id,
          schoolName,
          title: c.title,
          description: `${c.modules.length} модулей · ${c.modules.reduce((s, m) => s + m.lessons.length, 0)} уроков`,
          lessonsCount: c.modules.reduce((s, m) => s + m.lessons.length, 0),
          modulesCount: c.modules.length,
          paid: c.paid || false,
          price: c.price || 0,
          cert: !!c.documentName,
        }));
      return [...others, ...mine];
    });
  };

  const isSchool = isAdmin || hasRole("school");
  const myReq = roleRequests.filter(r => r.userId === currentUser.id && r.role === "school").slice(-1)[0];
  const mySchool = schools.find(s => s.ownerId === currentUser.id) || null;
  const selected = schools.find(s => s.id === selectedId) || null;

  const filtered = schools.filter(s => s.visible && s.name.toLowerCase().includes(search.toLowerCase()));

  const ensureMySchool = () => {
    if (mySchool) return mySchool;
    const created: School = { id: currentUser.id, ownerId: currentUser.id, name: currentUser.name, banner: "", city: currentUser.location || "Москва", address: "", about: "", license: "", contacts: currentUser.phone || "", courses: [], visible: true };
    setSchools(prev => [created, ...prev]);
    return created;
  };
  const updateMine = (patch: Partial<School>) => setSchools(prev => prev.map(s => s.ownerId === currentUser.id ? { ...s, ...patch } : s));

  const handleBanner = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader(); reader.onload = () => updateMine({ banner: reader.result as string }); reader.readAsDataURL(f); e.target.value = "";
  };

  // ── Конструктор курсов школы (переиспользуем существующий) ──
  if (view === "constructor") return <SchoolAdmin onBack={() => setView("cabinet")} />;

  // ── REQUEST ROLE (бесплатно) ──
  if (view === "request") {
    const canSubmit = requestPhone.replace(/\D/g, "").length >= 10 && requestAgreed;
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        {toast && <Toast msg={toast} />}
        <ModuleHeader title="Получить роль «Школа»" onBack={() => setView("list")} icon="School" iconColor="#6366f1" />
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-8 space-y-5">
          <div className="text-center space-y-3">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}><Icon name="School" size={36} color="#6366f1" /></div>
            <div><h2 className="text-xl font-bold text-white mb-2">Роль школы</h2><p className="text-white/50 text-sm">Создавайте курсы, ведите учеников и публикуйте обучение. Доступ бесплатный.</p></div>
          </div>
          <div className="glass rounded-2xl p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.15)' }}><Icon name="Gift" size={20} color="#10b981" /></div><div className="flex-1"><p className="text-sm font-semibold text-white">Стоимость роли</p><p className="text-xs text-white/40">Активируется после одобрения</p></div><span className="text-lg font-bold text-green-400">Бесплатно</span></div>
          <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Телефон для обратной связи *</label><input className="input-field" type="tel" placeholder="+7 (___) ___-__-__" value={requestPhone} onChange={e => setRequestPhone(e.target.value)} /></div>
          <div className="glass rounded-2xl p-4 flex items-start gap-3" style={{ border: '1px solid rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.08)' }}><Icon name="Info" size={16} color="#f59e0b" className="flex-shrink-0 mt-0.5" /><p className="text-xs text-yellow-200/80 leading-relaxed">Администрация рассматривает заявку и принимает решение об одобрении или отказе по собственному усмотрению. Решение администрации окончательно и не требует пояснений.</p></div>
          <button type="button" onClick={() => setRequestAgreed(a => !a)} className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all" style={{ background: requestAgreed ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)', border: requestAgreed ? '1px solid rgba(99,102,241,0.35)' : '1px solid rgba(255,255,255,0.1)' }}>
            <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: requestAgreed ? '#6366f1' : 'transparent', border: requestAgreed ? 'none' : '1px solid rgba(255,255,255,0.25)' }}>{requestAgreed && <Icon name="Check" size={12} color="white" />}</div>
            <span className="text-sm text-white/80">Я ознакомлен и согласен с правилами подачи заявки</span>
          </button>
          <button className="btn-primary flex items-center justify-center gap-2 disabled:opacity-40" disabled={!canSubmit} onClick={() => { addRoleRequest("school", requestPhone, false); showToast("📩 Заявка отправлена администратору"); setRequestAgreed(false); setView("list"); }} style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}><Icon name="Send" size={18} />Отправить заявку</button>
        </div>
      </div>
    );
  }

  // ── EDIT COURSE (краткая карточка в профиле школы) ──
  if (view === "editCourse" && editingCourse) {
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        <ModuleHeader title="Курс школы" onBack={() => setView("cabinet")} icon="Pencil" iconColor="#6366f1" />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
          <Field label="Название курса" value={editingCourse.title} onChange={v => setEditingCourse(c => c && { ...c, title: v })} />
          <Field label="Количество часов" value={editingCourse.hours} onChange={v => setEditingCourse(c => c && { ...c, hours: v })} placeholder="Например: 40 ч" />
          <Field label="Категория слушателей" value={editingCourse.audience} onChange={v => setEditingCourse(c => c && { ...c, audience: v })} placeholder="Например: Специалисты ОТ" />
          <Field label="Описание курса" value={editingCourse.description || ""} onChange={v => setEditingCourse(c => c && { ...c, description: v })} textarea placeholder="Краткое описание курса для слушателей" />
          <button onClick={() => { const me = mySchool || ensureMySchool(); updateMine({ courses: me.courses.some(c => c.id === editingCourse.id) ? me.courses.map(c => c.id === editingCourse.id ? editingCourse : c) : [...me.courses, editingCourse] }); showToast("✅ Сохранено"); setView("cabinet"); }} disabled={!editingCourse.title.trim()} className="btn-primary flex items-center justify-center gap-2 disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}><Icon name="Check" size={18} />Сохранить</button>
        </div>
      </div>
    );
  }

  // ── МОИ КУРСЫ (из конструктора) ──
  if (view === "myCourses") {
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        {toast && <Toast msg={toast} />}
        <ModuleHeader title="Мои курсы" onBack={() => setView("cabinet")} icon="GraduationCap" iconColor="#6366f1" subtitle={`${constructorCourses.length} курсов`} />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
          {constructorCourses.length === 0 ? (
            <div className="text-center py-16">
              <Icon name="GraduationCap" size={36} color="rgba(255,255,255,0.2)" className="mx-auto mb-3" />
              <p className="text-white/40 text-sm mb-4">Курсы ещё не созданы</p>
              <button onClick={() => setView("constructor")} className="btn-primary flex items-center justify-center gap-2 mx-auto px-6" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                <Icon name="Plus" size={16} />Создать первый курс
              </button>
            </div>
          ) : (
            constructorCourses.map((course, i) => {
              const lessonsTotal = course.modules.reduce((s, m) => s + m.lessons.length, 0);
              const isPricing = pricingCourseId === course.id;
              return (
                <div key={course.id} className="glass rounded-2xl overflow-hidden animate-fade-up opacity-0" style={{ animationDelay: `${i * 0.06}s`, animationFillMode: 'forwards' }}>
                  <div className="p-4 space-y-3">
                    {/* Заголовок */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,0.2)' }}>
                        <Icon name="BookOpen" size={20} color="#6366f1" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white leading-snug">{course.title || "Без названия"}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="text-xs text-white/40">{course.modules.length} мод. · {lessonsTotal} уроков</span>
                          <span className="text-xs px-2 py-0.5 rounded-lg font-medium" style={{ background: course.published ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.15)', color: course.published ? '#10b981' : '#94a3b8' }}>
                            {course.published ? "Опубликован" : "Черновик"}
                          </span>
                          {course.paid && course.price ? (
                            <span className="text-xs px-2 py-0.5 rounded-lg font-medium" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>{course.price.toLocaleString("ru-RU")} ₽</span>
                          ) : course.paid ? (
                            <span className="text-xs px-2 py-0.5 rounded-lg font-medium" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>Платный</span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Кнопка публикации в общий поток */}
                    <button
                      onClick={() => {
                        const updated = constructorCourses.map(c => c.id === course.id ? { ...c, published: !c.published } : c);
                        setConstructorCourses(updated);
                        syncPublished(updated);
                        showToast(course.published ? "Курс снят с публикации" : "✅ Курс опубликован — виден в библиотеке и на витрине школы");
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                      style={{
                        background: course.published ? 'rgba(245,158,11,0.12)' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
                        border: course.published ? '1px solid rgba(245,158,11,0.35)' : 'none',
                        color: course.published ? '#f59e0b' : 'white',
                      }}
                    >
                      <Icon name={course.published ? "EyeOff" : "Eye"} size={16} color={course.published ? '#f59e0b' : 'white'} />
                      {course.published ? "Снять с публикации" : "Опубликовать — видно ученикам и в общем потоке"}
                    </button>

                    {/* Строка: Изменить / Сделать платным / Удалить */}
                    <div className="grid grid-cols-3 gap-2">
                      <button onClick={() => { setSelectedCourseId(course.id); setView("constructor"); }} className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium" style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8' }}>
                        <Icon name="Pencil" size={13} color="#818cf8" />Изменить
                      </button>
                      <button
                        onClick={() => {
                          if (course.paid) {
                            setConstructorCourses(prev => prev.map(c => c.id === course.id ? { ...c, paid: false, price: 0 } : c));
                            setPricingCourseId(null);
                          } else {
                            setPricingCourseId(course.id);
                            setPriceInput(course.price ? String(course.price) : "");
                          }
                        }}
                        className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium"
                        style={{ background: course.paid ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.05)', border: `1px solid ${course.paid ? 'rgba(245,158,11,0.35)' : 'rgba(255,255,255,0.1)'}`, color: course.paid ? '#f59e0b' : 'rgba(255,255,255,0.6)' }}
                      >
                        <Icon name="Wallet" size={13} color={course.paid ? '#f59e0b' : 'rgba(255,255,255,0.5)'} />
                        {course.paid ? "Бесплатно" : "Платный"}
                      </button>
                      <button onClick={() => { if (window.confirm?.("Удалить курс?")) setConstructorCourses(prev => prev.filter(c => c.id !== course.id)); }} className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
                        <Icon name="Trash2" size={13} color="#ef4444" />Удалить
                      </button>
                    </div>

                    {/* Ввод цены (при нажатии «Платный») */}
                    {isPricing && (
                      <div className="flex gap-2 p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                        <input
                          className="input-field flex-1 py-2 text-sm"
                          type="number"
                          placeholder="Цена, ₽"
                          value={priceInput}
                          onChange={e => setPriceInput(e.target.value)}
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            const p = Number(priceInput);
                            if (p > 0) {
                              setConstructorCourses(prev => prev.map(c => c.id === course.id ? { ...c, paid: true, price: p } : c));
                              setPricingCourseId(null);
                              showToast(`Цена ${p.toLocaleString("ru-RU")} ₽ установлена`);
                            }
                          }}
                          disabled={!Number(priceInput)}
                          className="px-4 rounded-xl text-sm font-semibold disabled:opacity-40"
                          style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: 'white' }}
                        >
                          Сохранить
                        </button>
                      </div>
                    )}

                    {/* Разделы управления */}
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { tab: "students", icon: "Users", label: "Ученики" },
                        { tab: "homework", icon: "ClipboardCheck", label: "Проверка ДЗ" },
                        { tab: "groups", icon: "CalendarDays", label: "Группы" },
                        { tab: "enroll", icon: "UserPlus", label: "Записи" },
                        { tab: "analytics", icon: "BarChart3", label: "Аналитика" },
                        { tab: "access", icon: "Settings", label: "Доступ" },
                      ] as const).map(item => (
                        <button key={item.tab} onClick={() => { setSelectedCourseId(course.id); setCourseDetailTab(item.tab); setView("courseDetail"); }} className="flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-medium transition-all hover:bg-white/10" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
                          <Icon name={item.icon} size={16} color="rgba(255,255,255,0.5)" />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <button onClick={() => setView("constructor")} className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
            <Icon name="Plus" size={18} />Создать новый курс в конструкторе
          </button>
        </div>
      </div>
    );
  }

  // ── ДЕТАЛИ КУРСА → открываем SchoolAdmin с нужным табом и курсом ──
  if (view === "courseDetail") {
    const tabMap: Record<string, "students" | "homework" | "groups" | "enroll" | "analytics" | "settings"> = {
      students: "students", homework: "homework", groups: "groups",
      enroll: "enroll", analytics: "analytics", access: "settings",
    };
    return (
      <SchoolAdmin
        onBack={() => setView("myCourses")}
        initialTab={tabMap[courseDetailTab] || "students"}
        initialCourseId={selectedCourseId ?? undefined}
      />
    );
  }

  // ── SCHOOL CABINET ──
  if (view === "cabinet") {
    const me = mySchool || ensureMySchool();
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        {toast && <Toast msg={toast} />}
        <ModuleHeader title="Кабинет школы" onBack={() => setView("list")} icon="School" iconColor="#6366f1" />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
          <div className="rounded-2xl overflow-hidden h-28 relative" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
            {me.banner && <img src={me.banner} alt="" className="w-full h-full object-cover" />}
            <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={handleBanner} />
            <button onClick={() => bannerRef.current?.click()} className="absolute bottom-2 right-2 px-3 py-1.5 rounded-lg text-xs font-medium text-white flex items-center gap-1.5" style={{ background: 'rgba(0,0,0,0.5)' }}><Icon name="ImagePlus" size={13} />{me.banner ? "Заменить баннер" : "Загрузить баннер"}</button>
          </div>

          <div className="glass rounded-2xl p-4 space-y-3">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Профиль школы</p>
            <Field label="Наименование" value={me.name} onChange={v => updateMine({ name: v })} />
            <Field label="Город" value={me.city} onChange={v => updateMine({ city: v })} />
            <Field label="Местонахождение / адрес" value={me.address} onChange={v => updateMine({ address: v })} />
            <Field label="Информация о школе" value={me.about} onChange={v => updateMine({ about: v })} textarea />
            <Field label="Информация о лицензии" value={me.license} onChange={v => updateMine({ license: v })} />
            <Field label="Контакты" value={me.contacts} onChange={v => updateMine({ contacts: v })} />
            <button onClick={() => updateMine({ visible: !me.visible })} className="w-full flex items-center gap-3 p-3 rounded-xl" style={{ background: me.visible ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${me.visible ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.1)'}` }}>
              <Icon name={me.visible ? "Eye" : "EyeOff"} size={16} color={me.visible ? "#10b981" : "rgba(255,255,255,0.5)"} />
              <span className="text-sm text-white/80 flex-1 text-left">{me.visible ? "Видна в общем списке школ" : "Скрыта из списка"}</span>
            </button>
          </div>

          {/* Мои курсы — карточки из конструктора с управлением */}
          <button onClick={() => setView("myCourses")} className="w-full flex items-center gap-3 p-4 rounded-2xl text-left" style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.35)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,0.2)' }}><Icon name="GraduationCap" size={20} color="#6366f1" /></div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Мои курсы</p>
              <p className="text-xs text-white/40">{constructorCourses.length} курсов · ученики, ДЗ, группы, аналитика</p>
            </div>
            {constructorCourses.length > 0 && <span className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ background: '#6366f1' }}>{constructorCourses.length}</span>}
            <Icon name="ChevronRight" size={16} color="rgba(255,255,255,0.3)" />
          </button>

          {/* Конструктор курсов (создание и редактирование уроков) */}
          <button onClick={() => setView("constructor")} className="w-full flex items-center gap-3 p-4 rounded-2xl text-left" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,0.15)' }}><Icon name="LayoutGrid" size={20} color="#6366f1" /></div>
            <div className="flex-1"><p className="text-sm font-semibold text-white">Конструктор курсов</p><p className="text-xs text-white/40">Создать и редактировать модули, уроки, тесты</p></div>
            <Icon name="ChevronRight" size={16} color="rgba(255,255,255,0.3)" />
          </button>

          {/* Краткий список курсов школы (для витрины) */}
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3"><p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Курсы для витрины</p><button onClick={() => { setEditingCourse({ id: Date.now(), title: "", hours: "", audience: "" }); setView("editCourse"); }} className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}><Icon name="Plus" size={12} color="#818cf8" />Добавить</button></div>
            <div className="space-y-2">
              {me.courses.map(c => <div key={c.id} className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}><div className="flex-1 min-w-0"><p className="text-sm text-white truncate">{c.title}</p><p className="text-xs text-white/40">{c.hours} · {c.audience}</p></div><button onClick={() => { setEditingCourse(c); setView("editCourse"); }} className="p-1.5 rounded-lg hover:bg-white/10"><Icon name="Pencil" size={13} color="rgba(255,255,255,0.6)" /></button><button onClick={() => updateMine({ courses: me.courses.filter(x => x.id !== c.id) })} className="p-1.5 rounded-lg hover:bg-white/10"><Icon name="Trash2" size={13} color="rgba(239,68,68,0.7)" /></button></div>)}
              {me.courses.length === 0 && <p className="text-center py-3 text-white/30 text-xs">Курсы не добавлены</p>}
            </div>
          </div>

          <button onClick={() => { setSelectedId(me.id); setView("profile"); }} className="btn-ghost flex items-center justify-center gap-2 text-sm"><Icon name="Eye" size={16} />Предпросмотр профиля</button>
        </div>
      </div>
    );
  }

  // ── SCHOOL PROFILE (public) ──
  if (view === "profile" && selected) {
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        {toast && <Toast msg={toast} />}
        <ModuleHeader title={selected.name} onBack={() => setView("list")} subtitle={selected.city} />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
          <div className="rounded-2xl overflow-hidden h-32 relative" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>{selected.banner && <img src={selected.banner} alt="" className="w-full h-full object-cover" />}</div>
          <div className="glass-strong rounded-2xl p-4 -mt-10 mx-2 relative">
            <h2 className="text-lg font-bold text-white">{selected.name}</h2>
            <p className="text-xs text-white/40 flex items-center gap-1 mt-1"><Icon name="MapPin" size={11} />{selected.city}{selected.address ? `, ${selected.address}` : ""}</p>
            {selected.about && <p className="text-sm text-white/60 mt-2">{selected.about}</p>}
            {selected.license && <p className="text-xs text-white/50 mt-2 flex items-center gap-1.5"><Icon name="BadgeCheck" size={13} color="#10b981" />{selected.license}</p>}
            {selected.contacts && <p className="text-sm text-white/70 mt-2 flex items-center gap-1.5"><Icon name="Phone" size={13} color="#6366f1" />{selected.contacts}</p>}
          </div>
          {(() => {
            // Показываем опубликованные курсы из конструктора + ручные курсы витрины
            const constructorPublished = publishedCourses.filter(p => p.ownerId === selected.ownerId);
            const allCourses = constructorPublished.length > 0 ? constructorPublished : null;
            return (
              <div>
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider px-1 mb-2 flex items-center gap-1.5">
                  <Icon name="GraduationCap" size={13} color="#6366f1" />Курсы школы
                </p>
                <div className="space-y-2">
                  {allCourses && allCourses.map(c => (
                    <div key={c.id} className="glass rounded-xl p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-medium text-white">{c.title}</p>
                        {c.paid && c.price > 0 && <span className="text-xs px-2 py-0.5 rounded-lg flex-shrink-0" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>{c.price.toLocaleString("ru-RU")} ₽</span>}
                        {!c.paid && <span className="text-xs px-2 py-0.5 rounded-lg flex-shrink-0" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>Бесплатно</span>}
                      </div>
                      <p className="text-xs text-white/40">{c.modulesCount} модулей · {c.lessonsCount} уроков</p>
                      {c.cert && <p className="text-xs text-yellow-400/70 mt-1 flex items-center gap-1"><Icon name="Award" size={11} color="#f59e0b" />Документ по окончании</p>}
                      <button onClick={() => { setEnrollCourse({ id: c.id, title: c.title, hours: `${c.lessonsCount} уроков`, audience: "" }); setEnrollFio(""); setEnrollPhone(currentUser.phone || ""); }} className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                        <Icon name="UserPlus" size={14} />Записаться на курс
                      </button>
                    </div>
                  ))}
                  {(!allCourses || allCourses.length === 0) && selected.courses.map(c => (
                    <div key={c.id} className="glass rounded-xl p-3">
                      <p className="text-sm font-medium text-white">{c.title}</p>
                      <p className="text-xs text-white/40 mt-1">{c.hours} · {c.audience}</p>
                      {c.description && <p className="text-xs text-white/50 mt-1.5">{c.description}</p>}
                      <button onClick={() => { setEnrollCourse(c); setEnrollFio(""); setEnrollPhone(currentUser.phone || ""); }} className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                        <Icon name="UserPlus" size={14} />Записаться на курс
                      </button>
                    </div>
                  ))}
                  {(!allCourses || allCourses.length === 0) && selected.courses.length === 0 && <p className="text-center py-4 text-white/30 text-sm">Курсы не добавлены</p>}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Модалка записи на курс школы */}
        {enrollCourse && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setEnrollCourse(null)}>
            <div className="w-full max-w-md mx-4 mb-4 sm:mb-0 glass-strong rounded-3xl p-6 animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2 mb-4"><div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.2)' }}><Icon name="UserPlus" size={16} color="#6366f1" /></div><h3 className="text-base font-bold text-white">Запись на курс</h3></div>
              <p className="text-xs text-white/40 mb-3">{enrollCourse.title} · {selected.name}</p>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">ФИО</label>
              <input className="input-field mb-3" placeholder="Иванов Иван Иванович" value={enrollFio} onChange={e => setEnrollFio(e.target.value)} />
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Номер телефона</label>
              <input className="input-field mb-4" type="tel" placeholder="+7 (___) ___-__-__" value={enrollPhone} onChange={e => setEnrollPhone(e.target.value)} />
              <div className="flex gap-2">
                <button onClick={() => setEnrollCourse(null)} className="btn-ghost flex-1 text-sm">Отмена</button>
                <button onClick={() => {
                  if (enrollFio.trim() && enrollPhone.replace(/\D/g, "").length >= 10) {
                    setAllEnrollments(prev => [{ id: Date.now(), courseId: enrollCourse.id, courseTitle: enrollCourse.title, fio: enrollFio, phone: enrollPhone, date: new Date().toLocaleDateString("ru-RU"), ownerId: selected.ownerId, schoolName: selected.name }, ...prev]);
                    setEnrollCourse(null); showToast("✅ Вы записаны на курс!");
                  }
                }} disabled={!enrollFio.trim() || enrollPhone.replace(/\D/g, "").length < 10} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2 disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}><Icon name="Check" size={15} />Записаться</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── MAIN LIST ──
  return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      {toast && <Toast msg={toast} />}
      <div className="glass border-b border-white/10 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/10 transition-colors flex-shrink-0"><Icon name="ArrowLeft" size={20} color="white" /></button>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)' }}><Icon name="School" size={16} color="#6366f1" /></div>
            <div className="flex-1"><h1 className="text-base font-bold text-white">{embedded ? "Курсы по школам" : "Школы"}</h1><p className="text-xs text-white/40">{filtered.length} организаций</p></div>
            {isSchool && !embedded && <button onClick={() => setView("cabinet")} className="p-2 rounded-xl hover:bg-white/10 transition-colors"><Icon name="LayoutDashboard" size={18} color="#6366f1" /></button>}
          </div>
          {!isSchool && (
            myReq && myReq.status === "pending" ? (
              <div className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.1)', border: '1px dashed rgba(245,158,11,0.35)' }}><Icon name="Clock" size={16} color="#f59e0b" /><span className="text-sm font-medium text-white flex-1">Заявка на роль «Школа» на рассмотрении</span></div>
            ) : (
              <button onClick={() => { setRequestPhone(currentUser.phone || ""); setRequestAgreed(false); setView("request"); }} className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-left" style={{ background: 'rgba(99,102,241,0.1)', border: '1px dashed rgba(99,102,241,0.35)' }}><Icon name="School" size={16} color="#6366f1" /><span className="text-sm font-medium text-white flex-1">Получить роль «Школа» (бесплатно)</span><Icon name="ChevronRight" size={15} color="rgba(99,102,241,0.6)" /></button>
            )
          )}
          <div className="relative"><Icon name="Search" size={15} color="rgba(255,255,255,0.3)" className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" /><input className="input-field pl-12 py-2.5 text-sm" placeholder="Поиск по названию школы..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 pt-3 pb-8 space-y-3">
        {filtered.map((s, i) => (
          <button key={s.id} onClick={() => { setSelectedId(s.id); setView("profile"); }} className="w-full text-left glass rounded-2xl overflow-hidden animate-fade-up opacity-0 hover:border-white/20 transition-all" style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'forwards' }}>
            <div className="h-20 relative" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>{s.banner && <img src={s.banner} alt="" className="w-full h-full object-cover" />}</div>
            <div className="p-3">
              <p className="text-sm font-semibold text-white">{s.name}</p>
              <p className="text-xs text-white/50 mt-0.5">{s.courses.length} курсов</p>
              <p className="text-xs text-white/40 mt-1 flex items-center gap-1"><Icon name="MapPin" size={11} />{s.city}</p>
            </div>
          </button>
        ))}
        {filtered.length === 0 && <div className="text-center py-14"><Icon name="School" size={32} color="rgba(255,255,255,0.2)" className="mx-auto mb-3" /><p className="text-white/30 text-sm">Школы не найдены</p></div>}
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
  return <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl text-sm font-medium text-white animate-fade-up" style={{ background: 'rgba(99,102,241,0.92)', backdropFilter: 'blur(12px)', animationFillMode: 'forwards' }}>{msg}</div>;
}