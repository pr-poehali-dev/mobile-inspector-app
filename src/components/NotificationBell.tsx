import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useApp } from "@/context/AppContext";

export default function NotificationBell() {
  const { myNotifications, markNotificationsRead } = useApp();
  const [open, setOpen] = useState(false);
  const unread = myNotifications.filter(n => !n.read).length;

  const TYPE_ICON: Record<string, { icon: string; color: string }> = {
    block: { icon: "ShieldAlert", color: "#ef4444" },
    role: { icon: "BadgeCheck", color: "#10b981" },
    info: { icon: "Info", color: "#3b82f6" },
  };

  return (
    <div className="relative">
      <button onClick={() => { setOpen(o => !o); if (!open) markNotificationsRead(); }} className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors">
        <Icon name="Bell" size={18} color="white" />
        {unread > 0 && <span className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold" style={{ background: '#ef4444', fontSize: '9px' }}>{unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-40 w-72 max-h-96 overflow-y-auto rounded-2xl glass-strong p-2 animate-scale-in" style={{ transformOrigin: 'top right' }}>
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider px-3 py-2">Уведомления</p>
            {myNotifications.length === 0 ? (
              <div className="text-center py-8"><Icon name="BellOff" size={28} color="rgba(255,255,255,0.2)" className="mx-auto mb-2" /><p className="text-white/30 text-sm">Нет уведомлений</p></div>
            ) : (
              myNotifications.map(n => {
                const ti = TYPE_ICON[n.type] || TYPE_ICON.info;
                return (
                  <div key={n.id} className="flex gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${ti.color}18` }}><Icon name={ti.icon} size={14} color={ti.color} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80 leading-snug">{n.text}</p>
                      <p className="text-xs text-white/30 mt-0.5">{n.date}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
