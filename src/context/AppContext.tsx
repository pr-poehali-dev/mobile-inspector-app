import { createContext, useContext, useState, useRef, ReactNode, useEffect } from "react";
import { useSharedState } from "@/hooks/useSharedState";

export type UserRole = "user" | "admin" | "content_maker" | "editor" | "documentor" | "executor" | "school" | "guest";
export type ThemeMode = "dark" | "light" | "brand";
export type Lang = "ru" | "en";

export interface AppUser {
  id: number;
  phone: string;
  name: string;
  email: string;
  location: string;
  avatar: string; // initials or data-url
  avatarUrl?: string;
  roles: UserRole[];
  blocked: boolean;
  bannedFromForum: boolean;
  subscribers: number[]; // ids who follow this user
  subscriptions: number[]; // ids this user follows
  bio?: string;
  createdAt: string;
}

export interface RoleRequest {
  id: number;
  userId: number;
  userName: string;
  phone: string;
  role: "content_maker" | "editor" | "documentor" | "executor" | "school";
  date: string;
  status: "pending" | "approved" | "rejected";
  requiresPayment?: boolean;
  paid?: boolean;
}

export interface RoleGrant {
  userId: number;
  role: UserRole;
  validUntil: string; // дата следующей оплаты
  grantedAt: string;
}

export interface AppNotification {
  id: number;
  userId: number;
  text: string;
  date: string;
  read: boolean;
  type: "block" | "info" | "role";
}

export interface PaymentService {
  id: number;
  name: string;
  requisites: string;
  qrUrl?: string;
  instruction: string;
  price: number;
  enabled: boolean;
}

export interface SupportMessage {
  id: number;
  userId: number;
  userName: string;
  phone: string;
  subject: string;
  text: string;
  date: string;
  status: "new" | "answered";
  replies: { from: "user" | "admin"; text: string; date: string }[];
}

export type ContentKind = "video" | "document" | "news" | "rfp" | "comment" | "photo";

export interface BlockedContentRef {
  kind: ContentKind;
  id: number | string;
}

export interface AppStats {
  videos: number;
  news: number;
  documents: number;
  courses: number;
  tickets: number;
  checklists: number;
}

interface AppContextType {
  // current user
  currentUser: AppUser;
  setCurrentUser: (u: AppUser) => void;
  updateCurrentUser: (patch: Partial<AppUser>) => void;

  // all users
  users: AppUser[];
  setUsers: (u: AppUser[]) => void;
  toggleBlock: (id: number) => void;
  toggleForumBan: (id: number) => void;
  grantRole: (id: number, role: UserRole) => void;
  revokeRole: (id: number, role: UserRole) => void;
  toggleSubscription: (targetId: number) => void;

  // role requests
  roleRequests: RoleRequest[];
  addRoleRequest: (role: "content_maker" | "editor" | "documentor" | "executor" | "school", phone?: string, requiresPayment?: boolean) => void;
  resolveRoleRequest: (id: number, approve: boolean) => void;
  payForRole: (requestId: number) => void;

  // role grants (with expiry)
  roleGrants: RoleGrant[];

  // notifications
  notifications: AppNotification[];
  myNotifications: AppNotification[];
  addNotification: (userId: number, text: string, type?: AppNotification["type"]) => void;
  markNotificationsRead: () => void;

  // payment services (admin-managed requisites)
  paymentServices: PaymentService[];
  addPaymentService: (s: Omit<PaymentService, "id">) => void;
  updatePaymentService: (id: number, patch: Partial<PaymentService>) => void;
  removePaymentService: (id: number) => void;

  // support / обращения
  supportMessages: SupportMessage[];
  addSupportMessage: (subject: string, text: string) => void;
  replySupportMessage: (id: number, text: string) => void;

  // content moderation
  blockedContent: BlockedContentRef[];
  isContentBlocked: (kind: ContentKind, id: number | string) => boolean;
  blockContent: (kind: ContentKind, id: number | string, authorId?: number) => void;
  unblockContent: (kind: ContentKind, id: number | string) => void;

  // purchased documents (доступны навсегда)
  purchasedDocs: number[];
  purchaseDoc: (docId: number) => void;
  isDocPurchased: (docId: number) => boolean;

  // per-user content counters (live)
  myStats: AppStats;
  bumpStat: (key: keyof AppStats, delta?: number) => void;

  // categories per section (admin-managed)
  categories: Record<string, string[]>;
  addCategory: (section: string, name: string) => void;
  removeCategory: (section: string, name: string) => void;

  // theme & language
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  lang: Lang;
  setLang: (l: Lang) => void;

  // global activity stats (for admin)
  activeUsers: number;
  totalVisits: number;

  isAdmin: boolean;
  hasRole: (r: UserRole) => boolean;
}

