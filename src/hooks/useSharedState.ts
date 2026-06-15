import { useState, useEffect, useRef } from "react";
import func2url from "../../backend/func2url.json";

const API = (func2url as Record<string, string>)["app-state"];
const POLL_INTERVAL = 10_000; // 10 секунд

// Глобальный кэш — общий для всех компонентов с одним ключом
const memCache: Record<string, unknown> = {};

// Подписчики: key → список setState-функций
const subscribers: Record<string, Set<(v: unknown) => void>> = {};

// Debounce-таймеры для записи
const writeTimers: Record<string, ReturnType<typeof setTimeout>> = {};

// Polling-таймеры: один таймер на ключ для всего приложения
const pollTimers: Record<string, ReturnType<typeof setInterval>> = {};
const pollRefCount: Record<string, number> = {};

function lsGet(key: string): unknown {
  try { const r = localStorage.getItem("ss_" + key); return r ? JSON.parse(r) : null; } catch { return null; }
}
function lsSet(key: string, v: unknown) {
  try { localStorage.setItem("ss_" + key, JSON.stringify(v)); } catch { /* ignore */ }
}

async function fetchRemote(key: string): Promise<unknown> {
  try {
    const res = await fetch(`${API}?key=${encodeURIComponent(key)}`);
    const d = await res.json();
    return d.value ?? null;
  } catch { return null; }
}

function notifySubscribers(key: string, value: unknown) {
  subscribers[key]?.forEach(fn => fn(value));
}

function startPolling(key: string) {
  pollRefCount[key] = (pollRefCount[key] || 0) + 1;
  if (pollTimers[key]) return; // уже запущен
  pollTimers[key] = setInterval(async () => {
    const remote = await fetchRemote(key);
    if (remote === null) return;
    const current = JSON.stringify(memCache[key]);
    const incoming = JSON.stringify(remote);
    if (current !== incoming) {
      memCache[key] = remote;
      lsSet(key, remote);
      notifySubscribers(key, remote);
    }
  }, POLL_INTERVAL);
}

function stopPolling(key: string) {
  pollRefCount[key] = Math.max(0, (pollRefCount[key] || 1) - 1);
  if (pollRefCount[key] === 0 && pollTimers[key]) {
    clearInterval(pollTimers[key]);
    delete pollTimers[key];
  }
}

function saveRemote(key: string, value: unknown) {
  if (writeTimers[key]) clearTimeout(writeTimers[key]);
  writeTimers[key] = setTimeout(() => {
    lsSet(key, value);
    fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    }).catch(() => {/* тихо */});
  }, 600);
}

/**
 * useSharedState — данные одинаковы на всех устройствах.
 * • Мгновенный старт из localStorage/памяти
 * • Загрузка с сервера при маунте
 * • Polling каждые 10с — видим изменения других без перезагрузки
 * • Сохранение на сервер при изменении (debounce 600ms)
 */
export function useSharedState<T>(
  key: string,
  initial: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const getInitial = (): T => {
    if (memCache[key] !== undefined) return memCache[key] as T;
    const ls = lsGet(key);
    if (ls !== null) { memCache[key] = ls; return ls as T; }
    return initial;
  };

  const [value, setValueRaw] = useState<T>(getInitial);
  const initialized = useRef(false);
  const savedRef = useRef(value);

  // Подписываемся на обновления от polling
  useEffect(() => {
    if (!subscribers[key]) subscribers[key] = new Set();
    const handler = (v: unknown) => {
      setValueRaw(v as T);
      savedRef.current = v as T;
    };
    subscribers[key].add(handler);
    return () => { subscribers[key].delete(handler); };
  }, [key]);

  // Загрузка с сервера + запуск polling
  useEffect(() => {
    startPolling(key);

    // Первичная загрузка
    fetchRemote(key).then(remote => {
      if (remote !== null && remote !== undefined) {
        const incoming = JSON.stringify(remote);
        const current = JSON.stringify(memCache[key]);
        if (incoming !== current) {
          memCache[key] = remote;
          lsSet(key, remote);
          setValueRaw(remote as T);
          savedRef.current = remote as T;
        }
      }
    });

    return () => { stopPolling(key); };
     
  }, [key]);

  // Сохранение при изменении (пропускаем первый рендер)
  useEffect(() => {
    if (!initialized.current) { initialized.current = true; return; }
    const next = JSON.stringify(value);
    if (next === JSON.stringify(savedRef.current)) return;
    savedRef.current = value;
    memCache[key] = value;
    saveRemote(key, value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const setValue: React.Dispatch<React.SetStateAction<T>> = (action) => {
    setValueRaw(prev => {
      const next = typeof action === "function" ? (action as (p: T) => T)(prev) : action;
      return next;
    });
  };

  return [value, setValue];
}
