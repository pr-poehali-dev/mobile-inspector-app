import { useState, useMemo, useRef } from "react";
import Icon from "@/components/ui/icon";
import ModuleHeader from "@/components/ModuleHeader";
import AdminBlockButton from "@/components/AdminBlockButton";
import { useApp } from "@/context/AppContext";

interface Props { onBack: () => void; }

interface VideoAuthor {
  id: number;
  name: string;
  avatar: string;
  role: "admin" | "content_maker";
}

interface Comment {
  id: number;
  author: string;
  text: string;
  time: string;
}

interface VideoItem {
  id: number;
  title: string;
  description: string;
  hashtags: string[];
  category: string;
  author: VideoAuthor;
  views: number;
  likes: number;
  favoritedBy: number;
  date: string;
  duration: string;
  thumbnail: string;
  bannerImage?: string; // загруженный баннер видео (data-url)
  comments: Comment[];
}

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
  { id: 1, title: "Введение в систему промышленной безопасности", description: "Полный обзор основных требований и нормативов в области промышленной безопасности на производстве.", hashtags: ["#промбезопасность", "#инструктаж", "#нормативы"], category: "Промышленная безопасность", author: DEMO_AUTHORS[0], views: 1420, likes: 89, favoritedBy: 34, date: "01.06.2026", duration: "12:34", thumbnail: THUMB_COLORS[0], comments: [{ id: 1, author: "Сергей К.", text: "Очень полезное видео, спасибо!", time: "2 дня назад" }] },
  { id: 2, title: "Охрана труда на высоте: правила и требования", description: "Детальный разбор требований при работах на высоте, применение СИЗ, страховочные системы.", hashtags: ["#охрана_труда", "#высота", "#сиз", "#инструктаж"], category: "Охрана труда", author: DEMO_AUTHORS[1], views: 876, likes: 52, favoritedBy: 21, date: "30.05.2026", duration: "18:20", thumbnail: THUMB_COLORS[1], comments: [] },
  { id: 3, title: "Пожарная безопасность: действия при эвакуации", description: "Правила поведения при пожаре, порядок эвакуации из здания, применение первичных средств тушения.", hashtags: ["#пожарная_безопасность", "#эвакуация", "#огнетушитель"], category: "Пожарная безопасность", author: DEMO_AUTHORS[2], views: 2341, likes: 167, favoritedBy: 78, date: "28.05.2026", duration: "08:15", thumbnail: THUMB_COLORS[2], comments: [{ id: 1, author: "Ольга М.", text: "Важная тема для всех.", time: "1 день назад" }, { id: 2, author: "Дмитрий П.", text: "Добавьте про огнетушители подробнее", time: "5 часов назад" }] },
  { id: 4, title: "Инструктаж по охране труда 2024", description: "Актуальный вводный инструктаж по охране труда для всех категорий работников предприятия.", hashtags: ["#охрана_труда", "#инструктаж_2024", "#от"], category: "Охрана труда", author: DEMO_AUTHORS[3], views: 5120, likes: 312, favoritedBy: 145, date: "25.05.2026", duration: "35:00", thumbnail: THUMB_COLORS[3], comments: [] },
  { id: 5, title: "Экологическая безопасность на производстве", description: "Нормативы обращения с отходами производства, охрана окружающей среды, отчётность.", hashtags: ["#экология", "#окружающая_среда", "#отходы"], category: "Экологическая безопасность", author: DEMO_AUTHORS[1], views: 643, likes: 41, favoritedBy: 18, date: "22.05.2026", duration: "22:10", thumbnail: THUMB_COLORS[4], comments: [] },
  { id: 6, title: "Информационная безопасность: защита персональных данных", description: "152-ФЗ в деталях: обработка ПД, защита от утечек, организация работы с персональными данными.", hashtags: ["#инфобез", "#персональные_данные", "#152фз"], category: "Информационная безопасность", author: DEMO_AUTHORS[2], views: 1890, likes: 124, favoritedBy: 56, date: "20.05.2026", duration: "28:45", thumbnail: THUMB_COLORS[5], comments: [] },
];

type TabType = "all" | "favorites";
type ViewType = "feed" | "player" | "channel" | "add" | "request" | "admin_requests" | "studio" | "payment";

const CONTENT_MAKER_PRICE = 4999;

