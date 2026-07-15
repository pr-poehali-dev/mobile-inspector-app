import { useState, useEffect, useCallback, useRef } from "react";
import Icon from "@/components/ui/icon";
import ModuleHeader from "@/components/ModuleHeader";
import { useApp } from "@/context/AppContext";
import func2url from "../../../backend/func2url.json";

const FORUM_API = (func2url as Record<string, string>)["forum"];

interface Props { onBack: () => void; }

interface Reply { id: number; author: string; authorId?: number; text: string; fileUrl?: string | null; time: string; }
interface Topic { id: number; title: string; author: string; authorId?: number; time: string; section: string; replies: Reply[]; pinned?: boolean; hasFile?: boolean; fileUrl?: string | null; repliesCount?: number; }

const SECTIONS = ["Все", "Техподдержка", "Общее", "Проекты"];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ForumModule({ onBack }: Props) {
  const { isAdmin, currentUser } = useApp();
  const [section, setSection] = useState("Все");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [topicLoading, setTopicLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicSection, setNewTopicSection] = useState("Общее");
  const [newTopicFile, setNewTopicFile] = useState<File | null>(null);
  const [editingTopicId, setEditingTopicId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const replyFileRef = useRef<HTMLInputElement>(null);
  const newTopicFileRef = useRef<HTMLInputElement>(null);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const loadTopics = useCallback(async () => {
    setLoading(true);
    try {
      const q = section !== "Все" ? `&section=${encodeURIComponent(section)}` : "";
      const res = await fetch(`${FORUM_API}?action=topics${q}`);
      const data = await res.json();
      setTopics(Array.isArray(data.topics) ? data.topics.map((t: Topic) => ({ ...t, replies: [] })) : []);
    } catch {
      showToast("⚠️ Не удалось загрузить темы. Проверьте соединение.");
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => { loadTopics(); }, [loadTopics]);

  const loadTopic = useCallback(async (id: number) => {
    setTopicLoading(true);
    try {
      const res = await fetch(`${FORUM_API}?action=topic&id=${id}`);
      const data = await res.json();
      if (data.topic) setSelectedTopic(data.topic);
    } catch {
      showToast("⚠️ Не удалось загрузить тему. Проверьте соединение.");
    } finally {
      setTopicLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTopicId !== null) {
      loadTopic(selectedTopicId);
    } else {
      setSelectedTopic(null);
    }
  }, [selectedTopicId, loadTopic]);

  const filtered = topics.filter(t => section === "Все" || t.section === section);

  const deleteTopic = async (id: number) => {
    setTopics(prev => prev.filter(t => t.id !== id));
    if (selectedTopicId === id) setSelectedTopicId(null);
    try {
      await fetch(FORUM_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
    } catch {
      showToast("⚠️ Не удалось удалить тему");
    }
  };

  const togglePin = async (id: number) => {
    setTopics(prev => prev.map(t => t.id === id ? { ...t, pinned: !t.pinned } : t));
    setSelectedTopic(prev => prev && prev.id === id ? { ...prev, pinned: !prev.pinned } : prev);
    try {
      await fetch(FORUM_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "pin", id }) });
    } catch {
      showToast("⚠️ Не удалось закрепить тему");
    }
  };

  const saveEditTitle = async (id: number) => {
    if (!editTitle.trim()) return;
    setTopics(prev => prev.map(t => t.id === id ? { ...t, title: editTitle } : t));
    setSelectedTopic(prev => prev && prev.id === id ? { ...prev, title: editTitle } : prev);
    setEditingTopicId(null);
    try {
      await fetch(FORUM_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "editTitle", id, title: editTitle }) });
    } catch {
      showToast("⚠️ Не удалось изменить заголовок");
    }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedTopicId) return;
    const text = replyText;
    const file = attachedFile;
    setReplyText("");
    setAttachedFile(null);
    try {
      let fileData: string | undefined;
      if (file) fileData = await fileToDataUrl(file);
      await fetch(FORUM_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reply", topicId: selectedTopicId, authorId: currentUser.id, authorName: currentUser.name, text, fileData }) });
      await loadTopic(selectedTopicId);
      setTopics(prev => prev.map(t => t.id === selectedTopicId ? { ...t, repliesCount: (t.repliesCount || 0) + 1 } : t));
    } catch {
      showToast("⚠️ Не удалось отправить ответ");
    }
  };

  const createTopic = async () => {
    if (!newTopicTitle.trim()) return;
    const title = newTopicTitle;
    const sec = newTopicSection;
    const file = newTopicFile;
    setNewTopicTitle("");
    setCreating(false);
    setNewTopicFile(null);
    try {
      let fileData: string | undefined;
      if (file) fileData = await fileToDataUrl(file);
      const res = await fetch(FORUM_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "createTopic", authorId: currentUser.id, authorName: currentUser.name, title, section: sec, fileData }) });
      const data = await res.json();
      await loadTopics();
      if (data.id) setSelectedTopicId(data.id);
    } catch {
      showToast("⚠️ Не удалось создать тему");
    }
  };

  const handleReplyFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setAttachedFile(f);
    e.target.value = "";
  };

  const handleNewTopicFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setNewTopicFile(f);
    e.target.value = "";
  };

  if (selectedTopicId !== null) {
    if (topicLoading && !selectedTopic) {
      return (
        <div className="min-h-screen relative z-10 animate-fade-in">
          {toast && <Toast msg={toast} />}
          <ModuleHeader title="Загрузка..." onBack={() => setSelectedTopicId(null)} />
          <div className="max-w-2xl mx-auto px-4 pt-4 pb-8">
            <p className="text-center text-white/30 text-sm py-10">Загрузка темы...</p>
          </div>
        </div>
      );
    }
    if (!selectedTopic) return null;
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        {toast && <Toast msg={toast} />}
        <ModuleHeader title={selectedTopic.section} onBack={() => setSelectedTopicId(null)} />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-3">
          <div className="glass rounded-2xl p-4">
            {editingTopicId === selectedTopic.id ? (
              <div className="flex gap-2 mb-2">
                <input className="input-field text-sm py-2 flex-1" value={editTitle} onChange={e => setEditTitle(e.target.value)} autoFocus />
                <button onClick={() => saveEditTitle(selectedTopic.id)} className="px-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.2)' }}><Icon name="Check" size={16} color="#10b981" /></button>
                <button onClick={() => setEditingTopicId(null)} className="px-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}><Icon name="X" size={16} color="rgba(255,255,255,0.5)" /></button>
              </div>
            ) : (
              <h2 className="text-base font-bold text-white mb-2">{selectedTopic.title}</h2>
            )}
            <div className="flex items-center gap-3 text-xs text-white/40">
              <span className="flex items-center gap-1"><Icon name="User" size={12} />{selectedTopic.author}</span>
              <span>{selectedTopic.time}</span>
              {selectedTopic.hasFile && <span className="flex items-center gap-1 text-blue-400"><Icon name="Paperclip" size={12} />Есть вложение</span>}
            </div>
            {isAdmin && editingTopicId !== selectedTopic.id && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                <span className="text-xs px-2 py-0.5 rounded-md self-center" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>Админ</span>
                <button onClick={() => { setEditingTopicId(selectedTopic.id); setEditTitle(selectedTopic.title); }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}><Icon name="Pencil" size={12} />Изменить</button>
                <button onClick={() => togglePin(selectedTopic.id)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs" style={{ background: selectedTopic.pinned ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.06)', color: selectedTopic.pinned ? '#f97316' : 'rgba(255,255,255,0.7)' }}><Icon name="Pin" size={12} />{selectedTopic.pinned ? "Открепить" : "Закрепить"}</button>
                <button onClick={() => deleteTopic(selectedTopic.id)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs ml-auto" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}><Icon name="Trash2" size={12} />Удалить</button>
              </div>
            )}
          </div>

          {selectedTopic.replies.map((r, i) => (
            <div key={r.id} className="animate-fade-up opacity-0" style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'forwards' }}>
              <div className="p-4 rounded-2xl" style={{ background: (r.author === "Поддержка" || r.author === "Администратор") ? 'rgba(27,111,255,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${(r.author === "Поддержка" || r.author === "Администратор") ? 'rgba(27,111,255,0.25)' : 'rgba(255,255,255,0.08)'}` }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-white/80">{r.author}</span>
                  {(r.author === "Поддержка" || r.author === "Администратор") && <span className="tag text-xs">Официально</span>}
                  {r.authorId === currentUser.id && <span className="tag text-xs" style={{ background: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.3)', color: '#10b981' }}>Вы</span>}
                  <span className="text-xs text-white/30 ml-auto">{r.time}</span>
                </div>
                <p className="text-sm text-white/70">{r.text}</p>
                {r.fileUrl && (
                  <a href={r.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 mt-2 text-xs text-blue-400"><Icon name="Paperclip" size={12} />Вложение</a>
                )}
              </div>
            </div>
          ))}

          {selectedTopic.replies.length === 0 && (
            <p className="text-center text-white/30 text-sm py-6">Пока нет ответов — будьте первым!</p>
          )}

          {attachedFile && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(27,111,255,0.1)', border: '1px solid rgba(27,111,255,0.25)' }}>
              <Icon name="Paperclip" size={14} color="#4d8fff" />
              <span className="text-xs text-blue-300 flex-1">{attachedFile.name}</span>
              <button onClick={() => setAttachedFile(null)} className="text-white/40 hover:text-white/70"><Icon name="X" size={14} /></button>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <input className="input-field text-sm py-3 flex-1" placeholder="Написать ответ..." value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => e.key === "Enter" && sendReply()} />
            <input ref={replyFileRef} type="file" className="hidden" onChange={handleReplyFile} />
            <button onClick={() => replyFileRef.current?.click()} className="p-3 rounded-xl flex-shrink-0 transition-all active:scale-90" style={{ background: attachedFile ? 'rgba(27,111,255,0.3)' : 'rgba(27,111,255,0.15)', border: '1px solid rgba(27,111,255,0.3)' }}>
              <Icon name="Paperclip" size={18} color={attachedFile ? "white" : "rgba(255,255,255,0.6)"} />
            </button>
            <button onClick={sendReply} disabled={!replyText.trim()} className="p-3 rounded-xl flex-shrink-0 transition-all active:scale-90 disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
              <Icon name="Send" size={18} color="white" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      {toast && <Toast msg={toast} />}
      <ModuleHeader title="Форум" onBack={onBack} subtitle={`${topics.length} тем`} icon="MessageSquare" iconColor="#f97316" />
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">

        {creating && (
          <div className="glass-strong rounded-2xl p-4 space-y-3 animate-scale-in">
            <h3 className="text-sm font-semibold text-white">Новая тема</h3>
            <input className="input-field text-sm" placeholder="Заголовок темы..." value={newTopicTitle} onChange={e => setNewTopicTitle(e.target.value)} autoFocus />
            <div className="flex gap-2">
              {SECTIONS.slice(1).map(s => (
                <button key={s} onClick={() => setNewTopicSection(s)} className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all" style={{ background: newTopicSection === s ? 'rgba(249,115,22,0.25)' : 'rgba(255,255,255,0.06)', border: `1px solid ${newTopicSection === s ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.1)'}`, color: newTopicSection === s ? '#f97316' : 'rgba(255,255,255,0.5)' }}>{s}</button>
              ))}
            </div>
            <input ref={newTopicFileRef} type="file" className="hidden" onChange={handleNewTopicFile} />
            <button onClick={() => newTopicFileRef.current?.click()} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{ background: newTopicFile ? 'rgba(27,111,255,0.15)' : 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.15)', color: newTopicFile ? '#4d8fff' : 'rgba(255,255,255,0.5)' }}>
              <Icon name="Paperclip" size={14} />{newTopicFile ? newTopicFile.name : "Прикрепить файл (опционально)"}
            </button>
            <div className="flex gap-2">
              <button onClick={() => { setCreating(false); setNewTopicFile(null); }} className="btn-ghost flex-1 text-sm">Отмена</button>
              <button onClick={createTopic} disabled={!newTopicTitle.trim()} className="btn-primary flex-1 text-sm flex items-center justify-center gap-1">
                <Icon name="Plus" size={14} />Создать тему
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1 animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
          {SECTIONS.map(s => (
            <button key={s} onClick={() => setSection(s)} className={`px-4 py-2 rounded-xl text-sm font-medium flex-shrink-0 transition-all ${section === s ? "text-white" : "text-white/50"}`} style={{ background: section === s ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'rgba(255,255,255,0.06)', border: `1px solid ${section === s ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.1)'}` }}>
              {s}
            </button>
          ))}
          <button onClick={() => setCreating(true)} className="px-4 py-2 rounded-xl text-sm font-medium flex-shrink-0 text-white/50 hover:text-white/80 transition-all flex items-center gap-1.5" style={{ background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)' }}>
            <Icon name="Plus" size={14} />Новая тема
          </button>
        </div>

        {loading ? (
          <p className="text-center text-white/30 text-sm py-10">Загрузка тем...</p>
        ) : (
          <div className="space-y-3">
            {[...filtered].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned)).map((topic, i) => (
              <div key={topic.id} className="relative card-module animate-fade-up opacity-0" style={{ animationDelay: `${0.05 + i * 0.06}s`, animationFillMode: 'forwards' }}>
                <button onClick={() => setSelectedTopicId(topic.id)} className="w-full text-left">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="tag text-xs flex-shrink-0">{topic.section}</span>
                    {topic.pinned && <span className="flex items-center gap-1 text-xs text-orange-400"><Icon name="Pin" size={11} />Закреплено</span>}
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-2 leading-snug pr-8">{topic.title}</h3>
                  <div className="flex items-center justify-between text-xs text-white/40">
                    <span className="flex items-center gap-1"><Icon name="User" size={11} />{topic.author} · {topic.time}</span>
                    <span className="flex items-center gap-1">
                      <Icon name="MessageCircle" size={11} />
                      {topic.repliesCount ?? topic.replies.length}
                      {topic.hasFile && <><Icon name="Paperclip" size={11} className="ml-2" /><span className="text-blue-400/70">файл</span></>}
                    </span>
                  </div>
                </button>
                {isAdmin && (
                  <button onClick={() => deleteTopic(topic.id)} className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-red-500/15 transition-colors">
                    <Icon name="Trash2" size={14} color="rgba(239,68,68,0.7)" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Toast({ msg }: { msg: string }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-medium text-white animate-fade-in" style={{ background: 'rgba(20,20,30,0.95)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
      {msg}
    </div>
  );
}
