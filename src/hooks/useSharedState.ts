import { useState, useEffect, useRef } from "react";
import func2url from "../../backend/func2url.json";

const API = (func2url as Record<string, string>)["app-state"];
const POLL_INTERVAL = 10_000;
const LS_VERSION = "v3"; // увеличить при сбросе кэша

// Очищаем старый кэш браузера при обновлении версии
(function clearOldCache() {
  const vk = "ss_cache_version";
  if (localStorage.getItem(vk) !== LS_VERSION) {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("ss_")) toRemove.push(k);
    }
    toRemove.forEach(k => localStorage.removeItem(k));
    localStorage.setItem(vk, LS_VERSION);
  }
})();

const memCache: Record<string, unknown> = {};
const subscribers: Record<string, Set<(v: unknown) => void>> = {};
const writeTimers: Record<string, ReturnType<typeof setTimeout>> = {};
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

function writeRemote(key: string, value: unknown) {
  fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  }).catch(() => {/* ignore */});
}

function notifySubscribers(key: string, value: unknown) {
  subscribers[key]?.forEach(fn => fn(value));
}

function startPolling(key: string) {
  pollRefCount[key] = (pollRefCount[key] || 0) + 1;
  if (pollTimers[key]) return;
  pollTimers[key] = setInterval(async () => {
    const remote = await fetchRemote(key);
    if (remote === null) return;
    if (JSON.stringify(memCache[key]) !== JSON.stringify(remote)) {
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
    writeRemote(key, value);
  }, 600);
}

/**
 * useSharedState — одинаковые данные на всех устройствах.
 * - Мгновенно берёт данные из localStorage/памяти
 * - При маунте загружает с сервера:
 *     • Если в БД есть → берём их (истина)
 *     • Если в БД пусто → пишем initial в БД (первый запуск)
 * - Polling 10с — подхватывает чужие изменения без перезагрузки
 * - При изменении → сохраняет на сервер (debounce 600ms)
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
  const savedRef = useRef<T>(value);

  useEffect(() => {
    if (!subscribers[key]) subscribers[key] = new Set();
    const handler = (v: unknown) => { setValueRaw(v as T); savedRef.current = v as T; };
    subscribers[key].add(handler);
    return () => { subscribers[key].delete(handler); };
  }, [key]);

  useEffect(() => {
    startPolling(key);

    fetchRemote(key).then(remote => {
      if (remote !== null && remote !== undefined) {
        // В БД есть данные — берём их (перезаписываем local)
        if (JSON.stringify(memCache[key]) !== JSON.stringify(remote)) {
          memCache[key] = remote;
          lsSet(key, remote);
          setValueRaw(remote as T);
          savedRef.current = remote as T;
        }
      } else {
        // В БД пусто — записываем начальные данные (первый запуск)
        const toSave = memCache[key] !== undefined ? (memCache[key] as T) : initial;
        memCache[key] = toSave;
        lsSet(key, toSave);
        writeRemote(key, toSave);
      }
    });

    return () => { stopPolling(key); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!initialized.current) { initialized.current = true; return; }
    if (JSON.stringify(value) === JSON.stringify(savedRef.current)) return;
    savedRef.current = value;
    memCache[key] = value;
    saveRemote(key, value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const setValue: React.Dispatch<React.SetStateAction<T>> = (action) => {
    setValueRaw(prev => typeof action === "function" ? (action as (p: T) => T)(prev) : action);
  };

  return [value, setValue];
}