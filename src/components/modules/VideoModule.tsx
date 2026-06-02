import { useState } from "react";
import { User } from "@/pages/Index";
import Icon from "@/components/ui/icon";
import ModuleHeader from "@/components/ModuleHeader";

interface Props {
  onBack: () => void;
  user: User;
}

const VIDEOS = [
  { id: 1, title: "Введение в систему безопасности", author: "Иван Смирнов", duration: "12:34", views: 1420, category: "Безопасность", chapters: ["00:00 Введение", "03:15 Основные понятия", "07:40 Практика", "11:00 Итоги"], saved: false },
  { id: 2, title: "Работа с документооборотом: полный курс", author: "Анна Козлова", duration: "28:10", views: 876, category: "Обучение", chapters: ["00:00 Обзор", "05:20 Создание документов", "14:00 Согласование", "22:00 Архивирование"], saved: true },
  { id: 3, title: "Регламент технического осмотра объектов", author: "Пётр Волков", duration: "18:45", views: 2341, category: "Регламенты", chapters: ["00:00 Вступление", "04:10 Чек-лист осмотра", "10:30 Фиксация нарушений", "16:00 Отчётность"], saved: false },
  { id: 4, title: "Инструктаж по охране труда 2024", author: "Мария Иванова", duration: "35:00", views: 5120, category: "Охрана труда", chapters: ["00:00 Правовая база", "08:00 Индивидуальные СИЗ", "20:00 Действия при ЧС"], saved: false },
];

const CATEGORIES = ["Все", "Безопасность", "Обучение", "Регламенты", "Охрана труда"];

