import { useState } from "react";
import Icon from "@/components/ui/icon";
import ModuleHeader from "@/components/ModuleHeader";
import { useApp } from "@/context/AppContext";
import { useSharedState } from "@/hooks/useSharedState";

interface Props { onBack: () => void; }

interface Reply { id: number; author: string; text: string; time: string; }
interface Topic { id: number; title: string; author: string; time: string; section: string; replies: Reply[]; pinned?: boolean; hasFile?: boolean; }

const SECTIONS = ["Все", "Техподдержка", "Общее", "Проекты"];



export default function ForumModule({ onBack }: Props) {
  const { isAdmin, currentUser } = useApp();
  const [section, setSection] = useState("Все");
  const [topics, setTopics] = useSharedState<Topic[]>("forum_topics", []);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [attachedFile, setAttachedFile] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicSection, setNewTopicSection] = useState("Общее");
  const [editingTopicId, setEditingTopicId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const selectedTopic = topics.find(t => t.id === selectedTopicId) || null;
  const filtered = topics.filter(t => section === "Все" || t.section === section);

  const deleteTopic = (id: number) => {
    setTopics(prev => prev.filter(t => t.id !== id));
    if (selectedTopicId === id) setSelectedTopicId(null);
  };
  const togglePin = (id: number) => setTopics(prev => prev.map(t => t.id === id ? { ...t, pinned: !t.pinned } : t));
  const saveEditTitle = (id: number) => {
    if (!editTitle.trim()) return;
    setTopics(prev => prev.map(t => t.id === id ? { ...t, title: editTitle } : t));
    setEditingTopicId(null);
  };

  const sendReply = () => {
    if (!replyText.trim() || !selectedTopicId) return;
    const reply: Reply = { id: Date.now(), author: "Вы", text: replyText + (attachedFile ? ` [📎 ${attachedFile}]` : ""), time: "только что" };
    setTopics(prev => prev.map(t => t.id !== selectedTopicId ? t : { ...t, replies: [...t.replies, reply] }));
    setReplyText("");
    setAttachedFile(null);
  };

  const createTopic = () => {
    if (!newTopicTitle.trim()) return;
    const t: Topic = { id: Date.now(), title: newTopicTitle, author: currentUser.name, time: "только что", section: newTopicSection, replies: [] };
    setTopics(prev => [t, ...prev]);
    setNewTopicTitle("");
    setCreating(false);
    setSelectedTopicId(t.id);
  };

  if (selectedTopic) {
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
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
                  {r.author === "Вы" && <span className="tag text-xs" style={{ background: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.3)', color: '#10b981' }}>Вы</span>}
                  <span className="text-xs text-white/30 ml-auto">{r.time}</span>
                </div>
                <p className="text-sm text-white/70">{r.text}</p>
              </div>
            </div>
          ))}

          {selectedTopic.replies.length === 0 && (
            <p className="text-center text-white/30 text-sm py-6">Пока нет ответов — будьте первым!</p>
          )}

          {attachedFile && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(27,111,255,0.1)', border: '1px solid rgba(27,111,255,0.25)' }}>
              <Icon name="Paperclip" size={14} color="#4d8fff" />
              <span className="text-xs text-blue-300 flex-1">{attachedFile}</span>
              <button onClick={() => setAttachedFile(null)} className="text-white/40 hover:text-white/70"><Icon name="X" size={14} /></button>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <input className="input-field text-sm py-3 flex-1" placeholder="Написать ответ..." value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => e.key === "Enter" && sendReply()} />
            <button onClick={() => setAttachedFile("документ.pdf")} className="p-3 rounded-xl flex-shrink-0 transition-all active:scale-90" style={{ background: attachedFile ? 'rgba(27,111,255,0.3)' : 'rgba(27,111,255,0.15)', border: '1px solid rgba(27,111,255,0.3)' }}>
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
            <div className="flex gap-2">
              <button onClick={() => setCreating(false)} className="btn-ghost flex-1 text-sm">Отмена</button>
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
                    {topic.replies.length}
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
      </div>
    </div>
  );
}