import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useApp, ContentKind } from "@/context/AppContext";

interface Props {
  kind: ContentKind;
  id: number | string;
  authorId?: number;
  className?: string;
  size?: number;
}

/**
 * Невидимая для обычных пользователей кнопка модерации.
 * Видна только администратору. По нажатию блокирует/разблокирует контент,
 * а автору уходит уведомление о нарушении правил.
 */
export default function AdminBlockButton({ kind, id, authorId, className = "", size = 14 }: Props) {
  const { isAdmin, isContentBlocked, blockContent, unblockContent } = useApp();
  const [flash, setFlash] = useState<string | null>(null);

  if (!isAdmin) return null;

  const blocked = isContentBlocked(kind, id);

  const handle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (blocked) {
      unblockContent(kind, id);
      setFlash("Восстановлено");
    } else {
      blockContent(kind, id, authorId);
      setFlash("Заблокировано");
    }
    setTimeout(() => setFlash(null), 1500);
  };

  return (
    <button
      onClick={handle}
      title={blocked ? "Восстановить контент" : "Заблокировать (нарушение правил)"}
      className={`relative flex items-center justify-center rounded-lg transition-all active:scale-90 ${className}`}
      style={{ background: blocked ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.15)', border: `1px solid ${blocked ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.35)'}`, width: size + 16, height: size + 16 }}
    >
      <Icon name={blocked ? "Eye" : "ShieldAlert"} size={size} color={blocked ? "#10b981" : "#ef4444"} />
      {flash && (
        <span className="absolute -top-7 right-0 px-2 py-1 rounded-lg text-xs font-medium text-white whitespace-nowrap z-30" style={{ background: 'rgba(0,0,0,0.8)' }}>{flash}</span>
      )}
    </button>
  );
}
