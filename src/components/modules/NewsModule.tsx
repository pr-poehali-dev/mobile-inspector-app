import { useState, useMemo } from "react";
import Icon from "@/components/ui/icon";
import ModuleHeader from "@/components/ModuleHeader";

interface Props { onBack: () => void; user?: { role: string; name: string } }

interface NewsItem {
  id: number;
  title: string;
  text: string;
  category: string;
  date: string;
  author: string;
  authorRole: "admin" | "editor" | "user";
  image: string;
  important: boolean;
  status: "published" | "draft";
}

const NEWS_CATEGORIES = [
  "Все",
  "Промышленная безопасность",
  "Охрана труда",
  "Пожарная безопасность",
  "Экологическая безопасность",
  "Информационная безопасность",
  "Антитеррористическая безопасность",
  "Санитарно-эпидемиологическая безопасность",
  "Транспортная безопасность",
  "Охрана окружающей среды",
  "Налоговое законодательство",
  "Иное",
];

const CAT_COLORS: Record<string, string> = {
  "Промышленная безопасность": "#f97316",
  "Охрана труда": "#eab308",
  "Пожарная безопасность": "#ef4444",
  "Экологическая безопасность": "#22c55e",
  "Информационная безопасность": "#06b6d4",
  "Антитеррористическая безопасность": "#ec4899",
  "Санитарно-эпидемиологическая безопасность": "#a78bfa",
  "Транспортная безопасность": "#3b82f6",
  "Охрана окружающей среды": "#10b981",
  "Налоговое законодательство": "#f59e0b",
  "Иное": "#64748b",
};

const IMG_GRADIENTS = [
  "linear-gradient(135deg, #1b3a7a, #0f2050)",
  "linear-gradient(135deg, #7a1b1b, #501010)",
  "linear-gradient(135deg, #1a5c40, #0d3a28)",
  "linear-gradient(135deg, #7a5c10, #503c08)",
  "linear-gradient(135deg, #4a1b7a, #2d1050)",
];

const INITIAL_NEWS: NewsItem[] = [
  {
    id: 1, title: "Плановое техобслуживание серверов 10 июня",
    text: "В период с 02:00 до 05:00 10 июня будет проводиться плановое обслуживание серверной инфраструктуры. Сервисы будут временно недоступны. Просим заранее сохранить незавершённые работы.",
    category: "Информационная безопасность", date: "02.06.2026", author: "Администратор",
    authorRole: "admin", image: IMG_GRADIENTS[0], important: true, status: "published",
  },
  {
    id: 2, title: "Запускаем новый модуль «ИИ Ассистент»",
    text: "С сегодняшнего дня доступен умный помощник на основе корпоративной базы знаний. Он ответит на вопросы по документам, чек-листам и новостям.",
    category: "Иное", date: "01.06.2026", author: "Отдел разработки",
    authorRole: "admin", image: IMG_GRADIENTS[1], important: false, status: "published",
  },
  {
    id: 3, title: "Конференция по безопасности труда — 15 июня",
    text: "Приглашаем всех сотрудников на ежегодную конференцию по охране труда. Регистрация обязательна. Начало в 10:00 в конференц-зале №2. Будут рассмотрены изменения в законодательстве за 2026 год.",
    category: "Охрана труда", date: "30.05.2026", author: "Служба охраны труда",
    authorRole: "editor", image: IMG_GRADIENTS[2], important: true, status: "published",
  },
  {
    id: 4, title: "Обновление регламентов внутреннего документооборота",
    text: "С 1 июня вступают в силу обновлённые регламенты. Пожалуйста, ознакомьтесь с изменениями в разделе «Документооборот». Особое внимание уделите порядку согласования договоров.",
    category: "Иное", date: "28.05.2026", author: "Юридический отдел",
    authorRole: "editor", image: IMG_GRADIENTS[3], important: false, status: "published",
  },
  {
    id: 5, title: "Новые требования пожарной безопасности в офисах",
    text: "Роструд обновил нормативные требования к системам пожарной сигнализации в офисных помещениях. Все объекты должны пройти аудит до 1 сентября 2026 года.",
    category: "Пожарная безопасность", date: "25.05.2026", author: "Служба ПБ",
    authorRole: "editor", image: IMG_GRADIENTS[4], important: false, status: "published",
  },
];

