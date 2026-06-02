import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import ModuleHeader from "@/components/ModuleHeader";

interface Props { onBack: () => void; }

interface Message { id: number; role: "user" | "bot"; text: string; time: string; }

const SUGGESTIONS = [
  "Как создать тикет в поддержку?",
  "Сделай краткий пересказ регламента",
  "Где найти договоры подразделения?",
  "Как добавить главу в видео?",
];

const BOT_ANSWERS: Record<string, string> = {
  default: "Я нашёл информацию по вашему запросу. Обратитесь в раздел «Документооборот» → «Инструкции» для подробностей. Если нужна помощь — создайте тикет в техподдержке.",
  "тикет": "Для создания тикета: откройте раздел «Тех. поддержка» → нажмите «Создать обращение» → заполните тему, описание и выберите приоритет. Ответ придёт в течение 4 рабочих часов.",
  "договор": "Договоры находятся в разделе «Документооборот» → фильтр «Категория: Договоры». Доступны для скачивания, отправки и печати. Доступ к некоторым документам ограничен по роли.",
  "видео": "Чтобы добавить главу в видео, загрузите файл в модуле «Видеоматериалы» (нужна роль видео-блогера), затем при редактировании укажите таймкоды для каждой главы.",
  "регламент": "Регламент технического осмотра объектов (видео 18:45): осмотр начинается с чек-листа → фиксация нарушений → составление отчёта. Шаблон чек-листа доступен в разделе «Чек-листы».",
};

function getBotAnswer(text: string): string {
  const lower = text.toLowerCase();
  for (const [key, answer] of Object.entries(BOT_ANSWERS)) {
    if (key !== "default" && lower.includes(key)) return answer;
  }
  return BOT_ANSWERS.default;
}

export default function AIModule({ onBack }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: "bot", text: "Привет! Я ИИ-ассистент корпоративной платформы. Могу ответить на вопросы по документам, чек-листам, новостям и помочь найти нужную информацию. Что вас интересует?", time: "сейчас" }
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now(), role: "user", text: text.trim(), time: "сейчас" };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      const botMsg: Message = { id: Date.now() + 1, role: "bot", text: getBotAnswer(text), time: "сейчас" };
      setMessages(prev => [...prev, botMsg]);
      setTyping(false);
    }, 1200 + Math.random() * 800);
  };

  return (
    <div className="min-h-screen relative z-10 animate-fade-in flex flex-col">
      <ModuleHeader title="ИИ Ассистент" onBack={onBack} subtitle="Онлайн" icon="Bot" iconColor="#a78bfa" />
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 max-w-2xl mx-auto w-full">
        {messages.length === 1 && (
          <div className="mb-6">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Частые вопросы</p>
            <div className="grid grid-cols-2 gap-2">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => sendMessage(s)} className="p-3 rounded-xl text-left text-xs text-white/70 hover:text-white transition-all hover:bg-white/10 animate-fade-up opacity-0" style={{ animationDelay: `${i * 0.06}s`, animationFillMode: 'forwards', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-up opacity-0`} style={{ animationFillMode: 'forwards' }}>
              {msg.role === "bot" && (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mr-2 mt-0.5 glow-sm" style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}>
                  <Icon name="Bot" size={16} color="white" />
                </div>
              )}
              <div className="max-w-xs">
                <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed" style={{
                  background: msg.role === "user" ? 'linear-gradient(135deg, #1b6fff, #0040cc)' : 'rgba(255,255,255,0.07)',
                  border: msg.role === "user" ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  color: 'white',
                  borderRadius: msg.role === "user" ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                }}>
                  {msg.text}
                </div>
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex justify-start animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mr-2 mt-0.5" style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}>
                <Icon name="Bot" size={16} color="white" />
              </div>
              <div className="px-4 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px 20px 20px 4px' }}>
                <div className="flex gap-1.5 items-center h-4">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/50" style={{ animation: `pulse-dot 1.2s ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="glass border-t border-white/10 px-4 py-4 sticky bottom-0">
        <div className="flex gap-2 max-w-2xl mx-auto">
          <input
            className="input-field flex-1 text-sm py-3"
            placeholder="Задайте вопрос..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
          />
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || typing} className="p-3 rounded-xl flex-shrink-0 transition-all disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}>
            <Icon name="Send" size={18} color="white" />
          </button>
        </div>
      </div>
    </div>
  );
}
