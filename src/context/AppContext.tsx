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
  role: "content_maker" | "editor" | "documentor";
  date: string;
  status: "pending" | "approved" | "rejected";
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
    { id: 1, userId: 5, userName: "Сергей Смирнов", role: "content_maker", date: "02.06.2026", status: "pending" },
  ]);
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

  const addRoleRequest = (role: "content_maker" | "editor" | "documentor") => {
    setRoleRequests(prev => [...prev, { id: Date.now(), userId: currentUser.id, userName: currentUser.name, role, date: new Date().toLocaleDateString("ru-RU"), status: "pending" }]);
  };

  const resolveRoleRequest = (id: number, approve: boolean) => {
    setRoleRequests(prev => prev.map(r => {
      if (r.id !== id) return r;
      if (approve) grantRole(r.userId, r.role);
      return { ...r, status: approve ? "approved" : "rejected" };
    }));
  };

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
