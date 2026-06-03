import { useState, useMemo } from "react";
import { User } from "@/pages/Index";
import Icon from "@/components/ui/icon";
import ModuleHeader from "@/components/ModuleHeader";

interface Props {
  onBack: () => void;
  user: User;
}

interface VideoAuthor {
  id: number;
  name: string;
  avatar: string;
  role: "admin" | "content_maker";
}

interface VideoItem {
  id: number;
  title: string;
  description: string;
  hashtags: string[];
  category: string;
  author: VideoAuthor;
  views: number;
  date: string;
  duration: string;
  thumbnail: string;
}

const VIDEO_CATEGORIES = [
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
  "Налоговая безопасность",
  "Иное",
];

const THUMB_COLORS = [
  "linear-gradient(135deg, #1b3a7a, #0f2050)",
  "linear-gradient(135deg, #7a1b1b, #501010)",
  "linear-gradient(135deg, #1a5c40, #0d3a28)",
  "linear-gradient(135deg, #7a5c10, #503c08)",
  "linear-gradient(135deg, #4a1b7a, #2d1050)",
  "linear-gradient(135deg, #7a1b50, #501030)",
];

const DEMO_AUTHORS: VideoAuthor[] = [
  { id: 1, name: "Иван Смирнов", avatar: "ИС", role: "admin" },
  { id: 2, name: "Анна Козлова", avatar: "АК", role: "content_maker" },
  { id: 3, name: "Пётр Волков", avatar: "ПВ", role: "content_maker" },
  { id: 4, name: "Мария Иванова", avatar: "МИ", role: "admin" },
];

const INITIAL_VIDEOS: VideoItem[] = [
  {
    id: 1, title: "Введение в систему промышленной безопасности",
    description: "Полный обзор основных требований и нормативов в области промышленной безопасности на производстве.",
    hashtags: ["#промбезопасность", "#инструктаж", "#нормативы"],
    category: "Промышленная безопасность",
    author: DEMO_AUTHORS[0], views: 1420, date: "01.06.2026", duration: "12:34",
    thumbnail: THUMB_COLORS[0],
  },
  {
    id: 2, title: "Охрана труда на высоте: правила и требования",
    description: "Детальный разбор требований при работах на высоте, применение СИЗ, страховочные системы.",
    hashtags: ["#охрана_труда", "#высота", "#сиз", "#инструктаж"],
    category: "Охрана труда",
    author: DEMO_AUTHORS[1], views: 876, date: "30.05.2026", duration: "18:20",
    thumbnail: THUMB_COLORS[1],
  },
  {
    id: 3, title: "Пожарная безопасность: действия при эвакуации",
    description: "Правила поведения при пожаре, порядок эвакуации из здания, применение первичных средств тушения.",
    hashtags: ["#пожарная_безопасность", "#эвакуация", "#огнетушитель"],
    category: "Пожарная безопасность",
    author: DEMO_AUTHORS[2], views: 2341, date: "28.05.2026", duration: "08:15",
    thumbnail: THUMB_COLORS[2],
  },
  {
    id: 4, title: "Инструктаж по охране труда 2024",
    description: "Актуальный вводный инструктаж по охране труда для всех категорий работников предприятия.",
    hashtags: ["#охрана_труда", "#инструктаж_2024", "#от"],
    category: "Охрана труда",
    author: DEMO_AUTHORS[3], views: 5120, date: "25.05.2026", duration: "35:00",
    thumbnail: THUMB_COLORS[3],
  },
  {
    id: 5, title: "Экологическая безопасность на производстве",
    description: "Нормативы обращения с отходами производства, охрана окружающей среды, отчётность.",
    hashtags: ["#экология", "#окружающая_среда", "#отходы"],
    category: "Экологическая безопасность",
    author: DEMO_AUTHORS[1], views: 643, date: "22.05.2026", duration: "22:10",
    thumbnail: THUMB_COLORS[4],
  },
  {
    id: 6, title: "Информационная безопасность: защита персональных данных",
    description: "152-ФЗ в деталях: обработка ПД, защита от утечек, организация работы с персональными данными.",
    hashtags: ["#инфобез", "#персональные_данные", "#152фз"],
    category: "Информационная безопасность",
    author: DEMO_AUTHORS[2], views: 1890, date: "20.05.2026", duration: "28:45",
    thumbnail: THUMB_COLORS[5],
  },
];

