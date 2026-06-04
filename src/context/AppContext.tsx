import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export type UserRole = "user" | "admin" | "content_maker" | "editor" | "documentor" | "guest";
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
  role: "content_maker" | "editor" | "documentor";
  date: string;
  status: "pending" | "approved" | "rejected";
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
  addRoleRequest: (role: "content_maker" | "editor" | "documentor") => void;
  resolveRoleRequest: (id: number, approve: boolean) => void;

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
  checklists: ["Промышленная безопасность", "Охрана труда", "Пожарная безопасность", "Экологическая безопасность", "Иное"],
  learning: ["IT", "Маркетинг", "Дизайн", "Безопасность", "Менеджмент"],
};

const INITIAL_USERS: AppUser[] = [
  { id: 1, phone: "79991112233", name: "Иван Петров", email: "ivan@mail.ru", location: "Москва", avatar: "ИП", roles: ["user"], blocked: false, bannedFromForum: false, subscribers: [2, 3], subscriptions: [4], bio: "", createdAt: "01.01.2026" },
  { id: 2, phone: "79992223344", name: "Анна Козлова", email: "anna@mail.ru", location: "Санкт-Петербург", avatar: "АК", roles: ["content_maker"], blocked: false, bannedFromForum: false, subscribers: [1, 4], subscriptions: [1], bio: "Эксперт по охране труда. Делюсь обучающими видео.", createdAt: "15.01.2026" },
  { id: 3, phone: "79993334455", name: "Пётр Волков", email: "petr@mail.ru", location: "Казань", avatar: "ПВ", roles: ["content_maker", "editor"], blocked: false, bannedFromForum: false, subscribers: [1], subscriptions: [2], bio: "Инженер по пожарной безопасности.", createdAt: "20.01.2026" },
  { id: 4, phone: "79994445566", name: "Мария Иванова", email: "maria@mail.ru", location: "Екатеринбург", avatar: "МИ", roles: ["editor", "documentor"], blocked: false, bannedFromForum: false, subscribers: [1, 2], subscriptions: [1, 2, 3], bio: "Редактор новостной ленты.", createdAt: "10.01.2026" },
  { id: 5, phone: "79995556677", name: "Сергей Смирнов", email: "sergey@mail.ru", location: "Новосибирск", avatar: "СС", roles: ["user"], blocked: true, bannedFromForum: true, subscribers: [], subscriptions: [], bio: "", createdAt: "05.02.2026" },
];

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children, initialUser }: { children: ReactNode; initialUser: AppUser }) {
  const [users, setUsers] = useState<AppUser[]>(() => {
    const exists = INITIAL_USERS.find(u => u.phone === initialUser.phone);
    return exists ? INITIAL_USERS.map(u => u.phone === initialUser.phone ? initialUser : u) : [...INITIAL_USERS, initialUser];
  });
  const [currentUser, setCurrentUserState] = useState<AppUser>(initialUser);
  const [roleRequests, setRoleRequests] = useState<RoleRequest[]>([
    { id: 1, userId: 5, userName: "Сергей Смирнов", phone: "79995556677", role: "content_maker", date: "02.06.2026", status: "pending" },
  ]);
  const [roleGrants, setRoleGrants] = useState<RoleGrant[]>([
    { userId: 2, role: "content_maker", validUntil: "15.07.2026", grantedAt: "15.06.2026" },
    { userId: 3, role: "content_maker", validUntil: "20.07.2026", grantedAt: "20.06.2026" },
    { userId: 3, role: "editor", validUntil: "20.07.2026", grantedAt: "20.06.2026" },
    { userId: 4, role: "editor", validUntil: "10.07.2026", grantedAt: "10.06.2026" },
    { userId: 4, role: "documentor", validUntil: "10.07.2026", grantedAt: "10.06.2026" },
  ]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [paymentServices, setPaymentServices] = useState<PaymentService[]>([
    { id: 1, name: "Роль «Контентмейкер» (месяц)", requisites: "ООО «Мобильный Инспектор»\nР/с: 40702810000000012345\nБИК: 044525225\nИНН: 7700000000", qrUrl: "", instruction: "Оплатите по реквизитам или QR-коду. В назначении укажите номер телефона и название роли. Доступ активируется в течение 1 часа.", price: 990, enabled: true },
    { id: 2, name: "Роль «Редактор» (месяц)", requisites: "ООО «Мобильный Инспектор»\nР/с: 40702810000000012345\nБИК: 044525225", qrUrl: "", instruction: "Оплатите по реквизитам. В назначении укажите телефон.", price: 790, enabled: true },
    { id: 3, name: "Роль «Документовед» (месяц)", requisites: "ООО «Мобильный Инспектор»\nР/с: 40702810000000012345\nБИК: 044525225", qrUrl: "", instruction: "Оплатите по реквизитам. В назначении укажите телефон.", price: 1290, enabled: false },
  ]);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([
    { id: 1, userId: 1, userName: "Иван Петров", phone: "79991112233", subject: "Не приходит SMS-код", text: "Здравствуйте! Не могу войти — код подтверждения не приходит на телефон. Что делать?", date: "03.06.2026 10:14", status: "new", replies: [] },
    { id: 2, userId: 2, userName: "Анна Козлова", phone: "79992223344", subject: "Вопрос по загрузке видео", text: "Какой максимальный размер файла для загрузки видео?", date: "02.06.2026 16:40", status: "answered", replies: [{ from: "admin", text: "Здравствуйте! Максимальный размер — 2 ГБ.", date: "02.06.2026 17:02" }] },
  ]);
  const [blockedContent, setBlockedContent] = useState<BlockedContentRef[]>([]);
  const [myStats, setMyStats] = useState<AppStats>({ videos: 0, news: 0, documents: 12, courses: 2, tickets: 3, checklists: 5 });
  const [categories, setCategories] = useState<Record<string, string[]>>(DEFAULT_CATEGORIES);
  const [theme, setThemeState] = useState<ThemeMode>("dark");
  const [lang, setLang] = useState<Lang>("ru");

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

  const addRoleRequest = (role: "content_maker" | "editor" | "documentor") => {
    setRoleRequests(prev => [...prev, { id: Date.now(), userId: currentUser.id, userName: currentUser.name, phone: currentUser.phone, role, date: new Date().toLocaleDateString("ru-RU"), status: "pending" }]);
  };

  const resolveRoleRequest = (id: number, approve: boolean) => {
    setRoleRequests(prev => prev.map(r => {
      if (r.id !== id) return r;
      if (approve) {
        grantRole(r.userId, r.role);
        const validUntil = new Date(Date.now() + 30 * 24 * 3600 * 1000).toLocaleDateString("ru-RU");
        setRoleGrants(g => [...g.filter(x => !(x.userId === r.userId && x.role === r.role)), { userId: r.userId, role: r.role, validUntil, grantedAt: new Date().toLocaleDateString("ru-RU") }]);
        addNotification(r.userId, `Вам выдана роль. Доступ активен до ${validUntil}.`, "role");
      }
      return { ...r, status: approve ? "approved" : "rejected" };
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
    roleRequests, addRoleRequest, resolveRoleRequest,
    roleGrants,
    notifications,
    myNotifications: notifications.filter(n => n.userId === currentUser.id),
    addNotification, markNotificationsRead,
    paymentServices, addPaymentService, updatePaymentService, removePaymentService,
    supportMessages, addSupportMessage, replySupportMessage,
    blockedContent, isContentBlocked, blockContent, unblockContent,
    myStats, bumpStat,
    categories, addCategory, removeCategory,
    theme, setTheme, lang, setLang,
    activeUsers: users.filter(u => !u.blocked).length,
    totalVisits: 3847,
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