export default function VideoModule({ onBack }: Props) {
  const { currentUser, hasRole, isAdmin, categories, addRoleRequest, roleRequests, resolveRoleRequest, payForRole, paymentServices, toggleSubscription, bumpStat, isContentBlocked } = useApp();
  const VIDEO_CATEGORIES = ["Все", ...(categories.video || [])];

  const [videos, setVideos] = useState<VideoItem[]>(INITIAL_VIDEOS);
  const [tab, setTab] = useState<TabType>("all");
  const [category, setCategory] = useState("Все");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<number[]>([2]);
  const [likedVideos, setLikedVideos] = useState<number[]>([]);
  const [subscribedAuthors, setSubscribedAuthors] = useState<number[]>([]);
  const [view, setView] = useState<ViewType>("feed");
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [channelAuthor, setChannelAuthor] = useState<VideoAuthor | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);

  const [addForm, setAddForm] = useState({ title: "", description: "", category: (categories.video || [])[1] || "Охрана труда", hashtags: "", youtubeUrl: "", file: "", bannerImage: "" });
  const videoFileRef = useRef<HTMLInputElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);
  const [requestPhone, setRequestPhone] = useState(currentUser.phone || "");
  const [requestAgreed, setRequestAgreed] = useState(false);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };
  const canAdd = isAdmin || hasRole("content_maker");

  // Заявка текущего пользователя на роль контентмейкера
  const myCMRequest = roleRequests.filter(r => r.userId === currentUser.id && r.role === "content_maker").slice(-1)[0];
  const cmService = paymentServices.find(s => s.name.toLowerCase().includes("контентмейкер")) || null;

  const handleVideoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setAddForm(prev => ({ ...prev, file: f.name }));
    e.target.value = "";
  };
  const handleBannerFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setAddForm(prev => ({ ...prev, bannerImage: reader.result as string }));
    reader.readAsDataURL(f);
    e.target.value = "";
  };
  const pendingVideoReqs = roleRequests.filter(r => r.status === "pending" && r.role === "content_maker");

  const myAuthorId = 99;
  const meAsAuthor: VideoAuthor = { id: myAuthorId, name: currentUser.name, avatar: currentUser.avatar, role: isAdmin ? "admin" : "content_maker" };

  const toggleFav = (v: VideoItem) => {
    const isFav = favorites.includes(v.id);
    setFavorites(prev => isFav ? prev.filter(f => f !== v.id) : [...prev, v.id]);
    setVideos(prev => prev.map(x => x.id === v.id ? { ...x, favoritedBy: x.favoritedBy + (isFav ? -1 : 1) } : x));
  };

  const toggleLike = (v: VideoItem) => {
    const liked = likedVideos.includes(v.id);
    setLikedVideos(prev => liked ? prev.filter(l => l !== v.id) : [...prev, v.id]);
    setVideos(prev => prev.map(x => x.id === v.id ? { ...x, likes: x.likes + (liked ? -1 : 1) } : x));
    if (selectedVideo?.id === v.id) setSelectedVideo(s => s ? { ...s, likes: s.likes + (liked ? -1 : 1) } : s);
  };

  const openVideo = (v: VideoItem) => {
    setVideos(prev => prev.map(x => x.id === v.id ? { ...x, views: x.views + 1 } : x));
    setSelectedVideo({ ...v, views: v.views + 1 });
    setView("player");
    setIsPlaying(false);
  };

  const addComment = () => {
    if (!commentText.trim() || !selectedVideo) return;
    const c: Comment = { id: Date.now(), author: currentUser.name, text: commentText, time: "только что" };
    setVideos(prev => prev.map(x => x.id === selectedVideo.id ? { ...x, comments: [...x.comments, c] } : x));
    setSelectedVideo(s => s ? { ...s, comments: [...s.comments, c] } : s);
    setCommentText("");
  };

  const filtered = useMemo(() => {
    let list = tab === "favorites" ? videos.filter(v => favorites.includes(v.id)) : videos;
    if (!isAdmin) list = list.filter(v => !isContentBlocked("video", v.id));
    if (category !== "Все") list = list.filter(v => v.category === category);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(v => v.title.toLowerCase().includes(q) || v.description.toLowerCase().includes(q) || v.hashtags.some(h => h.toLowerCase().includes(q)) || v.author.name.toLowerCase().includes(q));
    }
    return list;
  }, [videos, tab, category, search, favorites, isAdmin, isContentBlocked]);

  const channelVideos = useMemo(() => channelAuthor ? videos.filter(v => v.author.id === channelAuthor.id) : [], [videos, channelAuthor]);
  const myVideos = useMemo(() => videos.filter(v => v.author.id === myAuthorId), [videos]);

  const submitAdd = () => {
    if (!addForm.title.trim()) return;
    if (editingVideo) {
      setVideos(prev => prev.map(v => v.id === editingVideo.id ? { ...v, title: addForm.title, description: addForm.description, category: addForm.category, hashtags: addForm.hashtags.split(/\s+/).filter(Boolean).map(h => h.startsWith("#") ? h : `#${h}`), bannerImage: addForm.bannerImage || v.bannerImage } : v));
      showToast("✅ Видео обновлено");
    } else {
      setVideos(prev => [{ id: Date.now(), title: addForm.title, description: addForm.description, hashtags: addForm.hashtags.split(/\s+/).filter(Boolean).map(h => h.startsWith("#") ? h : `#${h}`), category: addForm.category, author: meAsAuthor, views: 0, likes: 0, favoritedBy: 0, date: new Date().toLocaleDateString("ru-RU"), duration: "—", thumbnail: THUMB_COLORS[Math.floor(Math.random() * THUMB_COLORS.length)], bannerImage: addForm.bannerImage || undefined, comments: [] }, ...prev]);
      bumpStat("videos", 1);
      showToast("✅ Видео добавлено в ленту!");
    }
    setAddForm({ title: "", description: "", category: (categories.video || [])[1] || "Охрана труда", hashtags: "", youtubeUrl: "", file: "", bannerImage: "" });
    setEditingVideo(null);
    setView(editingVideo ? "studio" : "feed");
  };

  const deleteVideo = (id: number) => {
    setVideos(prev => prev.filter(v => v.id !== id));
    bumpStat("videos", -1);
    showToast("🗑️ Видео удалено");
  };

  const startEdit = (v: VideoItem) => {
    setEditingVideo(v);
    setAddForm({ title: v.title, description: v.description, category: v.category, hashtags: v.hashtags.join(" "), youtubeUrl: "", file: "", bannerImage: v.bannerImage || "" });
    setView("add");
  };

  // ── ADD / EDIT FORM ──
  if (view === "add") return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      <ModuleHeader title={editingVideo ? "Редактировать видео" : "Добавить видео"} onBack={() => { setEditingVideo(null); setView(editingVideo ? "studio" : "feed"); }} icon="Upload" iconColor="#ef4444" />
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
        <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Название *</label>
          <input className="input-field" placeholder="Введите название..." value={addForm.title} onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))} /></div>
        <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Описание</label>
          <textarea className="input-field resize-none" rows={3} placeholder="Краткое описание..." value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} /></div>
        <div>
          <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Категория</label>
          <div className="flex flex-wrap gap-2">
            {(categories.video || []).map(cat => (
              <button key={cat} onClick={() => setAddForm(f => ({ ...f, category: cat }))} className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all" style={{ background: addForm.category === cat ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.06)', border: `1px solid ${addForm.category === cat ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`, color: addForm.category === cat ? '#ef4444' : 'rgba(255,255,255,0.5)' }}>{cat}</button>
            ))}
          </div>
        </div>
        {/* Баннер видео */}
        <div>
          <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Баннер видео</label>
          <input ref={bannerFileRef} type="file" accept="image/*" className="hidden" onChange={handleBannerFile} />
          {addForm.bannerImage ? (
            <div className="rounded-xl overflow-hidden relative" style={{ aspectRatio: '16/9' }}>
              <img src={addForm.bannerImage} alt="" className="w-full h-full object-cover" />
              <button onClick={() => setAddForm(f => ({ ...f, bannerImage: "" }))} className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}><Icon name="X" size={15} color="white" /></button>
            </div>
          ) : (
            <button type="button" onClick={() => bannerFileRef.current?.click()} className="w-full flex flex-col items-center gap-2 p-5 rounded-xl cursor-pointer" style={{ background: 'rgba(255,255,255,0.04)', border: '2px dashed rgba(255,255,255,0.15)' }}>
              <Icon name="ImagePlus" size={24} color="rgba(255,255,255,0.3)" />
              <span className="text-xs text-white/40">Загрузить обложку (баннер) видео</span>
            </button>
          )}
        </div>
        <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Хэштеги (через пробел)</label>
          <input className="input-field" placeholder="#охрана_труда #инструктаж" value={addForm.hashtags} onChange={e => setAddForm(f => ({ ...f, hashtags: e.target.value }))} /></div>
        <div><label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Ссылка YouTube / Vimeo</label>
          <input className="input-field" placeholder="https://youtube.com/watch?v=..." value={addForm.youtubeUrl} onChange={e => setAddForm(f => ({ ...f, youtubeUrl: e.target.value }))} /></div>
        <input ref={videoFileRef} type="file" accept="video/*,.mp4,.mov,.avi,.mkv" className="hidden" onChange={handleVideoFile} />
        <button type="button" onClick={() => videoFileRef.current?.click()} className="w-full flex flex-col items-center gap-2 p-5 rounded-xl cursor-pointer transition-colors" style={{ background: addForm.file ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)', border: addForm.file ? '2px solid rgba(239,68,68,0.4)' : '2px dashed rgba(255,255,255,0.15)' }}>
          <Icon name="Upload" size={24} color={addForm.file ? "#ef4444" : "rgba(255,255,255,0.3)"} />
          <span className="text-xs" style={{ color: addForm.file ? '#ef4444' : 'rgba(255,255,255,0.4)' }}>{addForm.file ? `✓ ${addForm.file}` : "Загрузить файл MP4 (до 2 ГБ)"}</span>
        </button>
        <button onClick={submitAdd} className="btn-primary flex items-center justify-center gap-2" disabled={!addForm.title.trim()}>
          <Icon name={editingVideo ? "Check" : "Upload"} size={18} />{editingVideo ? "Сохранить изменения" : "Опубликовать видео"}
        </button>
      </div>
    </div>
  );

  // ── STUDIO (content maker cabinet) ──
  if (view === "studio") return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      {toast && <Toast msg={toast} />}
      <ModuleHeader title="Мой канал" onBack={() => setView("feed")} icon="Video" iconColor="#ef4444" subtitle={`${myVideos.length} видео`} />
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
        <div className="glass-strong rounded-2xl p-5 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl font-bold text-white" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>{currentUser.avatar}</div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white">{currentUser.name}</h2>
            <p className="text-xs text-white/40 mt-1">{currentUser.subscribers.length} подписчиков · {myVideos.reduce((s, v) => s + v.views, 0).toLocaleString("ru-RU")} просмотров</p>
            <div className="flex gap-3 mt-2 text-xs">
              <span className="text-white/50"><span className="text-white font-semibold">{myVideos.reduce((s, v) => s + v.likes, 0)}</span> лайков</span>
              <span className="text-white/50"><span className="text-white font-semibold">{myVideos.reduce((s, v) => s + v.favoritedBy, 0)}</span> в избранном</span>
            </div>
          </div>
        </div>
        <button onClick={() => { setEditingVideo(null); setView("add"); }} className="btn-primary flex items-center justify-center gap-2">
          <Icon name="Plus" size={18} />Добавить видео
        </button>
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider px-1">Мои видео</p>
        {myVideos.map(v => (
          <div key={v.id} className="glass rounded-2xl p-3 flex items-center gap-3">
            <div className="w-16 h-12 rounded-xl flex-shrink-0" style={{ background: v.thumbnail }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{v.title}</p>
              <p className="text-xs text-white/40 flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-0.5"><Icon name="Eye" size={10} />{v.views}</span>
                <span className="flex items-center gap-0.5"><Icon name="ThumbsUp" size={10} />{v.likes}</span>
                <span className="flex items-center gap-0.5"><Icon name="Star" size={10} />{v.favoritedBy}</span>
              </p>
            </div>
            <button onClick={() => startEdit(v)} className="p-2 rounded-lg hover:bg-white/10"><Icon name="Pencil" size={15} color="rgba(255,255,255,0.6)" /></button>
            <button onClick={() => deleteVideo(v.id)} className="p-2 rounded-lg hover:bg-white/10"><Icon name="Trash2" size={15} color="rgba(239,68,68,0.7)" /></button>
          </div>
        ))}
        {myVideos.length === 0 && <div className="text-center py-10 text-white/30 text-sm">Вы ещё не добавили видео</div>}
      </div>
    </div>
  );

  // ── REQUEST ROLE ──
  if (view === "request") {
    const phoneDigits = requestPhone.replace(/\D/g, "");
    const canSubmit = phoneDigits.length >= 10 && requestAgreed;
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        {toast && <Toast msg={toast} />}
        <ModuleHeader title="Стать контентмейкером" onBack={() => setView("feed")} />
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-8 space-y-5">
          <div className="text-center space-y-3">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}><Icon name="Video" size={36} color="#ef4444" /></div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Публикуйте свои видео</h2>
              <p className="text-white/50 text-sm leading-relaxed">Получите роль контентмейкера и добавляйте обучающие видео в общую ленту.</p>
            </div>
          </div>

          <div className="glass rounded-2xl p-4 text-left space-y-2.5">
            {["Добавлять видео в ленту", "Вести свой канал", "Получать подписчиков", "Видеть статистику"].map((item, i) => (
              <div key={i} className="flex items-center gap-3"><div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.2)' }}><Icon name="Check" size={11} color="#ef4444" /></div><span className="text-sm text-white/70">{item}</span></div>
            ))}
          </div>

          {/* Стоимость */}
          <div className="glass rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.15)' }}><Icon name="Wallet" size={20} color="#10b981" /></div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Стоимость роли</p>
              <p className="text-xs text-white/40">Оплата после одобрения заявки</p>
            </div>
            <span className="text-lg font-bold text-green-400">{CONTENT_MAKER_PRICE.toLocaleString("ru-RU")} ₽/год</span>
          </div>

          {/* Телефон */}
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Номер телефона для обратной связи *</label>
            <input className="input-field" type="tel" placeholder="+7 (___) ___-__-__" value={requestPhone} onChange={e => setRequestPhone(e.target.value)} />
          </div>

          {/* Юридическая инструкция */}
          <div className="glass rounded-2xl p-4 flex items-start gap-3" style={{ border: '1px solid rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.08)' }}>
            <Icon name="Info" size={16} color="#f59e0b" className="flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-200/80 leading-relaxed">Администрация рассматривает заявку и принимает решение об одобрении или отказе по собственному усмотрению. Решение администрации окончательно и не требует пояснений.</p>
          </div>

          {/* Чекбокс согласия */}
          <button type="button" onClick={() => setRequestAgreed(a => !a)} className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all" style={{ background: requestAgreed ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)', border: requestAgreed ? '1px solid rgba(239,68,68,0.35)' : '1px solid rgba(255,255,255,0.1)' }}>
            <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: requestAgreed ? '#ef4444' : 'transparent', border: requestAgreed ? 'none' : '1px solid rgba(255,255,255,0.25)' }}>{requestAgreed && <Icon name="Check" size={12} color="white" />}</div>
            <span className="text-sm text-white/80">Я ознакомлен и согласен с правилами подачи заявки</span>
          </button>

          <button className="btn-primary flex items-center justify-center gap-2 disabled:opacity-40" disabled={!canSubmit} onClick={() => { addRoleRequest("content_maker", requestPhone, true); showToast("📩 Запрос отправлен администратору"); setRequestAgreed(false); setView("feed"); }}>
            <Icon name="Send" size={18} />Отправить заявку
          </button>
        </div>
      </div>
    );
  }

  // ── PAYMENT (after approval) ──
  if (view === "payment") {
    if (!myCMRequest || myCMRequest.status !== "approved" || myCMRequest.paid) {
      return (
        <div className="min-h-screen relative z-10 animate-fade-in">
          {toast && <Toast msg={toast} />}
          <ModuleHeader title="Оплата роли" onBack={() => setView("feed")} />
          <div className="max-w-2xl mx-auto px-4 pt-8 pb-8 text-center">
            <Icon name="Clock" size={36} color="rgba(255,255,255,0.3)" className="mx-auto mb-3" />
            <p className="text-white/50 text-sm">Оплата станет доступна после одобрения заявки администратором.</p>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        {toast && <Toast msg={toast} />}
        <ModuleHeader title="Оплата роли" onBack={() => setView("feed")} icon="Wallet" iconColor="#10b981" />
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-8 space-y-4">
          <div className="glass rounded-2xl p-4 flex items-center gap-3" style={{ border: '1px solid rgba(16,185,129,0.3)' }}>
            <Icon name="CheckCircle" size={20} color="#10b981" />
            <p className="text-sm text-white/80 flex-1">Заявка одобрена. Оплатите роль для активации доступа.</p>
          </div>

          <div className="glass-strong rounded-2xl p-5 text-center">
            <p className="text-xs text-white/40 uppercase tracking-wider">Роль «Контентмейкер»</p>
            <p className="text-3xl font-bold text-white mt-1">{CONTENT_MAKER_PRICE.toLocaleString("ru-RU")} ₽<span className="text-sm font-normal text-white/40"> / год</span></p>
          </div>

          {cmService ? (
            <div className="glass rounded-2xl p-4 space-y-3">
              <p className="text-sm font-semibold text-white">{cmService.name}</p>
              {cmService.requisites && <p className="text-xs text-white/60 whitespace-pre-line">{cmService.requisites}</p>}
              {cmService.qrUrl && <img src={cmService.qrUrl} alt="QR" className="w-32 h-32 object-contain rounded-lg mx-auto" />}
              {cmService.instruction && <p className="text-xs text-white/40">{cmService.instruction}</p>}
            </div>
          ) : (
            <div className="glass rounded-2xl p-4">
              <p className="text-xs text-white/40 mb-2">Реквизиты для оплаты</p>
              <p className="text-xs text-white/60 whitespace-pre-line">ООО «Мобильный Инспектор»{"\n"}Р/с: 40702810000000012345{"\n"}БИК: 044525225{"\n"}Назначение: оплата роли «Контентмейкер», {requestPhone}</p>
            </div>
          )}

          <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: 'rgba(27,111,255,0.08)', border: '1px solid rgba(27,111,255,0.2)' }}>
            <Icon name="Info" size={14} color="#4d8fff" className="flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-200/70">После подтверждения оплаты администратором роль активируется автоматически, и вы сможете добавлять видео и вести свой канал.</p>
          </div>

          <button className="btn-primary flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }} onClick={() => { payForRole(myCMRequest.id); showToast("✅ Оплата принята, роль активирована!"); setView("studio"); }}>
            <Icon name="CreditCard" size={18} />Я оплатил(а)
          </button>
        </div>
      </div>
    );
  }

  // ── ADMIN REQUESTS ──
  if (view === "admin_requests") return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      {toast && <Toast msg={toast} />}
      <ModuleHeader title="Заявки на публикацию" onBack={() => setView("feed")} icon="Users" iconColor="#ef4444" />
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-3">
        {pendingVideoReqs.map(r => (
          <div key={r.id} className="glass rounded-2xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div><p className="text-sm font-semibold text-white">{r.userName}</p><p className="text-xs text-white/40">Контентмейкер · {r.date}</p></div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { resolveRoleRequest(r.id, true); showToast("✅ Доступ выдан"); }} className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5" style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#10b981' }}><Icon name="Check" size={13} />Одобрить</button>
              <button onClick={() => { resolveRoleRequest(r.id, false); showToast("Отклонено"); }} className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}><Icon name="X" size={13} />Отклонить</button>
            </div>
          </div>
        ))}
        {pendingVideoReqs.length === 0 && <div className="text-center py-12"><Icon name="CheckCircle" size={36} color="rgba(16,185,129,0.4)" className="mx-auto mb-3" /><p className="text-white/30 text-sm">Нет новых заявок</p></div>}
      </div>
    </div>
  );

  // ── CHANNEL ──
  if (view === "channel" && channelAuthor) {
    const isSub = subscribedAuthors.includes(channelAuthor.id);
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        {toast && <Toast msg={toast} />}
        <ModuleHeader title="Канал" onBack={() => { setView("feed"); setChannelAuthor(null); }} />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
          <div className="glass-strong rounded-2xl p-5">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl font-bold text-white" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>{channelAuthor.avatar}</div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-white">{channelAuthor.name}</h2>
                <span className="tag text-xs mt-1 inline-block" style={{ background: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }}>{channelAuthor.role === "admin" ? "Администратор" : "Контентмейкер"}</span>
                <p className="text-xs text-white/40 mt-1">{channelVideos.length} видео · {channelVideos.reduce((s, v) => s + v.views, 0).toLocaleString("ru-RU")} просмотров</p>
              </div>
            </div>
            <button onClick={() => { setSubscribedAuthors(prev => isSub ? prev.filter(a => a !== channelAuthor.id) : [...prev, channelAuthor.id]); showToast(isSub ? "Вы отписались" : "Вы подписались!"); }} className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all" style={{ background: isSub ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #ef4444, #dc2626)', border: isSub ? '1px solid rgba(255,255,255,0.15)' : 'none', color: isSub ? 'rgba(255,255,255,0.6)' : 'white' }}>
              <Icon name={isSub ? "Check" : "Bell"} size={15} color={isSub ? 'rgba(255,255,255,0.6)' : 'white'} />{isSub ? "Вы подписаны" : "Подписаться"}
            </button>
          </div>
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider px-1">Видео канала</p>
          {channelVideos.map((v, i) => <VideoCard key={v.id} video={v} isFav={favorites.includes(v.id)} onToggleFav={() => toggleFav(v)} onPlay={() => openVideo(v)} onAuthorClick={() => {}} onHashtagClick={tag => { setSearch(tag); setView("feed"); setChannelAuthor(null); }} animDelay={i * 0.06} />)}
        </div>
      </div>
    );
  }

  // ── PLAYER ──
  if (view === "player" && selectedVideo) {
    const liked = likedVideos.includes(selectedVideo.id);
    const isFav = favorites.includes(selectedVideo.id);
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        {toast && <Toast msg={toast} />}
        <ModuleHeader title={selectedVideo.title} onBack={() => setView(channelAuthor ? "channel" : "feed")} subtitle={selectedVideo.author.name} />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
          <div className="rounded-2xl overflow-hidden relative" style={{ background: selectedVideo.thumbnail, aspectRatio: '16/9', border: '1px solid rgba(255,255,255,0.1)' }}>
            {selectedVideo.bannerImage && <img src={selectedVideo.bannerImage} alt="" className="absolute inset-0 w-full h-full object-cover" />}
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
              <button onClick={() => setIsPlaying(p => !p)} className="w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}><Icon name={isPlaying ? "Pause" : "Play"} size={28} color="white" /></button>
            </div>
            <span className="absolute top-3 right-3 tag text-xs">{selectedVideo.category}</span>
            <div className="absolute bottom-0 left-0 right-0 p-3"><div className="h-1 bg-white/20 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{ width: isPlaying ? '40%' : '0%', background: 'linear-gradient(90deg, #ef4444, #f97316)' }} /></div></div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-white/50 text-sm px-2.5 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}><Icon name="Eye" size={14} />{selectedVideo.views.toLocaleString("ru-RU")} просмотров</span>
            <button onClick={() => toggleLike(selectedVideo)} className="flex items-center gap-1.5 text-sm px-2.5 py-1.5 rounded-xl transition-all active:scale-90" style={{ background: liked ? 'rgba(27,111,255,0.15)' : 'rgba(255,255,255,0.05)', color: liked ? '#4d8fff' : 'rgba(255,255,255,0.5)' }}><Icon name="ThumbsUp" size={14} color={liked ? '#4d8fff' : undefined} />{selectedVideo.likes}</button>
            <button onClick={() => toggleFav(selectedVideo)} className="flex items-center gap-1.5 text-sm px-2.5 py-1.5 rounded-xl transition-all active:scale-90" style={{ background: isFav ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)', color: isFav ? '#f59e0b' : 'rgba(255,255,255,0.5)' }}><Icon name="Star" size={14} color={isFav ? '#f59e0b' : undefined} />{selectedVideo.favoritedBy}</button>
          </div>

          <button onClick={() => { setChannelAuthor(selectedVideo.author); setView("channel"); }} className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all hover:bg-white/5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>{selectedVideo.author.avatar}</div>
            <div className="flex-1"><p className="text-sm font-semibold text-white">{selectedVideo.author.name}</p><p className="text-xs text-white/40">Перейти на канал</p></div>
            <Icon name="ChevronRight" size={16} color="rgba(255,255,255,0.3)" />
          </button>

          <div className="glass rounded-2xl p-4">
            <p className="text-sm text-white/70 leading-relaxed mb-3">{selectedVideo.description}</p>
            <div className="flex flex-wrap gap-2">{selectedVideo.hashtags.map(tag => <button key={tag} onClick={() => { setSearch(tag); setView("feed"); }} className="text-xs px-2 py-1 rounded-lg transition-colors hover:text-blue-300" style={{ background: 'rgba(27,111,255,0.12)', border: '1px solid rgba(27,111,255,0.25)', color: '#4d8fff' }}>{tag}</button>)}</div>
          </div>

          {/* Comments */}
          <div className="glass rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2"><Icon name="MessageCircle" size={15} />Комментарии ({selectedVideo.comments.length})</h3>
            <div className="space-y-3 mb-3">
              {selectedVideo.comments.map(c => (
                <div key={c.id} className="flex gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #1b6fff, #7c3aed)' }}>{c.author.split(" ").map(w => w[0]).join("").slice(0, 2)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2"><span className="text-xs font-semibold text-white/80">{c.author}</span><span className="text-xs text-white/30">{c.time}</span></div>
                    <p className="text-sm text-white/70 mt-0.5">{c.text}</p>
                  </div>
                </div>
              ))}
              {selectedVideo.comments.length === 0 && <p className="text-center text-white/30 text-sm py-2">Будьте первым, кто оставит комментарий</p>}
            </div>
            <div className="flex gap-2">
              <input className="input-field text-sm py-2.5 flex-1" placeholder="Написать комментарий..." value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === "Enter" && addComment()} />
              <button onClick={addComment} disabled={!commentText.trim()} className="p-2.5 rounded-xl flex-shrink-0 disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}><Icon name="Send" size={18} color="white" /></button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN FEED ──
  return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      {toast && <Toast msg={toast} />}
      <div className="glass border-b border-white/10 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/10 transition-colors flex-shrink-0"><Icon name="ArrowLeft" size={20} color="white" /></button>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)' }}><Icon name="Play" size={16} color="#ef4444" /></div>
            <h1 className="text-base font-bold text-white flex-1">Видео</h1>
            {isAdmin && (
              <button onClick={() => setView("admin_requests")} className="relative p-2 rounded-xl hover:bg-white/10 transition-colors">
                <Icon name="Users" size={18} color="rgba(255,255,255,0.6)" />
                {pendingVideoReqs.length > 0 && <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold" style={{ background: '#ef4444', fontSize: '10px' }}>{pendingVideoReqs.length}</span>}
              </button>
            )}
            {canAdd && <button onClick={() => setView("studio")} className="p-2 rounded-xl hover:bg-white/10 transition-colors"><Icon name="LayoutDashboard" size={18} color="rgba(255,255,255,0.6)" /></button>}
          </div>

          {/* CTA / Add button at the very top */}
          {canAdd ? (
            <button onClick={() => { setEditingVideo(null); setView("add"); }} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
              <Icon name="Plus" size={17} />Добавить видео
            </button>
          ) : myCMRequest && myCMRequest.status === "approved" && !myCMRequest.paid ? (
            <button onClick={() => setView("payment")} className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-left" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.4)' }}>
              <Icon name="Wallet" size={16} color="#10b981" />
              <span className="text-sm font-medium text-white flex-1">Заявка одобрена — оплатите роль ({CONTENT_MAKER_PRICE.toLocaleString("ru-RU")} ₽/год)</span>
              <Icon name="ChevronRight" size={15} color="#10b981" />
            </button>
          ) : myCMRequest && myCMRequest.status === "pending" ? (
            <div className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-left" style={{ background: 'rgba(245,158,11,0.1)', border: '1px dashed rgba(245,158,11,0.35)' }}>
              <Icon name="Clock" size={16} color="#f59e0b" />
              <span className="text-sm font-medium text-white flex-1">Заявка на рассмотрении администрацией</span>
            </div>
          ) : (
            <button onClick={() => { setRequestPhone(currentUser.phone || ""); setRequestAgreed(false); setView("request"); }} className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-left" style={{ background: 'rgba(239,68,68,0.1)', border: '1px dashed rgba(239,68,68,0.35)' }}>
              <Icon name="Video" size={16} color="#ef4444" />
              <span className="text-sm font-medium text-white flex-1">Хотите публиковать видео?</span>
              <Icon name="ChevronRight" size={15} color="rgba(239,68,68,0.6)" />
            </button>
          )}

          <div className="relative">
            <Icon name="Search" size={15} color="rgba(255,255,255,0.3)" className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input className="input-field pl-9 pr-9 py-2.5 text-sm" placeholder="Поиск по названию, #хэштегу, автору..." value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><Icon name="X" size={15} color="rgba(255,255,255,0.4)" /></button>}
          </div>
          <div className="flex gap-2">
            {(["all", "favorites"] as TabType[]).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${tab === t ? "text-white" : "text-white/50"}`} style={{ background: tab === t ? (t === "all" ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#f59e0b,#d97706)') : 'rgba(255,255,255,0.06)', border: `1px solid ${tab === t ? (t === "all" ? 'rgba(239,68,68,0.5)' : 'rgba(245,158,11,0.5)') : 'rgba(255,255,255,0.1)'}` }}>
                {t === "all" ? "Все видео" : <><Icon name="Star" size={14} color={tab === t ? "white" : "rgba(255,255,255,0.4)"} />Избранное {favorites.length > 0 && <span className="opacity-70 text-xs">({favorites.length})</span>}</>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-3 pb-8 space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {VIDEO_CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)} className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all" style={{ background: category === cat ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'rgba(255,255,255,0.06)', border: `1px solid ${category === cat ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`, color: category === cat ? 'white' : 'rgba(255,255,255,0.5)' }}>{cat}</button>
          ))}
        </div>
        {(search || category !== "Все") && <p className="text-xs text-white/40 px-1">Найдено: {filtered.length} видео{search && ` по «${search}»`}</p>}
        {filtered.length > 0
          ? filtered.map((v, i) => <VideoCard key={v.id} video={v} isFav={favorites.includes(v.id)} onToggleFav={() => toggleFav(v)} onPlay={() => openVideo(v)} onAuthorClick={a => { setChannelAuthor(a); setView("channel"); }} onHashtagClick={tag => setSearch(tag)} animDelay={i * 0.05} />)
          : <EmptyState text={tab === "favorites" ? "Вы ещё не добавили видео в избранное" : "Ничего не найдено"} />
        }
      </div>
    </div>
  );
}

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
      <div className="w-full relative" style={{ aspectRatio: '16/7', background: video.thumbnail }}>
        {video.bannerImage && <img src={video.bannerImage} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        <button onClick={onPlay} className="absolute inset-0 flex items-center justify-center w-full" style={{ background: 'rgba(0,0,0,0.3)' }}><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}><Icon name="Play" size={18} color="white" /></div></button>
        <span className="absolute bottom-2 right-2 text-xs text-white font-mono px-2 py-0.5 rounded-lg pointer-events-none" style={{ background: 'rgba(0,0,0,0.65)' }}>{video.duration}</span>
        <span className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-lg font-medium pointer-events-none" style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.85)' }}>{video.category.split(" ")[0]}</span>
        <div className="absolute top-2 right-2"><AdminBlockButton kind="video" id={video.id} authorId={video.author.id} /></div>
      </div>
      <div className="p-3">
        <button onClick={onPlay} className="text-sm font-semibold text-white text-left leading-snug mb-2 hover:text-red-300 transition-colors block w-full">{video.title}</button>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {video.hashtags.slice(0, 3).map(tag => <button key={tag} onClick={() => onHashtagClick(tag)} className="text-xs px-2 py-0.5 rounded-lg transition-colors hover:text-blue-300" style={{ background: 'rgba(27,111,255,0.1)', border: '1px solid rgba(27,111,255,0.2)', color: '#4d8fff' }}>{tag}</button>)}
          {video.hashtags.length > 3 && <span className="text-xs text-white/25 self-center">+{video.hashtags.length - 3}</span>}
        </div>
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => onAuthorClick(video.author)} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity flex-shrink-0">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', fontSize: '9px' }}>{video.author.avatar}</div>
            <span className="text-xs text-white/60 hover:text-white/80 transition-colors">{video.author.name}</span>
          </button>
          <span className="text-white/20 text-xs ml-auto">{video.date}</span>
        </div>
        <div className="flex items-center gap-3 pt-2 border-t border-white/5">
          <span className="flex items-center gap-1 text-white/40 text-xs"><Icon name="Eye" size={11} />{video.views.toLocaleString("ru-RU")}</span>
          <span className="flex items-center gap-1 text-white/40 text-xs"><Icon name="ThumbsUp" size={11} />{video.likes}</span>
          <span className="flex items-center gap-1 text-white/40 text-xs"><Icon name="MessageCircle" size={11} />{video.comments.length}</span>
          <button onClick={e => { e.stopPropagation(); onToggleFav(); }} className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg transition-all active:scale-90" style={{ background: isFav ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)' }}>
            <Icon name="Star" size={13} color={isFav ? '#f59e0b' : 'rgba(255,255,255,0.4)'} /><span className="text-xs" style={{ color: isFav ? '#f59e0b' : 'rgba(255,255,255,0.4)' }}>{video.favoritedBy}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-14">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(255,255,255,0.04)' }}><Icon name="VideoOff" size={28} color="rgba(255,255,255,0.2)" /></div>
      <p className="text-white/30 text-sm">{text}</p>
    </div>
  );
}

function Toast({ msg }: { msg: string }) {
  return <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl text-sm font-medium text-white animate-fade-up" style={{ background: 'rgba(239,68,68,0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(239,68,68,0.5)', animationFillMode: 'forwards' }}>{msg}</div>;
}