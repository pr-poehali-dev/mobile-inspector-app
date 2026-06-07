import { useState, useRef } from "react";
import { User } from "@/pages/Index";
import Icon from "@/components/ui/icon";

interface Props {
  onLogin: (user: User) => void;
}

type Step = "welcome" | "phone" | "otp" | "consent" | "credentials" | "login" | "admin";

const ADMIN_PHONE_DIGITS = "79682619505";

// ── Хранилище аккаунтов (demo, localStorage). Идентичность по номеру телефона. ──
interface StoredAccount { phone: string; name: string; login: string; password: string; }
const ACCOUNTS_KEY = "mi_accounts_v1";
function loadAccounts(): StoredAccount[] {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]"); } catch { return []; }
}
function saveAccount(acc: StoredAccount) {
  const list = loadAccounts().filter(a => a.phone !== acc.phone);
  list.push(acc);
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
}
function findAccount(loginOrPhone: string): StoredAccount | undefined {
  const id = loginOrPhone.trim().toLowerCase();
  const digits = loginOrPhone.replace(/\D/g, "");
  return loadAccounts().find(a => a.login.toLowerCase() === id || a.phone === digits);
}

const LEGAL_DOCS = [
  {
    id: "terms",
    label: "Пользовательское соглашение",
    text: `ПОЛЬЗОВАТЕЛЬСКОЕ СОГЛАШЕНИЕ

Настоящее Пользовательское соглашение (далее — «Соглашение») регулирует отношения между ООО «Мобильный Инспектор» (далее — «Компания») и пользователем (далее — «Пользователь») при использовании мобильного приложения «Мобильный Инспектор».

1. ПРЕДМЕТ СОГЛАШЕНИЯ
1.1. Компания предоставляет Пользователю доступ к функциям корпоративной платформы «Мобильный Инспектор» на условиях, изложенных в настоящем Соглашении.
1.2. Использование приложения означает полное и безоговорочное принятие настоящего Соглашения.

2. ПРАВА И ОБЯЗАННОСТИ ПОЛЬЗОВАТЕЛЯ
2.1. Пользователь обязуется использовать приложение только в законных целях.
2.2. Пользователь обязуется не передавать третьим лицам свои учётные данные.
2.3. Пользователь несёт ответственность за все действия, совершённые с его учётной записи.

3. ПРАВА И ОБЯЗАННОСТИ КОМПАНИИ
3.1. Компания обязуется обеспечить работоспособность приложения в соответствии с техническими возможностями.
3.2. Компания вправе блокировать доступ при нарушении условий настоящего Соглашения.

4. ОТВЕТСТВЕННОСТЬ
4.1. Компания не несёт ответственности за убытки, возникшие вследствие неправомерных действий третьих лиц.

5. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ
5.1. Настоящее Соглашение регулируется законодательством Российской Федерации.
5.2. Все споры разрешаются в соответствии с действующим законодательством РФ.`
  },
  {
    id: "privacy",
    label: "Политика конфиденциальности",
    text: `ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ

Настоящая Политика конфиденциальности описывает порядок обработки персональных данных в приложении «Мобильный Инспектор» в соответствии с требованиями Федерального закона № 152-ФЗ «О персональных данных».

1. КАТЕГОРИИ ОБРАБАТЫВАЕМЫХ ДАННЫХ
1.1. Номер мобильного телефона — для идентификации и аутентификации.
1.2. Имя пользователя — для персонализации интерфейса.
1.3. Данные об активности — для обеспечения безопасности и улучшения сервиса.

2. ЦЕЛИ ОБРАБОТКИ
2.1. Предоставление доступа к функциям приложения.
2.2. Обеспечение информационной безопасности.
2.3. Исполнение обязательств перед пользователем.

3. ХРАНЕНИЕ ДАННЫХ
3.1. Данные хранятся на защищённых серверах на территории Российской Федерации.
3.2. Срок хранения: в течение срока действия учётной записи + 3 года.

4. ПЕРЕДАЧА ДАННЫХ ТРЕТЬИМ ЛИЦАМ
4.1. Данные не передаются третьим лицам без согласия пользователя, кроме случаев, предусмотренных законом.

5. ПРАВА СУБЪЕКТА ДАННЫХ
5.1. Пользователь вправе запросить доступ, исправление или удаление своих данных.
5.2. Запросы направляются по адресу: privacy@mobile-inspector.ru`
  },
  {
    id: "pd",
    label: "Согласие на обработку персональных данных (152-ФЗ)",
    text: `СОГЛАСИЕ НА ОБРАБОТКУ ПЕРСОНАЛЬНЫХ ДАННЫХ

В соответствии с требованиями Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных», настоящим даю своё согласие ООО «Мобильный Инспектор» (ИНН: ХХХХХХХХ, адрес: г. Москва) на обработку следующих персональных данных:

ПЕРЕЧЕНЬ ПЕРСОНАЛЬНЫХ ДАННЫХ:
— номер мобильного телефона;
— имя и фамилия (при указании);
— данные о действиях в приложении.

ЦЕЛИ ОБРАБОТКИ:
— идентификация и аутентификация в системе;
— обеспечение работы корпоративной платформы;
— направление уведомлений, связанных с работой сервиса.

СПОСОБЫ ОБРАБОТКИ: сбор, запись, систематизация, хранение, уточнение, использование, передача (в пределах, установленных настоящим согласием), блокирование, удаление, уничтожение.

СРОК ДЕЙСТВИЯ СОГЛАСИЯ: с момента регистрации до отзыва согласия.

Согласие может быть отозвано путём направления письменного заявления на адрес: privacy@mobile-inspector.ru.

Настоящее согласие выдано в соответствии со статьёй 9 Федерального закона № 152-ФЗ «О персональных данных».`
  }
];