export default function VideoModule({ onBack, user }: Props) {
  const [activeCategory, setActiveCategory] = useState("Все");
  const [selectedVideo, setSelectedVideo] = useState<typeof VIDEOS[0] | null>(null);
  const [newQuestion, setNewQuestion] = useState("");
  const [questions, setQuestions] = useState([
    { id: 1, text: "Как сохранить заметки после просмотра?", author: "Сергей К.", time: "2 дня назад", answered: true, answer: "Заметки сохраняются автоматически после добавления таймкода." },
  ]);
  const [noteText, setNoteText] = useState("");
  const [notes, setNotes] = useState<{ time: string; text: string }[]>([]);
  const [likedVideos, setLikedVideos] = useState<number[]>([]);
  const [savedVideos, setSavedVideos] = useState<number[]>([2]);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [playProgress, setPlayProgress] = useState(0.33);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: "", desc: "", category: "" });

  const filtered = activeCategory === "Все" ? VIDEOS : VIDEOS.filter(v => v.category === activeCategory);

  const addQuestion = () => {
    if (!newQuestion.trim()) return;
    setQuestions(prev => [...prev, { id: Date.now(), text: newQuestion, author: "Вы", time: "только что", answered: false, answer: "" }]);
    setNewQuestion("");
  };

  const addNote = () => {
    if (!noteText.trim()) return;
    setNotes(prev => [...prev, { time: "05:32", text: noteText }]);
    setNoteText("");
  };

  if (selectedVideo) {
    const isLiked = likedVideos.includes(selectedVideo.id);
    const isSaved = savedVideos.includes(selectedVideo.id);

    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        <ModuleHeader title={selectedVideo.title} onBack={() => setSelectedVideo(null)} subtitle={selectedVideo.author} />
        <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4 pb-8">
          {/* Player */}
          <div className="rounded-2xl overflow-hidden relative" style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', aspectRatio: '16/9' }}>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <button
                onClick={() => setIsPlaying(p => !p)}
                className="w-16 h-16 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #1b6fff, #0040cc)' }}
              >
                <Icon name={isPlaying ? "Pause" : "Play"} size={26} color="white" />
              </button>
              <p className="text-white/40 text-sm mt-3">{selectedVideo.chapters[currentChapter]?.split(" ").slice(1).join(" ") || selectedVideo.duration}</p>
            </div>
            <div className="absolute top-3 right-3 flex gap-2">
              <span className="tag text-xs">{selectedVideo.category}</span>
            </div>
            {/* Timeline */}
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <div
                className="relative h-1.5 bg-white/20 rounded-full cursor-pointer"
                onClick={e => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = (e.clientX - rect.left) / rect.width;
                  setPlayProgress(Math.max(0, Math.min(1, pct)));
                }}
              >
                <div className="h-full rounded-full" style={{ width: `${playProgress * 100}%`, background: 'linear-gradient(90deg, #1b6fff, #a78bfa)' }} />
                <div className="absolute top-1/2 rounded-full w-3 h-3 bg-white shadow-lg -translate-y-1/2 -translate-x-1/2" style={{ left: `${playProgress * 100}%` }} />
              </div>
              <div className="flex justify-between mt-1.5">
                {selectedVideo.chapters.map((ch, i) => (
                  <button
                    key={i}
                    onClick={() => { setCurrentChapter(i); setPlayProgress(i / selectedVideo.chapters.length); }}
                    className="text-xs transition-colors"
                    style={{ color: currentChapter === i ? '#4d8fff' : 'rgba(255,255,255,0.4)' }}
                  >
                    {ch.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-white/50 text-sm"><Icon name="Eye" size={14} />{selectedVideo.views.toLocaleString("ru-RU")}</div>
            <button
              onClick={() => setLikedVideos(prev => isLiked ? prev.filter(id => id !== selectedVideo.id) : [...prev, selectedVideo.id])}
              className="flex items-center gap-1.5 text-sm transition-all active:scale-90"
              style={{ color: isLiked ? '#4d8fff' : 'rgba(255,255,255,0.5)' }}
            >
              <Icon name="ThumbsUp" size={14} color={isLiked ? '#4d8fff' : undefined} />Полезно{isLiked ? " ✓" : ""}
            </button>
            <button
              onClick={() => setSavedVideos(prev => isSaved ? prev.filter(id => id !== selectedVideo.id) : [...prev, selectedVideo.id])}
              className="flex items-center gap-1.5 text-sm transition-all active:scale-90"
              style={{ color: isSaved ? '#f59e0b' : 'rgba(255,255,255,0.5)' }}
            >
              <Icon name="Bookmark" size={14} color={isSaved ? '#f59e0b' : undefined} />{isSaved ? "Сохранено" : "Сохранить"}
            </button>
          </div>

          {/* Chapters */}
          <div className="glass rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2"><Icon name="List" size={15} />Главы</h3>
            <div className="space-y-2">
              {selectedVideo.chapters.map((ch, i) => (
                <button
                  key={i}
                  onClick={() => { setCurrentChapter(i); setPlayProgress(i / selectedVideo.chapters.length); setIsPlaying(true); }}
                  className="w-full flex items-center gap-3 p-2 rounded-xl transition-colors text-left"
                  style={{ background: currentChapter === i ? 'rgba(27,111,255,0.12)' : 'transparent' }}
                >
                  {currentChapter === i && isPlaying
                    ? <Icon name="Volume2" size={14} color="#4d8fff" className="w-10 flex-shrink-0" />
                    : <span className="text-xs font-mono text-blue-400 w-10 flex-shrink-0">{ch.split(" ")[0]}</span>
                  }
                  <span className="text-sm" style={{ color: currentChapter === i ? 'white' : 'rgba(255,255,255,0.7)' }}>{ch.split(" ").slice(1).join(" ")}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="glass rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2"><Icon name="StickyNote" size={15} />Мои заметки</h3>
            {notes.map((n, i) => (
              <div key={i} className="flex gap-2 mb-2 p-2 rounded-xl" style={{ background: 'rgba(27,111,255,0.1)' }}>
                <span className="text-xs font-mono text-blue-400 flex-shrink-0">{n.time}</span>
                <span className="text-sm text-white/70">{n.text}</span>
              </div>
            ))}
            <div className="flex gap-2 mt-3">
              <input className="input-field text-sm py-2 flex-1" placeholder="Добавить заметку к текущему таймкоду..." value={noteText} onChange={e => setNoteText(e.target.value)} onKeyDown={e => e.key === "Enter" && addNote()} />
              <button onClick={addNote} className="p-2.5 rounded-xl flex-shrink-0 transition-colors hover:opacity-80" style={{ background: 'rgba(27,111,255,0.3)', border: '1px solid rgba(27,111,255,0.3)' }}>
                <Icon name="Plus" size={18} color="white" />
              </button>
            </div>
          </div>

          {/* Questions */}
          <div className="glass rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2"><Icon name="HelpCircle" size={15} />Вопросы автору</h3>
            <div className="space-y-3 mb-3">
              {questions.map(q => (
                <div key={q.id} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-xs text-white/50">{q.author} · {q.time}</span>
                    {q.answered && <span className="tag text-xs">Ответ есть</span>}
                  </div>
                  <p className="text-sm text-white/80">{q.text}</p>
                  {q.answered && <p className="text-sm text-blue-300 mt-2 pl-3 border-l-2 border-blue-500/50">{q.answer}</p>}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input className="input-field text-sm py-2 flex-1" placeholder="Задать вопрос автору..." value={newQuestion} onChange={e => setNewQuestion(e.target.value)} onKeyDown={e => e.key === "Enter" && addQuestion()} />
              <button onClick={addQuestion} className="p-2.5 rounded-xl flex-shrink-0 transition-colors hover:opacity-80" style={{ background: 'rgba(27,111,255,0.3)', border: '1px solid rgba(27,111,255,0.3)' }}>
                <Icon name="Send" size={18} color="white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      <ModuleHeader title="Видеоматериалы" onBack={onBack} subtitle={`${VIDEOS.length} видео`} icon="Play" iconColor="#ef4444" />
      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4 pb-8">
        {(user.role === "videoblogger" || user.role === "admin") && (
          showUploadForm ? (
            <div className="glass-strong rounded-2xl p-4 animate-scale-in space-y-3">
              <h3 className="text-sm font-semibold text-white">Загрузить видео</h3>
              <div className="border-2 border-dashed border-white/15 rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer hover:border-blue-500/50 transition-colors">
                <Icon name="Upload" size={24} color="rgba(255,255,255,0.3)" />
                <span className="text-xs text-white/40">Нажмите для выбора MP4 (до 2 ГБ)</span>
              </div>
              <input className="input-field text-sm" placeholder="Название видео" value={uploadForm.title} onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))} />
              <textarea className="input-field text-sm resize-none" rows={2} placeholder="Описание" value={uploadForm.desc} onChange={e => setUploadForm(f => ({ ...f, desc: e.target.value }))} />
              <input className="input-field text-sm" placeholder="Категория" value={uploadForm.category} onChange={e => setUploadForm(f => ({ ...f, category: e.target.value }))} />
              <div className="flex gap-2">
                <button onClick={() => setShowUploadForm(false)} className="btn-ghost flex-1 text-sm">Отмена</button>
                <button className="btn-primary flex-1 text-sm flex items-center justify-center gap-1" disabled={!uploadForm.title}>
                  <Icon name="Upload" size={15} />Загрузить
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowUploadForm(true)} className="btn-primary flex items-center justify-center gap-2 animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
              <Icon name="Upload" size={18} />Загрузить видео
            </button>
          )
        )}

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-1 animate-fade-up opacity-0 delay-100" style={{ animationFillMode: 'forwards' }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-xl text-sm font-medium flex-shrink-0 transition-all ${activeCategory === cat ? "text-white glow-sm" : "text-white/50 hover:text-white/80"}`} style={{ background: activeCategory === cat ? 'linear-gradient(135deg, #1b6fff, #0040cc)' : 'rgba(255,255,255,0.06)', border: `1px solid ${activeCategory === cat ? 'rgba(27,111,255,0.5)' : 'rgba(255,255,255,0.1)'}` }}>
              {cat}
            </button>
          ))}
        </div>

        {/* Videos list */}
        <div className="space-y-3">
          {filtered.map((video, i) => (
            <button key={video.id} onClick={() => setSelectedVideo(video)} className={`w-full text-left card-module animate-fade-up opacity-0`} style={{ animationDelay: `${0.1 + i * 0.06}s`, animationFillMode: 'forwards' }}>
              <div className="flex gap-3">
                <div className="w-20 h-14 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.05))', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <Icon name="Play" size={20} color="#ef4444" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white leading-snug mb-1 line-clamp-2">{video.title}</div>
                  <div className="flex items-center gap-3 text-xs text-white/40">
                    <span>{video.author}</span>
                    <span className="flex items-center gap-1"><Icon name="Clock" size={11} />{video.duration}</span>
                    <span className="flex items-center gap-1"><Icon name="Eye" size={11} />{video.views.toLocaleString("ru-RU")}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="tag">{video.category}</span>
                    {video.saved && <span className="text-xs text-blue-400 flex items-center gap-1"><Icon name="Bookmark" size={11} />Сохранено</span>}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}