const ADMIN_PHONE = "79682619505";

const DEFAULT_CATEGORIES: Record<string, string[]> = {
  video: ["Промышленная безопасность", "Охрана труда", "Пожарная безопасность", "Экологическая безопасность", "Информационная безопасность", "Транспортная безопасность", "Иное"],
  news: ["Промышленная безопасность", "Охрана труда", "Пожарная безопасность", "Информационная безопасность", "Налоговое законодательство", "Иное"],
  documents: ["Договоры", "Акты", "Приказы", "Инструкции", "Отчёты"],
  doc_types: ["Входящий", "Исходящий", "Внутренний", "Архивный", "Нормативный"],
  checklists: ["Промышленная безопасность", "Охрана труда", "Пожарная безопасность", "Экологическая безопасность", "Иное"],
  learning: ["IT", "Маркетинг", "Дизайн", "Безопасность", "Менеджмент"],
};

// Начальный список пользователей — пустой (реальные пользователи добавляются при регистрации)

const AppContext = createContext<AppContextType | null>(null);

// ── Персистентность: сохраняем состояние приложения в localStorage ──
// Ключи версионированы, чтобы при изменении структуры можно было сбросить кэш.
const LS_PREFIX = "mi_app_v1_";
function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (raw != null) return JSON.parse(raw) as T;
  } catch { /* ignore */ }
  return fallback;
}
function saveStored<T>(key: string, value: T) {
  try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(value)); } catch { /* ignore quota */ }
}
/** useState с автосохранением в localStorage (сигнатура как у useState). */
function useStored<T>(key: string, initial: T | (() => T)): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const fallback = typeof initial === "function" ? (initial as () => T)() : initial;
    return loadStored(key, fallback);
  });
  useEffect(() => { saveStored(key, value); }, [key, value]);
  return [value, setValue];
}