type ViewMode = "list" | "detail" | "add" | "my" | "request";

export default function NewsModule({ onBack, user }: Props) {
  const [news, setNews] = useState<NewsItem[]>(INITIAL_NEWS);
  const [myNews, setMyNews] = useState<NewsItem[]>([]);
  const [category, setCategory] = useState("Все");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("list");
  const [selected, setSelected] = useState<NewsItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [editorRequests, setEditorRequests] = useState([
    { id: 1, name: "Николай Сидоров", date: "01.06.2026", status: "pending" as "pending" | "approved" | "rejected" },
  ]);
  const [addForm, setAddForm] = useState({
    title: "", text: "", category: "Охрана труда", important: false,
  });

  const isEditor = user?.role === "admin" || user?.role === "editor";
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const filtered = useMemo(() => {
    let list = news.filter(n => n.status === "published");
    if (category !== "Все") list = list.filter(n => n.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(n => n.title.toLowerCase().includes(q) || n.text.toLowerCase().includes(q) || n.author.toLowerCase().includes(q));
    }
    return list;
  }, [news, category, search]);

  const publishNews = () => {
    if (!addForm.title.trim() || !addForm.text.trim()) return;
    const item: NewsItem = {
      id: Date.now(), title: addForm.title, text: addForm.text,
      category: addForm.category, date: new Date().toLocaleDateString("ru-RU"),
      author: user?.name || "Пользователь",
      authorRole: user?.role === "admin" ? "admin" : "editor",
      image: IMG_GRADIENTS[Math.floor(Math.random() * IMG_GRADIENTS.length)],
      important: addForm.important, status: isEditor ? "published" : "draft",
    };
    if (isEditor) setNews(prev => [item, ...prev]);
    setMyNews(prev => [item, ...prev]);
    setAddForm({ title: "", text: "", category: "Охрана труда", important: false });
    setView("list");
    showToast(isEditor ? "✅ Новость опубликована!" : "📝 Сохранено в «Мои новости»");
  };

  // ── REQUEST EDITOR ROLE ─────────────────────────────────────────────────────
  if (view === "request") return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      <ModuleHeader title="Стать редактором" onBack={() => setView("list")} />
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-8 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <Icon name="Newspaper" size={36} color="#f59e0b" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Роль редактора</h2>
          <p className="text-white/50 text-sm leading-relaxed">Получите право публиковать новости в общую ленту. Запрос будет рассмотрен администратором в течение 1 рабочего дня.</p>
        </div>
        <div className="glass rounded-2xl p-4 text-left space-y-2.5">
          {["Добавлять новости в общую ленту", "Выбирать категорию и важность", "Загружать изображение к статье", "Видеть статистику просмотров"].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,158,11,0.2)' }}>
                <Icon name="Check" size={11} color="#f59e0b" />
              </div>
              <span className="text-sm text-white/70">{item}</span>
            </div>
          ))}
        </div>
        <button className="btn-primary flex items-center justify-center gap-2" onClick={() => { showToast("📩 Заявка на роль редактора отправлена"); setView("list"); }} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
          <Icon name="Send" size={18} />Отправить заявку
        </button>
      </div>
    </div>
  );

  // ── MY NEWS ─────────────────────────────────────────────────────────────────
  if (view === "my") return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      <ModuleHeader title="Мои новости" onBack={() => setView("list")} icon="FileText" iconColor="#f59e0b" />
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-3">
        {myNews.length > 0 ? myNews.map((item, i) => (
          <div key={item.id} className="glass rounded-2xl p-4 animate-fade-up opacity-0" style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'forwards' }}>
            <div className="flex items-start justify-between mb-2">
              <span className="tag text-xs" style={{ background: `${getCatColor(item.category)}20`, borderColor: `${getCatColor(item.category)}40`, color: getCatColor(item.category) }}>{item.category}</span>
              <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: item.status === "published" ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: item.status === "published" ? '#10b981' : '#f59e0b' }}>
                {item.status === "published" ? "Опубликовано" : "На модерации"}
              </span>
            </div>
            <p className="text-sm font-semibold text-white mb-1">{item.title}</p>
            <p className="text-xs text-white/40">{item.date}</p>
          </div>
        )) : (
          <div className="text-center py-14">
            <Icon name="FileText" size={36} color="rgba(255,255,255,0.2)" className="mx-auto mb-3" />
            <p className="text-white/30 text-sm">Вы ещё не добавляли новостей</p>
            <button onClick={() => setView("add")} className="mt-4 text-yellow-400 text-sm hover:text-yellow-300 transition-colors">Добавить первую новость</button>
          </div>
        )}
      </div>
    </div>
  );

  // ── ADD NEWS ────────────────────────────────────────────────────────────────
  if (view === "add") return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      <ModuleHeader title="Добавить новость" onBack={() => setView("list")} icon="Plus" iconColor="#f59e0b" />
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
        <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Заголовок *</label>
          <input className="input-field" placeholder="Введите заголовок..." value={addForm.title} onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))} /></div>
        <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Текст новости *</label>
          <textarea className="input-field resize-none" rows={6} placeholder="Текст статьи..." value={addForm.text} onChange={e => setAddForm(f => ({ ...f, text: e.target.value }))} /></div>
        <div>
          <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Категория</label>
          <div className="flex flex-wrap gap-2">
            {NEWS_CATEGORIES.slice(1).map(cat => (
              <button key={cat} onClick={() => setAddForm(f => ({ ...f, category: cat }))} className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={{ background: addForm.category === cat ? `${getCatColor(cat)}25` : 'rgba(255,255,255,0.06)', border: `1px solid ${addForm.category === cat ? `${getCatColor(cat)}60` : 'rgba(255,255,255,0.1)'}`, color: addForm.category === cat ? getCatColor(cat) : 'rgba(255,255,255,0.5)' }}>
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setAddForm(f => ({ ...f, important: !f.important }))}
            className="w-full flex items-center gap-3 p-4 rounded-xl transition-all"
            style={{ background: addForm.important ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)', border: addForm.important ? '1px solid rgba(239,68,68,0.35)' : '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all ${addForm.important ? "" : "border border-white/25"}`} style={{ background: addForm.important ? '#ef4444' : 'transparent' }}>
              {addForm.important && <Icon name="Check" size={12} color="white" />}
            </div>
            <div>
              <p className="text-sm font-medium text-white text-left">Важная новость</p>
              <p className="text-xs text-white/40 text-left">Будет выделена красной меткой</p>
            </div>
          </button>
          <div className="flex items-center gap-3 p-4 rounded-xl cursor-pointer hover:bg-white/5 transition-colors" style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)' }}>
            <Icon name="ImageIcon" size={18} color="rgba(255,255,255,0.4)" />
            <span className="text-sm text-white/40">Загрузить изображение к статье</span>
          </div>
        </div>
        {!isEditor && (
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <Icon name="Info" size={15} color="#f59e0b" />
            <p className="text-xs text-yellow-300/80">Новость сохранится в «Мои новости». Для публикации в ленту нужна роль редактора.</p>
          </div>
        )}
        <button onClick={publishNews} className="btn-primary flex items-center justify-center gap-2" disabled={!addForm.title.trim() || !addForm.text.trim()} style={{ background: isEditor ? 'linear-gradient(135deg, #f59e0b, #d97706)' : undefined }}>
          <Icon name={isEditor ? "Send" : "Save"} size={18} />
          {isEditor ? "Опубликовать" : "Сохранить в «Мои новости»"}
        </button>
        {!isEditor && (
          <button onClick={() => setView("request")} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-yellow-400 transition-colors hover:bg-yellow-500/10" style={{ border: '1px solid rgba(245,158,11,0.25)' }}>
            <Icon name="UserPlus" size={15} color="#f59e0b" />Запросить роль редактора
          </button>
        )}
      </div>
    </div>
  );

  // ── DETAIL ───────────────────────────────────────────────────────────────────
  if (view === "detail" && selected) return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      <ModuleHeader title={selected.category} onBack={() => setView("list")} />
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
        {selected.important && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <Icon name="AlertTriangle" size={15} color="#ef4444" />
            <span className="text-sm text-red-400 font-medium">Важная новость</span>
          </div>
        )}
        <div className="rounded-2xl overflow-hidden" style={{ background: selected.image, aspectRatio: '16/7' }}>
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.2)' }}>
            <Icon name="Newspaper" size={36} color="rgba(255,255,255,0.2)" />
          </div>
        </div>
        <div>
          <h1 className="text-xl font-bold text-white mb-3" style={{ fontFamily: 'Montserrat, sans-serif' }}>{selected.title}</h1>
          <div className="flex items-center gap-3 text-xs text-white/40 mb-4">
            <span className="flex items-center gap-1"><Icon name="User" size={12} />{selected.author}</span>
            <span className="flex items-center gap-1"><Icon name="Calendar" size={12} />{selected.date}</span>
            <span className="tag" style={{ background: `${getCatColor(selected.category)}20`, borderColor: `${getCatColor(selected.category)}40`, color: getCatColor(selected.category) }}>{selected.category}</span>
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-sm text-white/80 leading-relaxed">{selected.text}</p>
        </div>
      </div>
    </div>
  );

  // ── MAIN LIST ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl text-sm font-medium text-white animate-fade-up" style={{ background: 'rgba(245,158,11,0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(245,158,11,0.5)', animationFillMode: 'forwards' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="glass border-b border-white/10 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/10 transition-colors flex-shrink-0">
              <Icon name="ArrowLeft" size={20} color="white" />
            </button>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <Icon name="Newspaper" size={16} color="#f59e0b" />
            </div>
            <h1 className="text-base font-bold text-white flex-1">Новостная лента</h1>
            <button onClick={() => setView("my")} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
              <Icon name="BookOpen" size={18} color="rgba(255,255,255,0.6)" />
            </button>
            <button onClick={() => setView("add")} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
              <Icon name="Plus" size={20} color="white" />
            </button>
          </div>
          {/* Search */}
          <div className="relative">
            <Icon name="Search" size={15} color="rgba(255,255,255,0.3)" className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input className="input-field pl-9 pr-9 py-2.5 text-sm" placeholder="Поиск по заголовку, тексту, автору..." value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><Icon name="X" size={15} color="rgba(255,255,255,0.4)" /></button>}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-3 pb-8 space-y-3">
        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {NEWS_CATEGORIES.map(cat => {
            const color = cat === "Все" ? "#f59e0b" : getCatColor(cat);
            return (
              <button key={cat} onClick={() => setCategory(cat)} className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={{ background: category === cat ? `${color}25` : 'rgba(255,255,255,0.06)', border: `1px solid ${category === cat ? `${color}60` : 'rgba(255,255,255,0.1)'}`, color: category === cat ? color : 'rgba(255,255,255,0.5)' }}>
                {cat}
              </button>
            );
          })}
        </div>

        {/* News cards */}
        {filtered.length > 0
          ? filtered.map((item, i) => (
            <button key={item.id} onClick={() => { setSelected(item); setView("detail"); }}
              className="w-full text-left glass rounded-2xl overflow-hidden animate-fade-up opacity-0 hover:border-white/20 transition-all"
              style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'forwards' }}>
              {/* Image stripe */}
              <div className="relative" style={{ background: item.image, height: '80px' }}>
                <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.25)' }} />
                <div className="absolute top-2 left-2 flex gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-lg font-medium" style={{ background: `${getCatColor(item.category)}90`, color: 'white' }}>{item.category.split(" ")[0]}</span>
                  {item.important && <span className="text-xs px-2 py-0.5 rounded-lg font-medium" style={{ background: 'rgba(239,68,68,0.85)', color: 'white' }}>Важно</span>}
                </div>
              </div>
              <div className="p-3">
                <h3 className="text-sm font-semibold text-white mb-2 leading-snug">{item.title}</h3>
                <p className="text-xs text-white/50 line-clamp-2 mb-2">{item.text}</p>
                <div className="flex items-center gap-3 text-xs text-white/30">
                  <span className="flex items-center gap-1"><Icon name="User" size={10} />{item.author}</span>
                  <span className="flex items-center gap-1"><Icon name="Calendar" size={10} />{item.date}</span>
                  <Icon name="ChevronRight" size={14} color="rgba(255,255,255,0.2)" className="ml-auto" />
                </div>
              </div>
            </button>
          ))
          : (
            <div className="text-center py-14">
              <Icon name="Newspaper" size={36} color="rgba(255,255,255,0.15)" className="mx-auto mb-3" />
              <p className="text-white/30 text-sm">Нет новостей по выбранной категории</p>
            </div>
          )
        }
      </div>
    </div>
  );
}

function getCatColor(cat: string): string {
  return CAT_COLORS[cat] || "#64748b";
}
