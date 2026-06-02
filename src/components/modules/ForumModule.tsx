import { useState } from "react";
import Icon from "@/components/ui/icon";
import ModuleHeader from "@/components/ModuleHeader";

interface Props { onBack: () => void; }

interface Reply { id: number; author: string; text: string; time: string; }
interface Topic { id: number; title: string; author: string; time: string; section: string; replies: Reply[]; pinned?: boolean; hasFile?: boolean; }

const SECTIONS = ["Все", "Техподдержка", "Общее", "Проекты"];

const TOPICS: Topic[] = [
  { id: 1, title: "Не работает авторизация через мобильное приложение", author: "Дмитрий Ф.", time: "2 часа назад", section: "Техподдержка", pinned: true, replies: [
    { id: 1, author: "Поддержка", text: "Проблема зафиксирована, ожидайте исправления в течение 2 часов.", time: "1 час назад" },
    { id: 2, author: "Дмитрий Ф.", text: "Всё заработало, спасибо!", time: "30 мин назад" },
  ]},
  { id: 2, title: "Когда будет добавлена функция экспорта в Excel?", author: "Ольга Н.", time: "5 часов назад", section: "Общее", replies: [
    { id: 1, author: "Администратор", text: "Функция запланирована на июль 2026. Следите за обновлениями в новостной ленте.", time: "4 часа назад" },
  ]},
  { id: 3, title: "Обсуждение проекта реконструкции склада №3", author: "Алексей В.", time: "вчера", section: "Проекты", hasFile: true, replies: [
    { id: 1, author: "Марина К.", text: "Предлагаю рассмотреть вариант с расширением зоны погрузки.", time: "вчера" },
    { id: 2, author: "Алексей В.", text: "Хорошая идея, добавил в смету.", time: "вчера" },
    { id: 3, author: "Сергей П.", text: "Прикладываю обновлённые чертежи.", time: "18 часов назад" },
  ]},
  { id: 4, title: "Правила оформления командировочных отчётов", author: "HR-отдел", time: "3 дня назад", section: "Общее", replies: [] },
];

export default function ForumModule({ onBack }: Props) {
  const [section, setSection] = useState("Все");
  const [topics, setTopics] = useState<Topic[]>(TOPICS);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [attachedFile, setAttachedFile] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicSection, setNewTopicSection] = useState("Общее");

  const selectedTopic = topics.find(t => t.id === selectedTopicId) || null;
  const filtered = topics.filter(t => section === "Все" || t.section === section);

  const sendReply = () => {
    if (!replyText.trim() || !selectedTopicId) return;
    const reply: Reply = { id: Date.now(), author: "Вы", text: replyText + (attachedFile ? ` [📎 ${attachedFile}]` : ""), time: "только что" };
    setTopics(prev => prev.map(t => t.id !== selectedTopicId ? t : { ...t, replies: [...t.replies, reply] }));
    setReplyText("");
    setAttachedFile(null);
  };

  const createTopic = () => {
    if (!newTopicTitle.trim()) return;
    const t: Topic = { id: Date.now(), title: newTopicTitle, author: "Вы", time: "только что", section: newTopicSection, replies: [] };
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
            <h2 className="text-base font-bold text-white mb-2">{selectedTopic.title}</h2>
            <div className="flex items-center gap-3 text-xs text-white/40">
              <span className="flex items-center gap-1"><Icon name="User" size={12} />{selectedTopic.author}</span>
              <span>{selectedTopic.time}</span>
              {selectedTopic.hasFile && <span className="flex items-center gap-1 text-blue-400"><Icon name="Paperclip" size={12} />Есть вложение</span>}
            </div>
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
          {filtered.map((topic, i) => (
            <button key={topic.id} onClick={() => setSelectedTopicId(topic.id)} className={`w-full text-left card-module animate-fade-up opacity-0`} style={{ animationDelay: `${0.05 + i * 0.06}s`, animationFillMode: 'forwards' }}>
              <div className="flex items-start gap-2 mb-2">
                <span className="tag text-xs flex-shrink-0">{topic.section}</span>
                {topic.pinned && <span className="flex items-center gap-1 text-xs text-orange-400"><Icon name="Pin" size={11} />Закреплено</span>}
              </div>
              <h3 className="text-sm font-semibold text-white mb-2 leading-snug">{topic.title}</h3>
              <div className="flex items-center justify-between text-xs text-white/40">
                <span className="flex items-center gap-1"><Icon name="User" size={11} />{topic.author} · {topic.time}</span>
                <span className="flex items-center gap-1">
                  <Icon name="MessageCircle" size={11} />
                  {topic.replies.length}
                  {topic.hasFile && <><Icon name="Paperclip" size={11} className="ml-2" /><span className="text-blue-400/70">файл</span></>}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}