export function AppProvider({ children, initialUser }: { children: ReactNode; initialUser: AppUser }) {
  // ── ОБЩИЕ данные (одинаковы на всех устройствах, хранятся в БД) ────────────
  const [users, setUsers] = useSharedState<AppUser[]>("users", [initialUser]);
  const [roleRequests, setRoleRequests] = useSharedState<RoleRequest[]>("roleRequests", []);
  const [roleGrants, setRoleGrants] = useSharedState<RoleGrant[]>("roleGrants", []);
  const [notifications, setNotifications] = useSharedState<AppNotification[]>("notifications", []);
  const [paymentServices, setPaymentServices] = useSharedState<PaymentService[]>("paymentServices", []);
  const [supportMessages, setSupportMessages] = useSharedState<SupportMessage[]>("supportMessages", []);
  const [blockedContent, setBlockedContent] = useSharedState<BlockedContentRef[]>("blockedContent", []);
  const [categoriesRaw, setCategoriesRaw] = useSharedState<Record<string, string[]>>("categories", DEFAULT_CATEGORIES);
  // Если в БД пустой объект {} — используем DEFAULT (первый запуск)
  const categories = Object.keys(categoriesRaw).length > 0 ? categoriesRaw : DEFAULT_CATEGORIES;
  const setCategories = (v: Record<string, string[]> | ((p: Record<string, string[]>) => Record<string, string[]>)) => setCategoriesRaw(v as Record<string, string[]>);
  const [totalVisits, setTotalVisits] = useSharedState<number>("totalVisits", 0);

  // ── ЛОКАЛЬНЫЕ данные (у каждого пользователя свои) ───────────────────────
  const [purchasedDocs, setPurchasedDocs] = useStored<number[]>(`purchasedDocs_${initialUser.id}`, []);
  const [myStats, setMyStats] = useStored<AppStats>(`myStats_${initialUser.id}`, { videos: 0, news: 0, documents: 0, courses: 0, tickets: 0, checklists: 0 });
  const [theme, setThemeState] = useStored<ThemeMode>(`theme_${initialUser.id}`, "dark");
  const [lang, setLang] = useStored<Lang>(`lang_${initialUser.id}`, "ru");

  // currentUser — берём из общего списка пользователей (по телефону)
  const [currentUser, setCurrentUserState] = useState<AppUser>(initialUser);
  const userRegistered = useRef(false);

  useEffect(() => {
    const found = users.find(u => u.phone === initialUser.phone);
    if (found) {
      setCurrentUserState(found);
      userRegistered.current = true;
    } else if (!userRegistered.current) {
      // Пользователя ещё нет в списке — добавляем независимо от длины массива
      userRegistered.current = true;
      const newId = users.length > 0
        ? Math.max(...users.map(u => u.id)) + 1
        : initialUser.id;
      const created = { ...initialUser, id: newId };
      setCurrentUserState(created);
      setUsers(prev => {
        // Проверяем ещё раз (race condition)
        if (prev.find(u => u.phone === initialUser.phone)) return prev;
        return [...prev, created];
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users]);

  // Счётчик посещений — один раз за сессию
  useEffect(() => {
    setTotalVisits(v => (v as number) + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setCurrentUser = (u: AppUser) => {
    setCurrentUserState(u);
    setUsers(prev => prev.map(x => x.id === u.id ? u : x));
  };

  const updateCurrentUser = (patch: Partial<AppUser>) => {
    setCurrentUserState(prev => {
      const next = { ...prev, ...patch };
      setUsers(us => us.map(x => x.id === next.id ? next : x));
      return next;
    });
  };

  const toggleBlock = (id: number) => setUsers(prev => prev.map(u => u.id === id ? { ...u, blocked: !u.blocked } : u));
  const toggleForumBan = (id: number) => setUsers(prev => prev.map(u => u.id === id ? { ...u, bannedFromForum: !u.bannedFromForum } : u));

  const grantRole = (id: number, role: UserRole) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, roles: u.roles.includes(role) ? u.roles : [...u.roles.filter(r => r !== "user"), role] } : u));
    if (id === currentUser.id) setCurrentUserState(prev => ({ ...prev, roles: prev.roles.includes(role) ? prev.roles : [...prev.roles.filter(r => r !== "user"), role] }));
  };
  const revokeRole = (id: number, role: UserRole) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, roles: u.roles.filter(r => r !== role).length ? u.roles.filter(r => r !== role) : ["user"] } : u));
    if (id === currentUser.id) setCurrentUserState(prev => ({ ...prev, roles: prev.roles.filter(r => r !== role).length ? prev.roles.filter(r => r !== role) : ["user"] }));
  };

  const toggleSubscription = (targetId: number) => {
    setCurrentUserState(prev => {
      const isSub = prev.subscriptions.includes(targetId);
      const nextSubs = isSub ? prev.subscriptions.filter(s => s !== targetId) : [...prev.subscriptions, targetId];
      const next = { ...prev, subscriptions: nextSubs };
      setUsers(us => us.map(u => {
        if (u.id === next.id) return next;
        if (u.id === targetId) {
          const subscribers = isSub ? u.subscribers.filter(s => s !== prev.id) : [...new Set([...u.subscribers, prev.id])];
          return { ...u, subscribers };
        }
        return u;
      }));
      return next;
    });
  };

  const addNotification = (userId: number, text: string, type: AppNotification["type"] = "info") => {
    setNotifications(prev => [{ id: Date.now() + Math.random(), userId, text, date: new Date().toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }), read: false, type }, ...prev]);
  };

  const addRoleRequest = (role: "content_maker" | "editor" | "documentor" | "executor" | "school", phone?: string, requiresPayment?: boolean) => {
    setRoleRequests(prev => [...prev, { id: Date.now(), userId: currentUser.id, userName: currentUser.name, phone: phone || currentUser.phone, role, date: new Date().toLocaleDateString("ru-RU"), status: "pending", requiresPayment: !!requiresPayment, paid: false }]);
  };

  const resolveRoleRequest = (id: number, approve: boolean) => {
    setRoleRequests(prev => prev.map(r => {
      if (r.id !== id) return r;
      if (approve) {
        // Если роль платная — не выдаём сразу, ждём оплату пользователем
        if (r.requiresPayment) {
          addNotification(r.userId, "Ваша заявка одобрена. Для активации роли необходимо произвести оплату.", "role");
          return { ...r, status: "approved" as const };
        }
        grantRole(r.userId, r.role);
        const validUntil = new Date(Date.now() + 30 * 24 * 3600 * 1000).toLocaleDateString("ru-RU");
        setRoleGrants(g => [...g.filter(x => !(x.userId === r.userId && x.role === r.role)), { userId: r.userId, role: r.role, validUntil, grantedAt: new Date().toLocaleDateString("ru-RU") }]);
        addNotification(r.userId, `Вам выдана роль. Доступ активен до ${validUntil}.`, "role");
      }
      return { ...r, status: approve ? "approved" : "rejected" };
    }));
  };

  const payForRole = (requestId: number) => {
    setRoleRequests(prev => prev.map(r => {
      if (r.id !== requestId) return r;
      grantRole(r.userId, r.role);
      const validUntil = new Date(Date.now() + 365 * 24 * 3600 * 1000).toLocaleDateString("ru-RU");
      setRoleGrants(g => [...g.filter(x => !(x.userId === r.userId && x.role === r.role)), { userId: r.userId, role: r.role, validUntil, grantedAt: new Date().toLocaleDateString("ru-RU") }]);
      addNotification(r.userId, `Оплата принята. Роль активна до ${validUntil}.`, "role");
      return { ...r, paid: true };
    }));
  };

  const markNotificationsRead = () => setNotifications(prev => prev.map(n => n.userId === currentUser.id ? { ...n, read: true } : n));

  const addPaymentService = (s: Omit<PaymentService, "id">) => setPaymentServices(prev => [...prev, { ...s, id: Date.now() }]);
  const updatePaymentService = (id: number, patch: Partial<PaymentService>) => setPaymentServices(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  const removePaymentService = (id: number) => setPaymentServices(prev => prev.filter(s => s.id !== id));

  const addSupportMessage = (subject: string, text: string) => {
    setSupportMessages(prev => [{ id: Date.now(), userId: currentUser.id, userName: currentUser.name, phone: currentUser.phone, subject, text, date: new Date().toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }), status: "new", replies: [] }, ...prev]);
  };
  const replySupportMessage = (id: number, text: string) => {
    setSupportMessages(prev => prev.map(m => {
      if (m.id !== id) return m;
      addNotification(m.userId, `Ответ от поддержки по обращению «${m.subject}»: ${text}`, "info");
      return { ...m, status: "answered", replies: [...m.replies, { from: "admin", text, date: new Date().toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) }] };
    }));
  };

  const isContentBlocked = (kind: ContentKind, id: number | string) => blockedContent.some(b => b.kind === kind && String(b.id) === String(id));
  const blockContent = (kind: ContentKind, id: number | string, authorId?: number) => {
    setBlockedContent(prev => prev.some(b => b.kind === kind && String(b.id) === String(id)) ? prev : [...prev, { kind, id }]);
    if (authorId) addNotification(authorId, "Ваш контент заблокирован администрацией за нарушение правил платформы.", "block");
  };
  const unblockContent = (kind: ContentKind, id: number | string) => setBlockedContent(prev => prev.filter(b => !(b.kind === kind && String(b.id) === String(id))));

  const purchaseDoc = (docId: number) => setPurchasedDocs(prev => prev.includes(docId) ? prev : [...prev, docId]);
  const isDocPurchased = (docId: number) => purchasedDocs.includes(docId);

  const bumpStat = (key: keyof AppStats, delta = 1) => setMyStats(prev => ({ ...prev, [key]: Math.max(0, prev[key] + delta) }));

  const addCategory = (section: string, name: string) => {
    setCategories(prev => ({ ...prev, [section]: [...new Set([...(prev[section] || []), name])] }));
  };
  const removeCategory = (section: string, name: string) => {
    setCategories(prev => ({ ...prev, [section]: (prev[section] || []).filter(c => c !== name) }));
  };

  const setTheme = (t: ThemeMode) => {
    setThemeState(t);
    const root = document.documentElement;
    root.setAttribute("data-theme", t);
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const isAdmin = currentUser.roles.includes("admin") || currentUser.phone === ADMIN_PHONE;
  const hasRole = (r: UserRole) => currentUser.roles.includes(r) || isAdmin;

  const value: AppContextType = {
    currentUser, setCurrentUser, updateCurrentUser,
    users, setUsers, toggleBlock, toggleForumBan, grantRole, revokeRole, toggleSubscription,
    roleRequests, addRoleRequest, resolveRoleRequest, payForRole,
    roleGrants,
    notifications,
    myNotifications: notifications.filter(n => n.userId === currentUser.id),
    addNotification, markNotificationsRead,
    paymentServices, addPaymentService, updatePaymentService, removePaymentService,
    supportMessages, addSupportMessage, replySupportMessage,
    blockedContent, isContentBlocked, blockContent, unblockContent,
    purchasedDocs, purchaseDoc, isDocPurchased,
    myStats, bumpStat,
    categories, addCategory, removeCategory,
    theme, setTheme, lang, setLang,
    activeUsers: users.filter(u => !u.blocked).length,
    totalVisits,
    isAdmin, hasRole,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export { ADMIN_PHONE };

// Simple i18n dictionary
export const I18N: Record<Lang, Record<string, string>> = {
  ru: {
    profile: "Профиль", settings: "Настройки", security: "Безопасность",
    notifications: "Уведомления", appearance: "Внешний вид", language: "Язык",
    logout: "Выйти из аккаунта", admin: "Админ-панель",
    videos: "Видео", news: "Новости", documents: "Документы", courses: "Курсы",
    tickets: "Тикеты", subscribers: "Подписчики", subscriptions: "Подписки",
  },
  en: {
    profile: "Profile", settings: "Settings", security: "Security",
    notifications: "Notifications", appearance: "Appearance", language: "Language",
    logout: "Sign out", admin: "Admin Panel",
    videos: "Videos", news: "News", documents: "Documents", courses: "Courses",
    tickets: "Tickets", subscribers: "Subscribers", subscriptions: "Following",
  },
};