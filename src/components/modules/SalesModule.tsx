import { useState, useMemo, useRef } from "react";
import Icon from "@/components/ui/icon";
import ModuleHeader from "@/components/ModuleHeader";
import { useApp } from "@/context/AppContext";
import { useSharedState } from "@/hooks/useSharedState";

interface Props { onBack: () => void; }

// ── Структура данных ──
interface Earning {
  id: number;
  buyerName: string;
  subscription: string;
  amount: number;
  commission: number;
  date: string;
}

interface SalesData {
  visits: number;
  purchases: number;
  balance: number;
  withdrawn: number;
  earnings: Earning[];
  withdrawRequests: { id: number; amount: number; method: string; date: string; status: "В обработке" | "Выплачено" }[];
}

// Профиль менеджера по продажам
interface ManagerProfile {
  name: string;
  photo: string;       // data-url
  requisites: string;  // реквизиты для вывода
  phone: string;
}

// Обращение к администрации
export interface ManagerAppeal {
  id: number;
  userId: number;
  userName: string;
  amount: number;
  requisites: string;
  date: string;
  status: "Новое" | "В обработке" | "Выплачено";
}

const COMMISSION_RATE = 0.10;
const BASE_SUBSCRIPTION_PRICE = 1990;

const seedEarnings = (): Earning[] => [
  { id: 1, buyerName: "Алексей М.", subscription: "Подписка PRO (год)", amount: 1990, commission: 199, date: "02.06.2026" },
  { id: 2, buyerName: "Ольга К.", subscription: "Подписка PRO (месяц)", amount: 490, commission: 49, date: "04.06.2026" },
];