type TabType = "all" | "favorites";
type ViewType = "feed" | "player" | "channel" | "add" | "request" | "admin_requests";

export default function VideoModule({ onBack, user }: Props) {
  const [videos, setVideos] = useState<VideoItem[]>(INITIAL_VIDEOS);
  const [tab, setTab] = useState<TabType>("all");
  const [category, setCategory] = useState("Все");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<number[]>([2]);
  const [view, setView] = useState<ViewType>("feed");
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [channelAuthor, setChannelAuthor] = useState<VideoAuthor | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [requests, setRequests] = useState([
    { id: 1, name: "Сергей Петров", phone: "+7 999 123-45-67", date: "02.06.2026", status: "pending" as "pending" | "approved" | "rejected" },
    { id: 2, name: "Елена Васильева", phone: "+7 912 876-54-32", date: "01.06.2026", status: "pending" as "pending" | "approved" | "rejected" },
  ]);
  const [addForm, setAddForm] = useState({
    title: "", description: "", category: "Охрана труда",
    hashtags: "", youtubeUrl: "", file: "",
  });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };
  const toggleFav = (id: number) => setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  const canAdd = user.role === "admin" || user.role === "content_maker";

  const filtered = useMemo(() => {
    let list = tab === "favorites" ? videos.filter(v => favorites.includes(v.id)) : videos;
    if (category !== "Все") list = list.filter(v => v.category === category);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(v =>
        v.title.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.hashtags.some(h => h.toLowerCase().includes(q)) ||
        v.author.name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [videos, tab, category, search, favorites]);

  const channelVideos = useMemo(() =>
    channelAuthor ? videos.filter(v => v.author.id === channelAuthor.id) : [],
    [videos, channelAuthor]
  );

  const submitAdd = () => {
    if (!addForm.title.trim()) return;
    const me: VideoAuthor = {
      id: 99, name: user.name,
      avatar: user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
      role: user.role as "admin" | "content_maker",
    };
    setVideos(prev => [{
      id: Date.now(), title: addForm.title, description: addForm.description,
      hashtags: addForm.hashtags.split(/\s+/).filter(Boolean).map(h => h.startsWith("#") ? h : `#${h}`),
      category: addForm.category, author: me, views: 0,
      date: new Date().toLocaleDateString("ru-RU"), duration: "—",
      thumbnail: THUMB_COLORS[Math.floor(Math.random() * THUMB_COLORS.length)],
    }, ...prev]);
    setAddForm({ title: "", description: "", category: "Охрана труда", hashtags: "", youtubeUrl: "", file: "" });
    setView("feed");
    showToast("✅ Видео добавлено в ленту!");
  };

  // ── ADD FORM ────────────────────────────────────────────────────────────────
  if (view === "add") return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      <ModuleHeader title="Добавить видео" onBack={() => setView("feed")} icon="Upload" iconColor="#ef4444" />
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
        <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Название *</label>
          <input className="input-field" placeholder="Введите название..." value={addForm.title} onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))} /></div>
        <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Описание</label>
          <textarea className="input-field resize-none" rows={3} placeholder="Краткое описание содержания..." value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} /></div>
        <div>
          <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Категория</label>
          <div className="flex flex-wrap gap-2">
            {VIDEO_CATEGORIES.slice(1).map(cat => (
              <button key={cat} onClick={() => setAddForm(f => ({ ...f, category: cat }))} className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all" style={{ background: addForm.category === cat ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.06)', border: `1px solid ${addForm.category === cat ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`, color: addForm.category === cat ? '#ef4444' : 'rgba(255,255,255,0.5)' }}>{cat}</button>
            ))}
          </div>
        </div>
        <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Хэштеги (через пробел)</label>
          <input className="input-field" placeholder="#охрана_труда #инструктаж" value={addForm.hashtags} onChange={e => setAddForm(f => ({ ...f, hashtags: e.target.value }))} /></div>
        <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Ссылка YouTube / Vimeo</label>
          <input className="input-field" placeholder="https://youtube.com/watch?v=..." value={addForm.youtubeUrl} onChange={e => setAddForm(f => ({ ...f, youtubeUrl: e.target.value }))} /></div>
        <button onClick={() => setAddForm(f => ({ ...f, file: f.file ? "" : "video.mp4" }))} className="w-full flex flex-col items-center gap-2 p-5 rounded-xl cursor-pointer transition-colors" style={{ background: addForm.file ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)', border: addForm.file ? '2px solid rgba(239,68,68,0.4)' : '2px dashed rgba(255,255,255,0.15)' }}>
          <Icon name="Upload" size={24} color={addForm.file ? "#ef4444" : "rgba(255,255,255,0.3)"} />
          <span className="text-xs" style={{ color: addForm.file ? '#ef4444' : 'rgba(255,255,255,0.4)' }}>{addForm.file ? `✓ ${addForm.file} выбран` : "Загрузить файл MP4 (до 2 ГБ)"}</span>
        </button>
        <button onClick={submitAdd} className="btn-primary flex items-center justify-center gap-2" disabled={!addForm.title.trim()}>
          <Icon name="Upload" size={18} />Опубликовать видео
        </button>
      </div>
    </div>
  );

  // ── REQUEST ROLE ────────────────────────────────────────────────────────────
  if (view === "request") return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      <ModuleHeader title="Стать контентмейкером" onBack={() => setView("feed")} />
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-8 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <Icon name="Video" size={36} color="#ef4444" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Публикуйте свои видео</h2>
          <p className="text-white/50 text-sm leading-relaxed">Получите роль контентмейкера и добавляйте обучающие видео в общую ленту. Запрос будет рассмотрен администратором.</p>
        </div>
        <div className="glass rounded-2xl p-4 text-left space-y-2.5">
          {["Добавлять видео в общую ленту", "Вести свой канал", "Добавлять хэштеги и категории", "Видеть статистику просмотров"].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.2)' }}>
                <Icon name="Check" size={11} color="#ef4444" />
              </div>
              <span className="text-sm text-white/70">{item}</span>
            </div>
          ))}
        </div>
        <button className="btn-primary flex items-center justify-center gap-2" onClick={() => { showToast("📩 Запрос отправлен администратору"); setView("feed"); }}>
          <Icon name="Send" size={18} />Отправить заявку
        </button>
      </div>
    </div>
  );

  // ── ADMIN REQUESTS ──────────────────────────────────────────────────────────
  if (view === "admin_requests") return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      {toast && <Toast msg={toast} />}
      <ModuleHeader title="Заявки на контентмейкера" onBack={() => setView("feed")} icon="Users" iconColor="#ef4444" />
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-3">
        {requests.map((r, i) => (
          <div key={r.id} className="glass rounded-2xl p-4 animate-fade-up opacity-0" style={{ animationDelay: `${i * 0.06}s`, animationFillMode: 'forwards' }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-white">{r.name}</p>
                <p className="text-xs text-white/40">{r.phone} · {r.date}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-lg font-medium" style={{
                background: r.status === "pending" ? 'rgba(245,158,11,0.15)' : r.status === "approved" ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                color: r.status === "pending" ? '#f59e0b' : r.status === "approved" ? '#10b981' : '#ef4444',
              }}>{r.status === "pending" ? "Ожидает" : r.status === "approved" ? "Одобрен" : "Отклонён"}</span>
            </div>
            {r.status === "pending" && (
              <div className="flex gap-2">
                <button onClick={() => { setRequests(prev => prev.map(x => x.id === r.id ? { ...x, status: "approved" as const } : x)); showToast("✅ Доступ выдан"); }} className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5" style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#10b981' }}>
                  <Icon name="Check" size={13} />Одобрить
                </button>
                <button onClick={() => { setRequests(prev => prev.map(x => x.id === r.id ? { ...x, status: "rejected" as const } : x)); showToast("Запрос отклонён"); }} className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                  <Icon name="X" size={13} />Отклонить
                </button>
              </div>
            )}
          </div>
        ))}
        {requests.every(r => r.status !== "pending") && (
          <div className="text-center py-12">
            <Icon name="CheckCircle" size={36} color="rgba(16,185,129,0.4)" className="mx-auto mb-3" />
            <p className="text-white/30 text-sm">Все заявки обработаны</p>
          </div>
        )}
      </div>
    </div>
  );

  // ── CHANNEL ─────────────────────────────────────────────────────────────────
  if (view === "channel" && channelAuthor) return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      <ModuleHeader title="Канал" onBack={() => { setView("feed"); setChannelAuthor(null); }} />
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
        <div className="glass-strong rounded-2xl p-5 flex items-center gap-4 animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl font-bold text-white" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>{channelAuthor.avatar}</div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white">{channelAuthor.name}</h2>
            <span className="tag text-xs mt-1 inline-block" style={{ background: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }}>
              {channelAuthor.role === "admin" ? "Администратор" : "Контентмейкер"}
            </span>
            <p className="text-xs text-white/40 mt-1">{channelVideos.length} видео · {channelVideos.reduce((s, v) => s + v.views, 0).toLocaleString("ru-RU")} просмотров</p>
          </div>
        </div>
        {channelVideos.map((v, i) => (
          <VideoCard key={v.id} video={v} isFav={favorites.includes(v.id)} onToggleFav={() => toggleFav(v.id)}
            onPlay={() => { setSelectedVideo(v); setView("player"); setIsPlaying(false); }}
            onAuthorClick={() => {}} onHashtagClick={tag => { setSearch(tag); setView("feed"); setChannelAuthor(null); }}
            animDelay={i * 0.06} />
        ))}
        {channelVideos.length === 0 && <div className="text-center py-12 text-white/30 text-sm">Нет видео на канале</div>}
      </div>
    </div>
  );

  // ── PLAYER ──────────────────────────────────────────────────────────────────
  if (view === "player" && selectedVideo) return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      <ModuleHeader title={selectedVideo.title} onBack={() => setView(channelAuthor ? "channel" : "feed")} subtitle={selectedVideo.author.name} />
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
        <div className="rounded-2xl overflow-hidden relative" style={{ background: selectedVideo.thumbnail, aspectRatio: '16/9', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <button onClick={() => setIsPlaying(p => !p)} className="w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
              <Icon name={isPlaying ? "Pause" : "Play"} size={28} color="white" />
            </button>
          </div>
          <span className="absolute top-3 right-3 tag text-xs">{selectedVideo.category}</span>
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <div className="h-1 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: isPlaying ? '40%' : '0%', background: 'linear-gradient(90deg, #ef4444, #f97316)' }} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-white/50 text-sm"><Icon name="Eye" size={14} />{selectedVideo.views.toLocaleString("ru-RU")}</span>
          <span className="flex items-center gap-1.5 text-white/50 text-sm"><Icon name="Calendar" size={14} />{selectedVideo.date}</span>
          <button onClick={() => toggleFav(selectedVideo.id)} className="ml-auto flex items-center gap-1.5 text-sm transition-all active:scale-90" style={{ color: favorites.includes(selectedVideo.id) ? '#f59e0b' : 'rgba(255,255,255,0.5)' }}>
            <Icon name="Star" size={16} color={favorites.includes(selectedVideo.id) ? '#f59e0b' : 'rgba(255,255,255,0.4)'} />
            {favorites.includes(selectedVideo.id) ? "В избранном" : "В избранное"}
          </button>
        </div>
        <button onClick={() => { setChannelAuthor(selectedVideo.author); setView("channel"); }} className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all hover:bg-white/5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>{selectedVideo.author.avatar}</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">{selectedVideo.author.name}</p>
            <p className="text-xs text-white/40">Перейти на канал</p>
          </div>
          <Icon name="ChevronRight" size={16} color="rgba(255,255,255,0.3)" />
        </button>
        <div className="glass rounded-2xl p-4">
          <p className="text-sm text-white/70 leading-relaxed mb-3">{selectedVideo.description}</p>
          <div className="flex flex-wrap gap-2">
            {selectedVideo.hashtags.map(tag => (
              <button key={tag} onClick={() => { setSearch(tag); setView("feed"); }} className="text-xs px-2 py-1 rounded-lg transition-colors hover:text-blue-300" style={{ background: 'rgba(27,111,255,0.12)', border: '1px solid rgba(27,111,255,0.25)', color: '#4d8fff' }}>{tag}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ── MAIN FEED ───────────────────────────────────────────────────────────────
  const pendingCount = requests.filter(r => r.status === "pending").length;

  return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      {toast && <Toast msg={toast} />}

      {/* Sticky header */}
      <div className="glass border-b border-white/10 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto space-y-3">
          {/* Top row */}
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/10 transition-colors flex-shrink-0">
              <Icon name="ArrowLeft" size={20} color="white" />
            </button>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <Icon name="Play" size={16} color="#ef4444" />
            </div>
            <h1 className="text-base font-bold text-white flex-1">Видео</h1>
            {user.role === "admin" && (
              <button onClick={() => setView("admin_requests")} className="relative p-2 rounded-xl hover:bg-white/10 transition-colors">
                <Icon name="Users" size={18} color="rgba(255,255,255,0.6)" />
                {pendingCount > 0 && <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold" style={{ background: '#ef4444', fontSize: '10px' }}>{pendingCount}</span>}
              </button>
            )}
            {canAdd && (
              <button onClick={() => setView("add")} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
                <Icon name="Plus" size={20} color="white" />
              </button>
            )}
          </div>
          {/* Search */}
          <div className="relative">
            <Icon name="Search" size={15} color="rgba(255,255,255,0.3)" className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input className="input-field pl-9 pr-9 py-2.5 text-sm" placeholder="Поиск по названию, #хэштегу, автору..." value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><Icon name="X" size={15} color="rgba(255,255,255,0.4)" /></button>}
          </div>
          {/* Tabs */}
          <div className="flex gap-2">
            {(["all", "favorites"] as TabType[]).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${tab === t ? "text-white" : "text-white/50"}`}
                style={{ background: tab === t ? (t === "all" ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#f59e0b,#d97706)') : 'rgba(255,255,255,0.06)', border: `1px solid ${tab === t ? (t === "all" ? 'rgba(239,68,68,0.5)' : 'rgba(245,158,11,0.5)') : 'rgba(255,255,255,0.1)'}` }}>
                {t === "all" ? "Все видео" : <><Icon name="Star" size={14} color={tab === t ? "white" : "rgba(255,255,255,0.4)"} />Избранное {favorites.length > 0 && <span className="opacity-70 text-xs">({favorites.length})</span>}</>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-3 pb-8 space-y-3">
        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {VIDEO_CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)} className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all" style={{ background: category === cat ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'rgba(255,255,255,0.06)', border: `1px solid ${category === cat ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`, color: category === cat ? 'white' : 'rgba(255,255,255,0.5)' }}>{cat}</button>
          ))}
        </div>

        {(search || category !== "Все") && (
          <p className="text-xs text-white/40 px-1">Найдено: {filtered.length} видео{search && ` по «${search}»`}</p>
        )}

        {filtered.length > 0
          ? filtered.map((v, i) => (
            <VideoCard key={v.id} video={v} isFav={favorites.includes(v.id)} onToggleFav={() => toggleFav(v.id)}
              onPlay={() => { setSelectedVideo(v); setView("player"); setIsPlaying(false); }}
              onAuthorClick={a => { setChannelAuthor(a); setView("channel"); }}
              onHashtagClick={tag => setSearch(tag)} animDelay={i * 0.05} />
          ))
          : <EmptyState text={tab === "favorites" ? "Вы ещё не добавили видео в избранное" : "Ничего не найдено"} />
        }

        {!canAdd && user.role !== "admin" && tab === "all" && !search && category === "Все" && (
          <button onClick={() => setView("request")} className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all mt-2" style={{ background: 'rgba(239,68,68,0.07)', border: '1px dashed rgba(239,68,68,0.3)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.15)' }}><Icon name="Video" size={18} color="#ef4444" /></div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Хотите публиковать видео?</p>
              <p className="text-xs text-white/40">Запросить роль контентмейкера</p>
            </div>
            <Icon name="ChevronRight" size={16} color="rgba(239,68,68,0.5)" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── CARD ────────────────────────────────────────────────────────────────────

interface CardProps {
  video: VideoItem;
  isFav: boolean;
  onToggleFav: () => void;
  onPlay: () => void;
  onAuthorClick: (a: VideoAuthor) => void;
  onHashtagClick: (tag: string) => void;
  animDelay?: number;
}

function VideoCard({ video, isFav, onToggleFav, onPlay, onAuthorClick, onHashtagClick, animDelay = 0 }: CardProps) {
  return (
    <div className="rounded-2xl overflow-hidden animate-fade-up opacity-0 transition-all" style={{ animationDelay: `${animDelay}s`, animationFillMode: 'forwards', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <button onClick={onPlay} className="w-full relative block" style={{ aspectRatio: '16/7', background: video.thumbnail }}>
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
            <Icon name="Play" size={18} color="white" />
          </div>
        </div>
        <span className="absolute bottom-2 right-2 text-xs text-white font-mono px-2 py-0.5 rounded-lg" style={{ background: 'rgba(0,0,0,0.65)' }}>{video.duration}</span>
        <span className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-lg font-medium" style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.85)' }}>{video.category.split(" ")[0]}</span>
      </button>
      <div className="p-3">
        <button onClick={onPlay} className="text-sm font-semibold text-white text-left leading-snug mb-2 hover:text-red-300 transition-colors block w-full">{video.title}</button>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {video.hashtags.slice(0, 3).map(tag => (
            <button key={tag} onClick={() => onHashtagClick(tag)} className="text-xs px-2 py-0.5 rounded-lg transition-colors hover:text-blue-300" style={{ background: 'rgba(27,111,255,0.1)', border: '1px solid rgba(27,111,255,0.2)', color: '#4d8fff' }}>{tag}</button>
          ))}
          {video.hashtags.length > 3 && <span className="text-xs text-white/25 self-center">+{video.hashtags.length - 3}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onAuthorClick(video.author)} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity flex-shrink-0">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', fontSize: '9px' }}>{video.author.avatar}</div>
            <span className="text-xs text-white/60 hover:text-white/80 transition-colors">{video.author.name}</span>
          </button>
          <span className="flex items-center gap-1 text-white/30 text-xs"><Icon name="Eye" size={10} />{video.views.toLocaleString("ru-RU")}</span>
          <span className="text-white/20 text-xs ml-auto">{video.date}</span>
          <button onClick={e => { e.stopPropagation(); onToggleFav(); }} className="p-1.5 rounded-lg transition-all active:scale-90 flex-shrink-0" style={{ background: isFav ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)' }}>
            <Icon name="Star" size={14} color={isFav ? '#f59e0b' : 'rgba(255,255,255,0.3)'} />
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-14">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <Icon name="VideoOff" size={28} color="rgba(255,255,255,0.2)" />
      </div>
      <p className="text-white/30 text-sm">{text}</p>
    </div>
  );
}

function Toast({ msg }: { msg: string }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl text-sm font-medium text-white animate-fade-up" style={{ background: 'rgba(239,68,68,0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(239,68,68,0.5)', animationFillMode: 'forwards' }}>
      {msg}
    </div>
  );
}
