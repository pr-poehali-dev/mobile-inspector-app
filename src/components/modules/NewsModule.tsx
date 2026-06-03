import { useState, useMemo } from "react";
import Icon from "@/components/ui/icon";
import ModuleHeader from "@/components/ModuleHeader";
import { useApp } from "@/context/AppContext";

interface Props { onBack: () => void; }

interface NewsItem {
  id: number;
  title: string;
  text: string;
  category: string;
  date: string;
  authorId: number;
  authorName: string;
  image: string;
  important: boolean;
  status: "published" | "draft";
}

interface BlogProfile {
  banner: string;
  description: string;
  location: string;
}

const CAT_COLORS: Record<string, string> = {
  "Промышленная безопасность": "#f97316",
  "Охрана труда": "#eab308",
  "Пожарная безопасность": "#ef4444",
  "Информационная безопасность": "#06b6d4",
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

const BANNERS = [
  "linear-gradient(135deg, #1b6fff, #7c3aed)",
  "linear-gradient(135deg, #ef4444, #f59e0b)",
  "linear-gradient(135deg, #10b981, #06b6d4)",
  "linear-gradient(135deg, #8b5cf6, #ec4899)",
];

const INITIAL_NEWS: NewsItem[] = [
  { id: 1, title: "Плановое техобслуживание серверов 10 июня", text: "В период с 02:00 до 05:00 10 июня будет проводиться плановое обслуживание серверной инфраструктуры. Сервисы будут временно недоступны.", category: "Информационная безопасность", date: "02.06.2026", authorId: 4, authorName: "Мария Иванова", image: IMG_GRADIENTS[0], important: true, status: "published" },
  { id: 2, title: "Запускаем новый модуль «ИИ Ассистент»", text: "С сегодняшнего дня доступен умный помощник на основе корпоративной базы знаний. Он ответит на вопросы по документам, чек-листам и новостям.", category: "Иное", date: "01.06.2026", authorId: 4, authorName: "Мария Иванова", image: IMG_GRADIENTS[1], important: false, status: "published" },
  { id: 3, title: "Конференция по безопасности труда — 15 июня", text: "Приглашаем всех сотрудников на ежегодную конференцию по охране труда. Регистрация обязательна. Начало в 10:00 в конференц-зале №2.", category: "Охрана труда", date: "30.05.2026", authorId: 3, authorName: "Пётр Волков", image: IMG_GRADIENTS[2], important: true, status: "published" },
  { id: 4, title: "Новые требования пожарной безопасности", text: "Роструд обновил нормативные требования к системам пожарной сигнализации. Все объекты должны пройти аудит до 1 сентября 2026 года.", category: "Пожарная безопасность", date: "25.05.2026", authorId: 3, authorName: "Пётр Волков", image: IMG_GRADIENTS[4], important: false, status: "published" },
];

type ViewMode = "list" | "detail" | "add" | "blog" | "blog_settings" | "request";

export default function NewsModule({ onBack }: Props) {
  const { currentUser, users, hasRole, isAdmin, categories, addRoleRequest, bumpStat } = useApp();
  const NEWS_CATEGORIES = ["Все", ...(categories.news || [])];

  const [news, setNews] = useState<NewsItem[]>(INITIAL_NEWS);
  const [category, setCategory] = useState("Все");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("list");
  const [selected, setSelected] = useState<NewsItem | null>(null);
  const [viewedAuthorId, setViewedAuthorId] = useState<number | null>(null);
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [blogProfiles, setBlogProfiles] = useState<Record<number, BlogProfile>>({
    3: { banner: BANNERS[2], description: "Инженер по пожарной безопасности. Делюсь актуальными новостями отрасли.", location: "Казань" },
    4: { banner: BANNERS[0], description: "Главный редактор корпоративной новостной ленты.", location: "Екатеринбург" },
  });
  const [addForm, setAddForm] = useState({ title: "", text: "", category: (categories.news || [])[0] || "Иное", important: false });
  const [settingsForm, setSettingsForm] = useState<BlogProfile>({ banner: BANNERS[0], description: "", location: currentUser.location });

  const isEditor = isAdmin || hasRole("editor");
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };
  const getCatColor = (c: string) => CAT_COLORS[c] || "#64748b";

  const myNews = useMemo(() => news.filter(n => n.authorId === currentUser.id), [news, currentUser.id]);

  const filtered = useMemo(() => {
    let list = news.filter(n => n.status === "published");
    if (category !== "Все") list = list.filter(n => n.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(n => n.title.toLowerCase().includes(q) || n.text.toLowerCase().includes(q) || n.authorName.toLowerCase().includes(q));
    }
    return list;
  }, [news, category, search]);

  const saveNews = () => {
    if (!addForm.title.trim() || !addForm.text.trim()) return;
    if (editing) {
      setNews(prev => prev.map(n => n.id === editing.id ? { ...n, title: addForm.title, text: addForm.text, category: addForm.category, important: addForm.important } : n));
      showToast("✅ Новость обновлена");
    } else {
      const item: NewsItem = { id: Date.now(), title: addForm.title, text: addForm.text, category: addForm.category, date: new Date().toLocaleDateString("ru-RU"), authorId: currentUser.id, authorName: currentUser.name, image: IMG_GRADIENTS[Math.floor(Math.random() * IMG_GRADIENTS.length)], important: addForm.important, status: isEditor ? "published" : "draft" };
      setNews(prev => [item, ...prev]);
      bumpStat("news", 1);
      showToast(isEditor ? "✅ Новость опубликована!" : "📝 Сохранено в «Мои новости»");
    }
    setAddForm({ title: "", text: "", category: (categories.news || [])[0] || "Иное", important: false });
    setEditing(null);
    setView(isEditor ? "blog" : "list");
  };

  const deleteNews = (id: number) => { setNews(prev => prev.filter(n => n.id !== id)); bumpStat("news", -1); showToast("🗑️ Удалено"); };
  const startEdit = (n: NewsItem) => { setEditing(n); setAddForm({ title: n.title, text: n.text, category: n.category, important: n.important }); setView("add"); };

  // ── REQUEST EDITOR ──
  if (view === "request") return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      {toast && <Toast msg={toast} />}
      <ModuleHeader title="Стать редактором" onBack={() => setView("list")} />
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-8 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}><Icon name="Newspaper" size={36} color="#f59e0b" /></div>
        <div><h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Роль редактора</h2><p className="text-white/50 text-sm leading-relaxed">Получите право вести собственный новостной блог и публиковать новости в общую ленту.</p></div>
        <div className="glass rounded-2xl p-4 text-left space-y-2.5">
          {["Собственный новостной блог", "Баннер и описание блога", "Публикация в общую ленту", "Управление своими новостями"].map((item, i) => (
            <div key={i} className="flex items-center gap-3"><div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,158,11,0.2)' }}><Icon name="Check" size={11} color="#f59e0b" /></div><span className="text-sm text-white/70">{item}</span></div>
          ))}
        </div>
        <button className="btn-primary flex items-center justify-center gap-2" onClick={() => { addRoleRequest("editor"); showToast("📩 Заявка на роль редактора отправлена"); setView("list"); }} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}><Icon name="Send" size={18} />Отправить заявку</button>
      </div>
    </div>
  );

  // ── BLOG SETTINGS ──
  if (view === "blog_settings") return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      {toast && <Toast msg={toast} />}
      <ModuleHeader title="Настройки блога" onBack={() => setView("blog")} icon="Settings" iconColor="#f59e0b" />
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
        <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Баннер блога</label>
          <div className="rounded-2xl h-24 mb-2" style={{ background: settingsForm.banner }} />
          <div className="flex gap-2">{BANNERS.map((b, i) => <button key={i} onClick={() => setSettingsForm(f => ({ ...f, banner: b }))} className="flex-1 h-10 rounded-xl transition-all" style={{ background: b, border: settingsForm.banner === b ? '2px solid white' : '2px solid transparent' }} />)}</div>
        </div>
        <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Описание</label>
          <textarea className="input-field resize-none" rows={3} placeholder="Расскажите о вашем блоге..." value={settingsForm.description} onChange={e => setSettingsForm(f => ({ ...f, description: e.target.value }))} /></div>
        <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Местоположение</label>
          <input className="input-field" placeholder="Город" value={settingsForm.location} onChange={e => setSettingsForm(f => ({ ...f, location: e.target.value }))} /></div>
        <button onClick={() => { setBlogProfiles(prev => ({ ...prev, [currentUser.id]: settingsForm })); showToast("✅ Блог обновлён"); setView("blog"); }} className="btn-primary flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}><Icon name="Check" size={18} />Сохранить</button>
      </div>
    </div>
  );

  // ── BLOG ──
  if (view === "blog") {
    const blogOwnerId = viewedAuthorId ?? currentUser.id;
    const isMyBlog = blogOwnerId === currentUser.id;
    const owner = users.find(u => u.id === blogOwnerId);
    const ownerName = isMyBlog ? currentUser.name : (owner?.name || "Автор");
    const ownerAvatar = isMyBlog ? currentUser.avatar : (owner?.avatar || "?");
    const profile = blogProfiles[blogOwnerId] || { banner: BANNERS[0], description: "Блог редактора", location: owner?.location || "—" };
    const blogNews = news.filter(n => n.authorId === blogOwnerId);

    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        {toast && <Toast msg={toast} />}
        <ModuleHeader title={isMyBlog ? "Мой блог" : "Блог редактора"} onBack={() => { setView("list"); setViewedAuthorId(null); }} icon="Newspaper" iconColor="#f59e0b" />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
          <div className="rounded-2xl overflow-hidden">
            <div className="h-28 relative" style={{ background: profile.banner }}>
              {isMyBlog && <button onClick={() => { setSettingsForm(profile); setView("blog_settings"); }} className="absolute top-3 right-3 px-3 py-1.5 rounded-lg text-xs font-medium text-white flex items-center gap-1.5" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}><Icon name="Settings" size={13} color="white" />Настроить</button>}
            </div>
            <div className="glass-strong p-4 -mt-8 mx-3 rounded-2xl relative">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-lg font-bold text-white border-2 border-white/20" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>{ownerAvatar}</div>
                <div className="flex-1">
                  <h2 className="text-base font-bold text-white">{ownerName}</h2>
                  <p className="text-xs text-white/40 flex items-center gap-1"><Icon name="MapPin" size={10} />{profile.location} · {blogNews.length} новостей</p>
                </div>
              </div>
              {profile.description && <p className="text-sm text-white/60 mt-3">{profile.description}</p>}
            </div>
          </div>

          {isMyBlog && <button onClick={() => { setEditing(null); setView("add"); }} className="btn-primary flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}><Icon name="Plus" size={18} />Добавить новость</button>}

          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider px-1">Новости блога</p>
          {blogNews.map(n => (
            <div key={n.id} className="glass rounded-2xl p-4">
              <div className="flex items-start justify-between mb-2">
                <span className="tag text-xs" style={{ background: `${getCatColor(n.category)}20`, borderColor: `${getCatColor(n.category)}40`, color: getCatColor(n.category) }}>{n.category}</span>
                <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: n.status === "published" ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: n.status === "published" ? '#10b981' : '#f59e0b' }}>{n.status === "published" ? "Опубликовано" : "Черновик"}</span>
              </div>
              <p className="text-sm font-semibold text-white mb-1">{n.title}</p>
              <p className="text-xs text-white/40 mb-2">{n.date}</p>
              {isMyBlog && (
                <div className="flex gap-2 pt-2 border-t border-white/5">
                  <button onClick={() => startEdit(n)} className="flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}><Icon name="Pencil" size={12} />Изменить</button>
                  <button onClick={() => deleteNews(n.id)} className="flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}><Icon name="Trash2" size={12} />Удалить</button>
                </div>
              )}
            </div>
          ))}
          {blogNews.length === 0 && <div className="text-center py-10 text-white/30 text-sm">{isMyBlog ? "Вы ещё не добавляли новостей" : "В блоге пока нет новостей"}</div>}
        </div>
      </div>
    );
  }

  // ── ADD/EDIT ──
  if (view === "add") return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      {toast && <Toast msg={toast} />}
      <ModuleHeader title={editing ? "Редактировать новость" : "Добавить новость"} onBack={() => { setEditing(null); setView(isEditor ? "blog" : "list"); }} icon="Plus" iconColor="#f59e0b" />
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
        <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Заголовок *</label>
          <input className="input-field" placeholder="Введите заголовок..." value={addForm.title} onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))} /></div>
        <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Текст новости *</label>
          <textarea className="input-field resize-none" rows={6} placeholder="Текст статьи..." value={addForm.text} onChange={e => setAddForm(f => ({ ...f, text: e.target.value }))} /></div>
        <div>
          <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Категория</label>
          <div className="flex flex-wrap gap-2">{(categories.news || []).map(cat => (
            <button key={cat} onClick={() => setAddForm(f => ({ ...f, category: cat }))} className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all" style={{ background: addForm.category === cat ? `${getCatColor(cat)}25` : 'rgba(255,255,255,0.06)', border: `1px solid ${addForm.category === cat ? `${getCatColor(cat)}60` : 'rgba(255,255,255,0.1)'}`, color: addForm.category === cat ? getCatColor(cat) : 'rgba(255,255,255,0.5)' }}>{cat}</button>
          ))}</div>
        </div>
        <button onClick={() => setAddForm(f => ({ ...f, important: !f.important }))} className="w-full flex items-center gap-3 p-4 rounded-xl transition-all" style={{ background: addForm.important ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)', border: addForm.important ? '1px solid rgba(239,68,68,0.35)' : '1px solid rgba(255,255,255,0.1)' }}>
          <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: addForm.important ? '#ef4444' : 'transparent', border: addForm.important ? 'none' : '1px solid rgba(255,255,255,0.25)' }}>{addForm.important && <Icon name="Check" size={12} color="white" />}</div>
          <div><p className="text-sm font-medium text-white text-left">Важная новость</p><p className="text-xs text-white/40 text-left">Будет выделена меткой</p></div>
        </button>
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)' }}><Icon name="ImageIcon" size={18} color="rgba(255,255,255,0.4)" /><span className="text-sm text-white/40">Загрузить изображение</span></div>
        {!isEditor && <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}><Icon name="Info" size={15} color="#f59e0b" /><p className="text-xs text-yellow-300/80">Сохранится в черновики. Для публикации нужна роль редактора.</p></div>}
        <button onClick={saveNews} className="btn-primary flex items-center justify-center gap-2" disabled={!addForm.title.trim() || !addForm.text.trim()} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}><Icon name={editing ? "Check" : isEditor ? "Send" : "Save"} size={18} />{editing ? "Сохранить" : isEditor ? "Опубликовать" : "В черновики"}</button>
      </div>
    </div>
  );

  // ── DETAIL ──
  if (view === "detail" && selected) {
    const author = users.find(u => u.id === selected.authorId);
    const authorIsEditor = author?.roles.includes("editor") || author?.roles.includes("admin");
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        <ModuleHeader title={selected.category} onBack={() => setView("list")} />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
          {selected.important && <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}><Icon name="AlertTriangle" size={15} color="#ef4444" /><span className="text-sm text-red-400 font-medium">Важная новость</span></div>}
          <div className="rounded-2xl overflow-hidden" style={{ background: selected.image, aspectRatio: '16/7' }}><div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.2)' }}><Icon name="Newspaper" size={36} color="rgba(255,255,255,0.2)" /></div></div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>{selected.title}</h1>
          <button onClick={() => { if (authorIsEditor) { setViewedAuthorId(selected.authorId); setView("blog"); } }} disabled={!authorIsEditor} className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all hover:bg-white/5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>{author?.avatar || selected.authorName[0]}</div>
            <div className="flex-1"><p className="text-sm font-semibold text-white">{selected.authorName}</p><p className="text-xs text-white/40">{selected.date}{authorIsEditor ? " · Перейти в блог" : ""}</p></div>
            {authorIsEditor && <Icon name="ChevronRight" size={16} color="rgba(255,255,255,0.3)" />}
          </button>
          <div className="glass rounded-2xl p-5"><p className="text-sm text-white/80 leading-relaxed">{selected.text}</p></div>
        </div>
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
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.3)' }}><Icon name="Newspaper" size={16} color="#f59e0b" /></div>
            <h1 className="text-base font-bold text-white flex-1">Новостная лента</h1>
            <button onClick={() => { if (isEditor) { setViewedAuthorId(null); setView("blog"); } else { setView("request"); } }} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
              <Icon name="BookOpen" size={18} color={isEditor ? "#f59e0b" : "rgba(255,255,255,0.6)"} />
            </button>
            <button onClick={() => { setEditing(null); setView("add"); }} className="p-2 rounded-xl hover:bg-white/10 transition-colors"><Icon name="Plus" size={20} color="white" /></button>
          </div>
          <div className="relative">
            <Icon name="Search" size={15} color="rgba(255,255,255,0.3)" className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input className="input-field pl-9 pr-9 py-2.5 text-sm" placeholder="Поиск по заголовку, тексту, автору..." value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><Icon name="X" size={15} color="rgba(255,255,255,0.4)" /></button>}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-3 pb-8 space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {NEWS_CATEGORIES.map(cat => {
            const color = cat === "Все" ? "#f59e0b" : getCatColor(cat);
            return <button key={cat} onClick={() => setCategory(cat)} className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all" style={{ background: category === cat ? `${color}25` : 'rgba(255,255,255,0.06)', border: `1px solid ${category === cat ? `${color}60` : 'rgba(255,255,255,0.1)'}`, color: category === cat ? color : 'rgba(255,255,255,0.5)' }}>{cat}</button>;
          })}
        </div>
        {myNews.filter(n => n.status === "draft").length > 0 && !search && category === "Все" && (
          <button onClick={() => { setViewedAuthorId(null); setView(isEditor ? "blog" : "list"); }} className="w-full flex items-center gap-2 p-3 rounded-xl text-left" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <Icon name="FileText" size={15} color="#f59e0b" />
            <span className="text-xs text-yellow-300 flex-1">У вас {myNews.filter(n => n.status === "draft").length} черновиков в «Мои новости»</span>
          </button>
        )}
        {filtered.length > 0
          ? filtered.map((item, i) => (
            <button key={item.id} onClick={() => { setSelected(item); setView("detail"); }} className="w-full text-left glass rounded-2xl overflow-hidden animate-fade-up opacity-0 hover:border-white/20 transition-all" style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'forwards' }}>
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
                  <span className="flex items-center gap-1"><Icon name="User" size={10} />{item.authorName}</span>
                  <span className="flex items-center gap-1"><Icon name="Calendar" size={10} />{item.date}</span>
                  <Icon name="ChevronRight" size={14} color="rgba(255,255,255,0.2)" className="ml-auto" />
                </div>
              </div>
            </button>
          ))
          : <div className="text-center py-14"><Icon name="Newspaper" size={36} color="rgba(255,255,255,0.15)" className="mx-auto mb-3" /><p className="text-white/30 text-sm">Нет новостей по выбранной категории</p></div>
        }
      </div>
    </div>
  );
}

function Toast({ msg }: { msg: string }) {
  return <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl text-sm font-medium text-white animate-fade-up" style={{ background: 'rgba(245,158,11,0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(245,158,11,0.5)', animationFillMode: 'forwards' }}>{msg}</div>;
}
