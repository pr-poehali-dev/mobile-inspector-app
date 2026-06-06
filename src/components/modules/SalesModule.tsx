import { useState, useMemo } from "react";
import Icon from "@/components/ui/icon";
import ModuleHeader from "@/components/ModuleHeader";
import { useApp } from "@/context/AppContext";
import { usePersistentState } from "@/hooks/usePersistentState";

interface Props { onBack: () => void; }

// ── Структура данных (готова к переносу на сервер) ──
interface Earning {
  id: number;
  buyerName: string;     // кто купил подписку по ссылке
  subscription: string;  // название купленной подписки
  amount: number;        // стоимость подписки, ₽
  commission: number;    // начисление партнёру (10%), ₽
  date: string;
}

interface SalesData {
  visits: number;            // переходов по ссылке
  purchases: number;         // покупок
  balance: number;           // доступно к выводу, ₽
  withdrawn: number;         // уже выведено, ₽
  earnings: Earning[];       // история начислений
  withdrawRequests: { id: number; amount: number; method: string; date: string; status: "В обработке" | "Выплачено" }[];
}

const COMMISSION_RATE = 0.10; // 10%
const BASE_SUBSCRIPTION_PRICE = 1990; // стоимость основной подписки приложения, ₽

// Демо-начисления для наглядности (только при первом запуске)
const seedEarnings = (): Earning[] => [
  { id: 1, buyerName: "Алексей М.", subscription: "Подписка PRO (год)", amount: 1990, commission: 199, date: "02.06.2026" },
  { id: 2, buyerName: "Ольга К.", subscription: "Подписка PRO (месяц)", amount: 490, commission: 49, date: "04.06.2026" },
];

export default function SalesModule({ onBack }: Props) {
  const { currentUser } = useApp();

  // Уникальный промокод/ссылка партнёра
  const promoCode = useMemo(() => `REF${currentUser.id}${(currentUser.phone || "").slice(-4)}`.toUpperCase(), [currentUser.id, currentUser.phone]);
  const refLink = `https://мобильный-инспектор.рф/?ref=${promoCode}`;

  const storeKey = `sales_data_user_${currentUser.id}`;
  const [data, setData] = usePersistentState<SalesData>(storeKey, {
    visits: 27,
    purchases: 2,
    balance: 248,
    withdrawn: 0,
    earnings: seedEarnings(),
    withdrawRequests: [],
  });

  const [copied, setCopied] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }).catch(() => {});
  };

  // Демонстрация: симуляция покупки по ссылке (для проверки логики 10%)
  const simulatePurchase = () => {
    const commission = Math.round(BASE_SUBSCRIPTION_PRICE * COMMISSION_RATE);
    const earning: Earning = { id: Date.now(), buyerName: "Новый клиент", subscription: "Подписка PRO (год)", amount: BASE_SUBSCRIPTION_PRICE, commission, date: new Date().toLocaleDateString("ru-RU") };
    setData(prev => ({ ...prev, purchases: prev.purchases + 1, visits: prev.visits + 1, balance: prev.balance + commission, earnings: [earning, ...prev.earnings] }));
    showToast(`💰 Начислено ${commission} ₽ (10% от ${BASE_SUBSCRIPTION_PRICE} ₽)`);
  };

  const submitWithdraw = () => {
    const amt = Number(withdrawAmount);
    if (!amt || amt <= 0 || amt > data.balance || !withdrawMethod.trim()) return;
    setData(prev => ({
      ...prev,
      balance: prev.balance - amt,
      withdrawn: prev.withdrawn + amt,
      withdrawRequests: [{ id: Date.now(), amount: amt, method: withdrawMethod, date: new Date().toLocaleDateString("ru-RU"), status: "В обработке" }, ...prev.withdrawRequests],
    }));
    setWithdrawOpen(false); setWithdrawAmount(""); setWithdrawMethod("");
    showToast("📤 Запрос на вывод отправлен");
  };

  return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      {toast && <Toast msg={toast} />}
      <ModuleHeader title="Продажи" subtitle="Партнёрский канал · 10% с каждой подписки" onBack={onBack} icon="TrendingUp" iconColor="#22c55e" />
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
        {/* Баланс */}
        <div className="glass-strong rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(16,185,129,0.05))' }}>
          <p className="text-xs text-white/50 uppercase tracking-wider">Доступно к выводу</p>
          <p className="text-3xl font-bold text-white mt-1">{data.balance.toLocaleString("ru-RU")} ₽</p>
          <div className="flex gap-4 mt-3 text-xs text-white/50">
            <span>Выведено: <span className="text-white/80">{data.withdrawn.toLocaleString("ru-RU")} ₽</span></span>
            <span>Всего заработано: <span className="text-green-400 font-semibold">{(data.balance + data.withdrawn).toLocaleString("ru-RU")} ₽</span></span>
          </div>
          <button onClick={() => { setWithdrawOpen(true); setWithdrawAmount(String(data.balance)); }} disabled={data.balance <= 0} className="btn-primary mt-4 flex items-center justify-center gap-2 disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
            <Icon name="Wallet" size={18} />Вывести средства
          </button>
        </div>

        {/* Промокод / ссылка */}
        <div className="glass rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Ваш промокод и ссылка</p>
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}>
            <Icon name="Ticket" size={18} color="#22c55e" />
            <span className="text-base font-bold text-white tracking-wide flex-1">{promoCode}</span>
            <button onClick={() => { copy(promoCode); showToast("Промокод скопирован"); }} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e' }}>Копировать</button>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Icon name="Link" size={16} color="rgba(255,255,255,0.5)" />
            <span className="text-xs text-white/60 flex-1 truncate">{refLink}</span>
            <button onClick={() => { copy(refLink); showToast("Ссылка скопирована"); }} className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1" style={{ background: copied ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)', color: copied ? '#22c55e' : 'rgba(255,255,255,0.7)' }}><Icon name={copied ? "Check" : "Copy"} size={13} />{copied ? "Готово" : "Копировать"}</button>
          </div>
          <p className="text-xs text-white/30">Поделитесь ссылкой. Когда новый пользователь оформит подписку, вы получите 10% на счёт.</p>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-3 gap-2">
          <Stat icon="MousePointerClick" color="#3b82f6" value={data.visits} label="Переходов" />
          <Stat icon="ShoppingCart" color="#f59e0b" value={data.purchases} label="Покупок" />
          <Stat icon="Coins" color="#22c55e" value={`${(data.balance + data.withdrawn).toLocaleString("ru-RU")}`} label="Заработано ₽" />
        </div>

        {/* Кнопка симуляции (демо логики начисления) */}
        <button onClick={simulatePurchase} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'rgba(34,197,94,0.1)', border: '1px dashed rgba(34,197,94,0.35)', color: '#22c55e' }}>
          <Icon name="Play" size={15} />Симулировать покупку по ссылке (демо)
        </button>

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

      {/* Модалка вывода */}
      {withdrawOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setWithdrawOpen(false)}>
          <div className="w-full max-w-md mx-4 mb-4 sm:mb-0 glass-strong rounded-3xl p-6 animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4"><div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.2)' }}><Icon name="Wallet" size={16} color="#22c55e" /></div><h3 className="text-base font-bold text-white">Вывод средств</h3></div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Сумма (доступно {data.balance} ₽)</label>
            <input className="input-field mb-3" type="number" placeholder="0" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} />
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Реквизиты для вывода</label>
            <input className="input-field mb-4" placeholder="Номер карты / счёт / телефон СБП" value={withdrawMethod} onChange={e => setWithdrawMethod(e.target.value)} />
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