export default function AuthScreen({ onLogin }: Props) {
  const [step, setStep] = useState<Step>("welcome");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [consents, setConsents] = useState({ terms: false, privacy: false, pd: false });
  const [loading, setLoading] = useState(false);
  const [openDoc, setOpenDoc] = useState<string | null>(null);
  // Регистрация: логин, пароль, имя
  const [regName, setRegName] = useState("");
  const [regLogin, setRegLogin] = useState("");
  const [regPassword, setRegPassword] = useState("");
  // Вход: логин/телефон + пароль
  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const otpRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (digits.length === 0) return "";
    let formatted = "+7";
    if (digits.length > 1) formatted += " (" + digits.slice(1, 4);
    if (digits.length >= 4) formatted += ") " + digits.slice(4, 7);
    if (digits.length >= 7) formatted += "-" + digits.slice(7, 9);
    if (digits.length >= 9) formatted += "-" + digits.slice(9, 11);
    return formatted;
  };

  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    const trimmed = raw.startsWith("7") ? raw : raw.startsWith("8") ? "7" + raw.slice(1) : "7" + raw;
    setPhone(trimmed.slice(0, 11));
  };

  const handleSendCode = () => {
    if (phone.length < 11) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); setStep("otp"); }, 1000);
  };

  const handleAdminLogin = () => {
    if (phone !== ADMIN_PHONE_DIGITS) return;
    onLogin({ phone, name: "Администратор", role: "admin" });
  };

  const handleOtpChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[i] = val.slice(-1);
    setOtp(newOtp);
    if (val && i < 3) otpRefs[i + 1].current?.focus();
    if (newOtp.every(v => v !== "") && newOtp.join("").length === 4) {
      setTimeout(() => verifyOtp(newOtp.join("")), 200);
    }
  };

  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      otpRefs[i - 1].current?.focus();
    }
  };

  const verifyOtp = (code: string) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Любой 4-значный код подтверждает номер. Дальше — согласие и создание логина/пароля.
      if (code.length === 4) setStep("consent");
    }, 800);
  };

  const allConsents = consents.terms && consents.privacy && consents.pd;

  // Регистрация: после согласия переходим к созданию логина и пароля
  const handleAcceptConsents = () => {
    if (!allConsents) return;
    setStep("credentials");
  };

  const canFinishReg = regName.trim().length >= 2 && regLogin.trim().length >= 3 && regPassword.length >= 4;
  const handleFinishRegister = () => {
    if (!canFinishReg) return;
    if (findAccount(regLogin)) { setAuthError("Такой логин уже занят"); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      saveAccount({ phone, name: regName.trim(), login: regLogin.trim(), password: regPassword });
      onLogin({ phone, name: regName.trim(), role: "user" });
    }, 700);
  };

  // Вход по существующему аккаунту (логин или телефон + пароль)
  const handleExistingLogin = () => {
    setAuthError("");
    const acc = findAccount(loginId);
    if (!acc) { setAuthError("Аккаунт не найден. Зарегистрируйтесь."); return; }
    if (acc.password !== loginPassword) { setAuthError("Неверный пароль"); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin({ phone: acc.phone, name: acc.name, role: "user" });
    }, 600);
  };

  const currentDoc = LEGAL_DOCS.find(d => d.id === openDoc);

  if (openDoc && currentDoc) {
    return (
      <div className="min-h-screen flex flex-col animate-fade-in" style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1530 100%)' }}>
        <div className="glass border-b border-white/10 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
          <button onClick={() => setOpenDoc(null)} className="p-2 rounded-xl hover:bg-white/10 transition-colors text-white">
            <Icon name="ArrowLeft" size={20} />
          </button>
          <span className="font-semibold text-white text-sm">{currentDoc.label}</span>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <pre className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed font-sans" style={{ fontFamily: 'Golos Text, sans-serif' }}>
            {currentDoc.text}
          </pre>
        </div>
        <div className="p-6">
          <button className="btn-primary" onClick={() => {
            setConsents(prev => ({ ...prev, [openDoc]: true }));
            setOpenDoc(null);
          }}>
            Принять и вернуться
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1530 100%)' }}>
      <div className="bg-orb w-80 h-80 opacity-25" style={{ background: 'radial-gradient(circle, #1b6fff, transparent)', top: '-80px', left: '-80px' }} />
      <div className="bg-orb w-60 h-60 opacity-15" style={{ background: 'radial-gradient(circle, #7c3aed, transparent)', bottom: '-40px', right: '-40px' }} />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo — tap to reveal admin login */}
        <div className="text-center mb-8 animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
          <button onClick={() => setStep("admin")} className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 glow transition-transform active:scale-90" style={{ background: 'linear-gradient(135deg, #1b6fff, #0040cc)' }}>
            <Icon name="Shield" size={30} color="white" />
          </button>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Мобильный инспектор
          </h1>
          <p className="text-white/50 text-sm mt-1">Корпоративная платформа</p>
        </div>

        {/* Card */}
        <div className="glass-strong rounded-2xl p-6 animate-fade-up opacity-0 delay-150" style={{ animationFillMode: 'forwards' }}>

          {step === "welcome" && (
            <div className="space-y-4 animate-scale-in">
              <div className="text-center">
                <h2 className="text-xl font-bold text-white mb-1">Добро пожаловать</h2>
                <p className="text-white/50 text-sm">Войдите или создайте новый аккаунт</p>
              </div>
              <button
                className="btn-primary flex items-center justify-center gap-2"
                onClick={() => { setAuthError(""); setStep("phone"); }}
              >
                <Icon name="UserPlus" size={18} /> Зарегистрироваться
              </button>
              <button
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                onClick={() => { setAuthError(""); setStep("login"); }}
              >
                <Icon name="LogIn" size={18} /> У меня уже есть аккаунт
              </button>
            </div>
          )}

          {step === "login" && (
            <div className="space-y-5 animate-scale-in">
              <div>
                <button onClick={() => { setStep("welcome"); setAuthError(""); }} className="flex items-center gap-1 text-white/50 text-sm mb-3 hover:text-white/80 transition-colors">
                  <Icon name="ArrowLeft" size={16} /> Назад
                </button>
                <h2 className="text-xl font-bold text-white mb-1">Вход в аккаунт</h2>
                <p className="text-white/50 text-sm">Введите логин или телефон и пароль</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">Логин или телефон</label>
                <input className="input-field" value={loginId} onChange={e => { setLoginId(e.target.value); setAuthError(""); }} placeholder="Ваш логин" autoFocus />
              </div>
              <div>
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">Пароль</label>
                <input className="input-field" type="password" value={loginPassword} onChange={e => { setLoginPassword(e.target.value); setAuthError(""); }} placeholder="••••••" onKeyDown={e => e.key === "Enter" && handleExistingLogin()} />
              </div>
              {authError && <p className="text-xs text-red-400">{authError}</p>}
              <button className="btn-primary flex items-center justify-center gap-2" onClick={handleExistingLogin} disabled={!loginId.trim() || !loginPassword || loading}>
                {loading ? <><Icon name="Loader2" size={18} className="animate-spin" /> Вход...</> : <><Icon name="LogIn" size={18} /> Войти</>}
              </button>
              <button onClick={() => { setStep("phone"); setAuthError(""); }} className="btn-ghost w-full text-sm">Нет аккаунта? Зарегистрироваться</button>
            </div>
          )}

          {step === "credentials" && (
            <div className="space-y-5 animate-scale-in">
              <div>
                <div className="inline-flex items-center gap-2 tag mb-3"><Icon name="ShieldCheck" size={13} /> Номер подтверждён</div>
                <h2 className="text-xl font-bold text-white mb-1">Создайте логин и пароль</h2>
                <p className="text-white/50 text-sm">Эти данные понадобятся для входа</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">Имя</label>
                <input className="input-field" value={regName} onChange={e => setRegName(e.target.value)} placeholder="Иван Петров" autoFocus />
              </div>
              <div>
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">Логин</label>
                <input className="input-field" value={regLogin} onChange={e => { setRegLogin(e.target.value); setAuthError(""); }} placeholder="ivan_petrov" />
              </div>
              <div>
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">Пароль</label>
                <input className="input-field" type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="минимум 4 символа" onKeyDown={e => e.key === "Enter" && handleFinishRegister()} />
              </div>
              {authError && <p className="text-xs text-red-400">{authError}</p>}
              <button className="btn-primary flex items-center justify-center gap-2" onClick={handleFinishRegister} disabled={!canFinishReg || loading}>
                {loading ? <><Icon name="Loader2" size={18} className="animate-spin" /> Создаём аккаунт...</> : <><Icon name="UserCheck" size={18} /> Завершить регистрацию</>}
              </button>
            </div>
          )}

          {step === "admin" && (
            <div className="space-y-5 animate-scale-in">
              <div>
                <button onClick={() => setStep("phone")} className="flex items-center gap-1 text-white/50 text-sm mb-3 hover:text-white/80 transition-colors">
                  <Icon name="ArrowLeft" size={16} /> Обычный вход
                </button>
                <div className="flex items-center gap-2 mb-1">
                  <Icon name="ShieldCheck" size={20} color="#ef4444" />
                  <h2 className="text-xl font-bold text-white">Вход администратора</h2>
                </div>
                <p className="text-white/50 text-sm">Введите служебный номер для входа без кода</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">Номер администратора</label>
                <input
                  className="input-field"
                  type="tel"
                  placeholder="+7 (___) ___-__-__"
                  value={formatPhone(phone)}
                  onChange={handlePhoneInput}
                  onKeyDown={e => e.key === "Enter" && handleAdminLogin()}
                  autoFocus
                />
              </div>
              <button
                className="btn-primary flex items-center justify-center gap-2"
                onClick={handleAdminLogin}
                disabled={phone !== ADMIN_PHONE_DIGITS}
                style={{ background: phone === ADMIN_PHONE_DIGITS ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : undefined }}
              >
                <Icon name="LogIn" size={18} />Войти как админ
              </button>
            </div>
          )}

          {step === "phone" && (
            <div className="space-y-5">
              <div>
                <button onClick={() => setStep("welcome")} className="flex items-center gap-1 text-white/50 text-sm mb-3 hover:text-white/80 transition-colors">
                  <Icon name="ArrowLeft" size={16} /> Назад
                </button>
                <h2 className="text-xl font-bold text-white mb-1">Регистрация</h2>
                <p className="text-white/50 text-sm">Введите номер телефона — вышлем SMS-код</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">Номер телефона</label>
                <input
                  className="input-field"
                  type="tel"
                  placeholder="+7 (___) ___-__-__"
                  value={formatPhone(phone)}
                  onChange={handlePhoneInput}
                  onKeyDown={e => e.key === "Enter" && handleSendCode()}
                />
              </div>
              <button
                className="btn-primary flex items-center justify-center gap-2"
                onClick={handleSendCode}
                disabled={phone.length < 11 || loading}
              >
                {loading ? (
                  <><Icon name="Loader2" size={18} className="animate-spin" /> Отправка...</>
                ) : (
                  <><Icon name="Send" size={18} /> Получить код</>
                )}
              </button>
              <p className="text-center text-white/30 text-xs">
                Нажимая «Получить код», вы соглашаетесь на обработку данных
              </p>
            </div>
          )}

          {step === "otp" && (
            <div className="space-y-5 animate-scale-in">
              <div>
                <button onClick={() => setStep("phone")} className="flex items-center gap-1 text-white/50 text-sm mb-3 hover:text-white/80 transition-colors">
                  <Icon name="ArrowLeft" size={16} /> Изменить номер
                </button>
                <h2 className="text-xl font-bold text-white mb-1">Введите код</h2>
                <p className="text-white/50 text-sm">Код отправлен на <span className="text-white font-medium">{formatPhone(phone)}</span></p>
                <p className="text-xs text-blue-400 mt-1">Для демо: введите любой 4-значный код</p>
              </div>
              <div className="flex gap-3 justify-center">
                {otp.map((val, i) => (
                  <input
                    key={i}
                    ref={otpRefs[i]}
                    className={`otp-input ${val ? "filled" : ""}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={val}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                  />
                ))}
              </div>
              {loading && (
                <div className="flex items-center justify-center gap-2 text-white/50 text-sm">
                  <Icon name="Loader2" size={16} className="animate-spin" /> Проверяем...
                </div>
              )}
              <button className="btn-ghost w-full text-sm text-center flex items-center justify-center gap-2">
                <Icon name="RefreshCw" size={15} /> Отправить повторно через 59 сек
              </button>
            </div>
          )}

          {step === "consent" && (
            <div className="space-y-5 animate-scale-in">
              <div>
                <div className="inline-flex items-center gap-2 tag mb-3">
                  <Icon name="Sparkles" size={13} /> Почти готово!
                </div>
                <h2 className="text-xl font-bold text-white mb-1">Ознакомьтесь с документами</h2>
                <p className="text-white/50 text-sm">Для завершения регистрации примите условия</p>
              </div>
              <div className="space-y-3">
                {LEGAL_DOCS.map(doc => (
                  <div key={doc.id} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <button
                      onClick={() => setConsents(prev => ({ ...prev, [doc.id]: !prev[doc.id as keyof typeof prev] }))}
                      className={`w-5 h-5 rounded-md flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                        consents[doc.id as keyof typeof consents]
                          ? "bg-blue-600 border-blue-600 glow-sm"
                          : "border border-white/30 bg-transparent"
                      }`}
                    >
                      {consents[doc.id as keyof typeof consents] && <Icon name="Check" size={12} color="white" />}
                    </button>
                    <div className="flex-1 text-sm">
                      <span className="text-white/70">Я принимаю </span>
                      <button
                        className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
                        onClick={() => setOpenDoc(doc.id)}
                      >
                        {doc.label}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                className="btn-primary flex items-center justify-center gap-2"
                onClick={handleAcceptConsents}
                disabled={!allConsents || loading}
              >
                <Icon name="ArrowRight" size={18} /> Продолжить
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}