export default function SalesModule({ onBack }: Props) {
  const { currentUser } = useApp();

  const promoCode = useMemo(() => `REF${currentUser.id}${(currentUser.phone || "").slice(-4)}`.toUpperCase(), [currentUser.id, currentUser.phone]);
  // Реферальная ссылка — официальный сайт приложения с промокодом
  const refLink = `https://mobilinspector.ru/?ref=${promoCode}`;

  const storeKey = `sales_data_user_${currentUser.id}`;
  const [data, setData] = useSharedState<SalesData>(storeKey, {
    visits: 27, purchases: 2, balance: 248, withdrawn: 0,
    earnings: seedEarnings(), withdrawRequests: [],
  });

  // Кабинет менеджера
  const [managerProfile, setManagerProfile] = useSharedState<ManagerProfile>(
    `manager_profile_${currentUser.id}`,
    { name: currentUser.name, photo: "", requisites: "", phone: currentUser.phone || "" }
  );
  // Обращения к администрации — общий стор (все менеджеры)
  const [managerAppeals, setManagerAppeals] = useSharedState<ManagerAppeal[]>("manager_appeals", []);

  const [view, setView] = useState<"main" | "cabinet" | "appeal">("main");
  const [copied, setCopied] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("");
  const [appealText, setAppealText] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };
  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }).catch(() => {});
  };

  const submitWithdraw = () => {
    const amt = Number(withdrawAmount);
    const method = withdrawMethod.trim() || managerProfile.requisites;
    if (!amt || amt <= 0 || amt > data.balance || !method) return;
    // Создаём запрос на вывод
    setData(prev => ({
      ...prev,
      balance: prev.balance - amt,
      withdrawn: prev.withdrawn + amt,
      withdrawRequests: [{ id: Date.now(), amount: amt, method, date: new Date().toLocaleDateString("ru-RU"), status: "В обработке" }, ...prev.withdrawRequests],
    }));
    // Создаём обращение к администрации для реестра выплат
    setManagerAppeals(prev => [...prev, {
      id: Date.now(),
      userId: currentUser.id,
      userName: managerProfile.name || currentUser.name,
      amount: amt,
      requisites: method,
      date: new Date().toLocaleString("ru-RU"),
      status: "Новое",
    }]);
    setWithdrawOpen(false); setWithdrawAmount(""); setWithdrawMethod("");
    showToast("📤 Запрос на вывод отправлен — обработка каждого 5-го числа");
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => setManagerProfile(p => ({ ...p, photo: r.result as string })); r.readAsDataURL(f); e.target.value = "";
  };

  // ── КАБИНЕТ МЕНЕДЖЕРА ──
  if (view === "cabinet") {
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        {toast && <Toast msg={toast} />}
        <ModuleHeader title="Кабинет менеджера" onBack={() => setView("main")} icon="UserCog" iconColor="#22c55e" />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
          {/* Фото */}
          <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          <div className="flex flex-col items-center gap-3 py-2">
            <button onClick={() => photoRef.current?.click()} className="relative w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(34,197,94,0.15)', border: '2px dashed rgba(34,197,94,0.4)' }}>
              {managerProfile.photo ? <img src={managerProfile.photo} alt="" className="w-full h-full object-cover" /> : <Icon name="Camera" size={28} color="rgba(34,197,94,0.7)" />}
              <div className="absolute bottom-0 inset-x-0 py-1 text-center text-xs text-white/60" style={{ background: 'rgba(0,0,0,0.5)' }}>Фото</div>
            </button>
          </div>

          <div className="glass rounded-2xl p-4 space-y-3">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Личные данные</p>
            <div>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5 block">Имя</label>
              <input className="input-field" value={managerProfile.name} onChange={e => setManagerProfile(p => ({ ...p, name: e.target.value }))} placeholder="Ваше имя" />
            </div>
            <div>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5 block">Телефон</label>
              <input className="input-field" type="tel" value={managerProfile.phone} onChange={e => setManagerProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+7 (___) ___-__-__" />
            </div>
          </div>

          <div className="glass rounded-2xl p-4 space-y-3">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Реквизиты для вывода средств</p>
            <p className="text-xs text-white/40">Используются автоматически при запросе вывода средств</p>
            <textarea className="input-field resize-none" rows={4} placeholder="Номер карты / счёт / телефон СБП / ИНН..." value={managerProfile.requisites} onChange={e => setManagerProfile(p => ({ ...p, requisites: e.target.value }))} />
          </div>

          <button onClick={() => { showToast("✅ Данные сохранены"); setView("main"); }} className="btn-primary flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
            <Icon name="Check" size={18} />Сохранить
          </button>

          {/* Обратиться к администрации */}
          <button onClick={() => setView("appeal")} className="w-full flex items-center gap-3 p-4 rounded-2xl text-left" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <Icon name="MessageSquare" size={18} color="#ef4444" />
            <div className="flex-1"><p className="text-sm font-semibold text-white">Обратиться к администрации</p><p className="text-xs text-white/40">Вопросы по выплатам и сотрудничеству</p></div>
            <Icon name="ChevronRight" size={16} color="rgba(255,255,255,0.3)" />
          </button>
        </div>
      </div>
    );
  }

  // ── ОБРАЩЕНИЕ К АДМИНИСТРАЦИИ ──
  if (view === "appeal") {
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        {toast && <Toast msg={toast} />}
        <ModuleHeader title="Обращение к администрации" onBack={() => setView("cabinet")} icon="MessageSquare" iconColor="#ef4444" />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
          <div className="glass rounded-2xl p-4">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Ваш запрос</p>
            <textarea className="input-field resize-none" rows={5} placeholder="Опишите вашу проблему или вопрос..." value={appealText} onChange={e => setAppealText(e.target.value)} />
          </div>
          <button onClick={() => {
            if (!appealText.trim()) return;
            setManagerAppeals(prev => [...prev, { id: Date.now(), userId: currentUser.id, userName: managerProfile.name || currentUser.name, amount: 0, requisites: appealText.trim(), date: new Date().toLocaleString("ru-RU"), status: "Новое" }]);
            setAppealText(""); showToast("✅ Обращение отправлено администратору"); setView("cabinet");
          }} disabled={!appealText.trim()} className="btn-primary flex items-center justify-center gap-2 disabled:opacity-40">
            <Icon name="Send" size={18} />Отправить обращение
          </button>
        </div>
      </div>
    );
  }

  // ── ГЛАВНЫЙ ЭКРАН ──
  return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      {toast && <Toast msg={toast} />}
      <ModuleHeader title="Продажи" subtitle="Партнёрский канал · 10% с каждой подписки" onBack={onBack} icon="TrendingUp" iconColor="#22c55e" />
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">

        {/* Кабинет менеджера */}
        <button onClick={() => setView("cabinet")} className="w-full flex items-center gap-3 p-4 rounded-2xl text-left" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
          {managerProfile.photo ? <img src={managerProfile.photo} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" /> : <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(34,197,94,0.15)' }}><Icon name="UserCog" size={20} color="#22c55e" /></div>}
          <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-white">{managerProfile.name || "Кабинет менеджера"}</p><p className="text-xs text-white/40">{managerProfile.requisites ? "Реквизиты заполнены" : "Укажите реквизиты для вывода"}</p></div>
          <Icon name="ChevronRight" size={16} color="rgba(255,255,255,0.3)" />
        </button>

        {/* Баланс */}
        <div className="glass-strong rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(16,185,129,0.05))' }}>
          <p className="text-xs text-white/50 uppercase tracking-wider">Доступно к выводу</p>
          <p className="text-3xl font-bold text-white mt-1">{data.balance.toLocaleString("ru-RU")} ₽</p>
          <div className="flex gap-4 mt-3 text-xs text-white/50">
            <span>Выведено: <span className="text-white/80">{data.withdrawn.toLocaleString("ru-RU")} ₽</span></span>
            <span>Всего заработано: <span className="text-green-400 font-semibold">{(data.balance + data.withdrawn).toLocaleString("ru-RU")} ₽</span></span>
          </div>
          {/* Информация о выводе */}
          <div className="flex items-start gap-2 mt-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <Icon name="Info" size={14} color="rgba(255,255,255,0.4)" className="flex-shrink-0 mt-0.5" />
            <p className="text-xs text-white/40">Вывод средств осуществляется 1 раз в месяц, каждого <span className="text-white/70 font-semibold">5-го числа</span>, по реквизитам указанным в кабинете менеджера.</p>
          </div>
          <button onClick={() => { setWithdrawOpen(true); setWithdrawAmount(String(data.balance)); setWithdrawMethod(managerProfile.requisites); }} disabled={data.balance <= 0} className="btn-primary mt-4 flex items-center justify-center gap-2 disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
            <Icon name="Wallet" size={18} />Вывести средства
          </button>
        </div>

        {/* Промокод / ссылка */}
        <div className="glass rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Ваш промокод и реферальная ссылка</p>
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}>
            <Icon name="Ticket" size={18} color="#22c55e" />
            <span className="text-base font-bold text-white tracking-wide flex-1">{promoCode}</span>
            <button onClick={() => { copy(promoCode); showToast("Промокод скопирован"); }} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e' }}>Копировать</button>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Icon name="Link" size={16} color="rgba(255,255,255,0.5)" />
            <a href={refLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 flex-1 truncate transition-colors">{refLink}</a>
            <button onClick={() => { copy(refLink); showToast("Ссылка скопирована"); }} className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 flex-shrink-0" style={{ background: copied ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)', color: copied ? '#22c55e' : 'rgba(255,255,255,0.7)' }}><Icon name={copied ? "Check" : "Copy"} size={13} />{copied ? "Готово" : "Копировать"}</button>
          </div>
          <p className="text-xs text-white/40 leading-relaxed">Поделитесь ссылкой нашего приложения. Когда новый пользователь оформит подписку по вашему реферальному коду, вы получите <span className="text-green-400 font-semibold">10% от чека</span> на счёт.</p>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-3 gap-2">
          <Stat icon="MousePointerClick" color="#3b82f6" value={data.visits} label="Переходов" />
          <Stat icon="ShoppingCart" color="#f59e0b" value={data.purchases} label="Покупок" />
          <Stat icon="Coins" color="#22c55e" value={`${(data.balance + data.withdrawn).toLocaleString("ru-RU")}`} label="Заработано ₽" />
        </div>

        {/* История начислений */}
        <div>
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider px-1 mb-2">История начислений</p>
          <div className="space-y-2">
            {data.earnings.map(e => (
              <div key={e.id} className="glass rounded-2xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(34,197,94,0.15)' }}><Icon name="ArrowDownLeft" size={16} color="#22c55e" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{e.buyerName}</p>
                  <p className="text-xs text-white/40">{e.subscription} · {e.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-400">+{e.commission} ₽</p>
                  <p className="text-xs text-white/30">из {e.amount} ₽</p>
                </div>
              </div>
            ))}
            {data.earnings.length === 0 && <div className="text-center py-8 text-white/30 text-sm">Пока нет начислений</div>}
          </div>
        </div>

        {/* История выводов */}
        {data.withdrawRequests.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider px-1 mb-2">Запросы на вывод</p>
            <div className="space-y-2">
              {data.withdrawRequests.map(w => (
                <div key={w.id} className="glass rounded-2xl p-3 flex items-center gap-3">
                  <Icon name="Banknote" size={16} color="#f59e0b" />
                  <div className="flex-1"><p className="text-sm text-white">{w.amount.toLocaleString("ru-RU")} ₽</p><p className="text-xs text-white/40">{w.method} · {w.date}</p></div>
                  <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: w.status === "Выплачено" ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: w.status === "Выплачено" ? '#10b981' : '#f59e0b' }}>{w.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Модалка вывода — реквизиты автоматически из кабинета */}
      {withdrawOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setWithdrawOpen(false)}>
          <div className="w-full max-w-md mx-4 mb-4 sm:mb-0 glass-strong rounded-3xl p-6 animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4"><div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.2)' }}><Icon name="Wallet" size={16} color="#22c55e" /></div><h3 className="text-base font-bold text-white">Вывод средств</h3></div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Сумма (доступно {data.balance.toLocaleString("ru-RU")} ₽)</label>
            <input className="input-field mb-3" type="number" placeholder="0" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} />
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5 block">Реквизиты для вывода</label>
            {managerProfile.requisites && <p className="text-xs text-white/40 mb-2 flex items-center gap-1"><Icon name="CheckCircle" size={12} color="#22c55e" />Подтянуты из кабинета менеджера</p>}
            <textarea className="input-field resize-none mb-4" rows={3} placeholder="Номер карты / счёт / телефон СБП" value={withdrawMethod} onChange={e => setWithdrawMethod(e.target.value)} />
            <div className="flex items-start gap-2 p-3 rounded-xl mb-4" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <Icon name="Clock" size={14} color="#f59e0b" className="flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-200/70">Выплата производится каждого 5-го числа месяца</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setWithdrawOpen(false)} className="btn-ghost flex-1 text-sm">Отмена</button>
              <button onClick={submitWithdraw} disabled={!Number(withdrawAmount) || Number(withdrawAmount) > data.balance || !withdrawMethod.trim()} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2 disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}><Icon name="Send" size={15} />Запросить вывод</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, color, value, label }: { icon: string; color: string; value: string | number; label: string }) {
  return (
    <div className="glass rounded-2xl p-3 text-center">
      <Icon name={icon} size={18} color={color} className="mx-auto mb-1" />
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-xs text-white/40">{label}</div>
    </div>
  );
}

function Toast({ msg }: { msg: string }) {
  return <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl text-sm font-medium text-white animate-fade-up" style={{ background: 'rgba(34,197,94,0.92)', backdropFilter: 'blur(12px)', animationFillMode: 'forwards' }}>{msg}</div>;
}